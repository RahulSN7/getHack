// ---------------------------------------------------------------------------
// server/controllers/chatController.js — Chat Token & User Sync Controller
// Generates Stream Chat tokens, synchronizes users, and handles user blocking.
// ---------------------------------------------------------------------------

const User = require("../models/user");
const UserChatState = require("../models/userChatState");

const {
  getStreamClient,
  generateStreamToken,
  upsertStreamUser,
  upsertStreamUsers,
} = require("../services/streamService");

// ---------------------------------------------------------------------------
// GET /api/chat/token
// Get Stream Chat Token for Current User
// ---------------------------------------------------------------------------
const getStreamToken = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthenticated.",
      });
    }

    // Make sure the currently authenticated user exists in Stream.
    const streamUserId = await upsertStreamUser(req.user);

    if (!streamUserId) {
      throw new Error("Failed to create authenticated user in Stream Chat.");
    }

    // Generate a user-scoped token.
    const token = generateStreamToken(streamUserId);

    const apiKey = process.env.STREAM_API_KEY;

    if (!apiKey) {
      throw new Error("STREAM_API_KEY is missing.");
    }

    return res.status(200).json({
      success: true,
      token,
      apiKey,
      user: {
        id: streamUserId,
        name: req.user.name,
        image: req.user.profile?.avatar || "",
      },
    });
  } catch (error) {
    console.error("GET STREAM TOKEN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate chat token.",
    });
  }
};

// ---------------------------------------------------------------------------
// POST /api/chat/ensure-user
// ---------------------------------------------------------------------------
const ensureUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthenticated.",
      });
    }

    const { targetUserId } = req.body || {};

    if (
      !targetUserId ||
      typeof targetUserId !== "string" ||
      !targetUserId.match(/^[0-9a-fA-F]{24}$/)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid target user ID specified.",
      });
    }

    const currentUserIdStr = String(req.user._id || req.user.id);
    const targetUserIdStr = targetUserId.trim();

    if (currentUserIdStr === targetUserIdStr) {
      return res.status(400).json({
        success: false,
        message: "You cannot start a chat with yourself.",
      });
    }

    const targetUser = await User.findById(targetUserIdStr);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "Target user not found in database.",
      });
    }

    const Connection = require("../models/connection");
    const isConnected = await Connection.findOne({
      $or: [
        { sender: currentUserIdStr, receiver: targetUserIdStr },
        { sender: targetUserIdStr, receiver: currentUserIdStr },
      ],
      status: "accepted",
    });

    if (!isConnected) {
      return res.status(403).json({
        success: false,
        message: "Messaging is restricted to accepted connections only.",
      });
    }

    const upsertedIds = await upsertStreamUsers([req.user, targetUser]);

    return res.status(200).json({
      success: true,
      message: "Users synchronized with Stream Chat.",
      currentUser: {
        id: currentUserIdStr,
        name: req.user.name,
      },
      targetUser: {
        id: targetUserIdStr,
        name: targetUser.name,
        avatar: targetUser.profile?.avatar || "",
      },
    });
  } catch (error) {
    console.error("ENSURE STREAM USER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to synchronize target user with Stream Chat.",
    });
  }
};

// ---------------------------------------------------------------------------
// GET /api/chat/access/:userId — Check Chat Authorization & Block Status
// ---------------------------------------------------------------------------
const checkChatAccess = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthenticated." });
    }

    const targetUserId = req.params.userId;
    if (!targetUserId || typeof targetUserId !== "string") {
      return res.status(400).json({ success: false, message: "Invalid target user ID specified." });
    }

    const currentUserIdStr = String(req.user._id || req.user.id);
    const targetUserIdStr = targetUserId.trim();

    const Connection = require("../models/connection");
    const connection = await Connection.findOne({
      $or: [
        { sender: currentUserIdStr, receiver: targetUserIdStr },
        { sender: targetUserIdStr, receiver: currentUserIdStr },
      ],
      status: "accepted",
    });

    if (!connection) {
      return res.status(403).json({
        success: false,
        allowed: false,
        message: "Messaging is restricted to accepted connections only.",
      });
    }

    // Check Stream Chat block relationship
    const streamClient = getStreamClient();
    const currentUserBlocks = await streamClient.getBlockedUsers(currentUserIdStr);
    const isBlockedByMe = (currentUserBlocks.blocks || []).some(
      (b) => String(b.blocked_user_id || b.blocked_user?.id || b.target?.id) === targetUserIdStr
    );
    const targetUserBlocks = await streamClient.getBlockedUsers(targetUserIdStr);
    const isBlockedByOther = (targetUserBlocks.blocks || []).some(
      (b) => String(b.blocked_user_id || b.blocked_user?.id || b.target?.id) === currentUserIdStr
    );

    if (isBlockedByMe || isBlockedByOther) {
      return res.status(403).json({
        success: false,
        allowed: false,
        isBlocked: true,
        isBlockedByMe,
        isBlockedByOther,
        message: "Communication is blocked between these users.",
      });
    }

    return res.status(200).json({
      success: true,
      allowed: true,
      message: "Chat access granted.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to check chat access.",
    });
  }
};

// ---------------------------------------------------------------------------
// POST /api/chat/block/:userId — Block User Server-Side
// ---------------------------------------------------------------------------
const blockUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthenticated." });
    }

    const targetUserId = req.params.userId;
    if (!targetUserId || typeof targetUserId !== "string") {
      return res.status(400).json({ success: false, message: "Invalid target user ID." });
    }

    const currentUserIdStr = String(req.user._id || req.user.id);
    const targetUserIdStr = targetUserId.trim();

    const streamClient = getStreamClient();
    await streamClient.blockUser(targetUserIdStr, currentUserIdStr);

    return res.status(200).json({
      success: true,
      message: "User blocked successfully.",
    });
  } catch (error) {
    console.error("BLOCK USER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to block user.",
    });
  }
};

// ---------------------------------------------------------------------------
// POST /api/chat/unblock/:userId — Unblock User Server-Side
// ---------------------------------------------------------------------------
const unblockUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthenticated." });
    }

    const targetUserId = req.params.userId;
    if (!targetUserId || typeof targetUserId !== "string") {
      return res.status(400).json({ success: false, message: "Invalid target user ID." });
    }

    const currentUserIdStr = String(req.user._id || req.user.id);
    const targetUserIdStr = targetUserId.trim();

    const streamClient = getStreamClient();
    await streamClient.unBlockUser(targetUserIdStr, currentUserIdStr);

    return res.status(200).json({
      success: true,
      message: "User unblocked successfully.",
    });
  } catch (error) {
    console.error("UNBLOCK USER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to unblock user.",
    });
  }
};

// ---------------------------------------------------------------------------
// GET /api/chat/block-status/:userId — Get Block Status for Target User
// ---------------------------------------------------------------------------
const getBlockStatus = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthenticated." });
    }

    const targetUserId = req.params.userId;
    if (!targetUserId || typeof targetUserId !== "string") {
      return res.status(400).json({ success: false, message: "Invalid target user ID." });
    }

    const currentUserIdStr = String(req.user._id || req.user.id);
    const targetUserIdStr = targetUserId.trim();

    const streamClient = getStreamClient();

    const currentUserBlocks = await streamClient.getBlockedUsers(currentUserIdStr);
    const isBlockedByMe = (currentUserBlocks.blocks || []).some(
      (b) => String(b.blocked_user_id || b.blocked_user?.id || b.target?.id) === targetUserIdStr
    );

    const targetUserBlocks = await streamClient.getBlockedUsers(targetUserIdStr);
    const isBlockedByOther = (targetUserBlocks.blocks || []).some(
      (b) => String(b.blocked_user_id || b.blocked_user?.id || b.target?.id) === currentUserIdStr
    );

    return res.status(200).json({
      success: true,
      isBlockedByMe,
      isBlockedByOther,
      isBlocked: isBlockedByMe || isBlockedByOther,
    });
  } catch (error) {
    console.error("GET BLOCK STATUS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get block status.",
    });
  }
};

// ---------------------------------------------------------------------------
// GET /api/chat/states — Get all chat states (favourites & closed) for current user
// ---------------------------------------------------------------------------
const getChatStates = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthenticated." });
    }

    const userId = req.user._id || req.user.id;
    const states = await UserChatState.find({ user: userId });

    // Map by channelCid for easy lookup
    const statesMap = {};
    states.forEach((s) => {
      statesMap[s.channelCid] = {
        isFavourite: !!s.isFavourite,
        isClosed: !!s.isClosed,
        closedAt: s.closedAt || null,
        clearedAt: s.clearedAt || null,
      };
    });

    return res.status(200).json({
      success: true,
      states: statesMap,
    });
  } catch (error) {
    console.error("GET CHAT STATES ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve chat states.",
    });
  }
};

// ---------------------------------------------------------------------------
// POST /api/chat/favourite — Toggle or set favourite status for a channel
// ---------------------------------------------------------------------------
const toggleFavourite = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthenticated." });
    }

    const { channelCid, isFavourite, targetUserId } = req.body || {};
    if (!channelCid || typeof channelCid !== "string") {
      return res.status(400).json({ success: false, message: "Channel CID is required." });
    }

    const userId = req.user._id || req.user.id;
    const favBool = Boolean(isFavourite);

    const state = await UserChatState.findOneAndUpdate(
      { user: userId, channelCid: channelCid.trim() },
      {
        $set: {
          isFavourite: favBool,
          ...(targetUserId ? { targetUserId: String(targetUserId) } : {}),
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    return res.status(200).json({
      success: true,
      message: favBool ? "Added to favourites." : "Removed from favourites.",
      state: {
        channelCid: state.channelCid,
        isFavourite: state.isFavourite,
        isClosed: state.isClosed,
      },
    });
  } catch (error) {
    console.error("TOGGLE FAVOURITE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update favourite status.",
    });
  }
};

// ---------------------------------------------------------------------------
// POST /api/chat/close — Close (hide) a conversation for current user
// ---------------------------------------------------------------------------
const closeChat = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthenticated." });
    }

    const { channelCid, targetUserId } = req.body || {};
    if (!channelCid || typeof channelCid !== "string") {
      return res.status(400).json({ success: false, message: "Channel CID is required." });
    }

    const userId = req.user._id || req.user.id;

    const state = await UserChatState.findOneAndUpdate(
      { user: userId, channelCid: channelCid.trim() },
      {
        $set: {
          isClosed: true,
          closedAt: new Date(),
          ...(targetUserId ? { targetUserId: String(targetUserId) } : {}),
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    return res.status(200).json({
      success: true,
      message: "Chat closed.",
      state: {
        channelCid: state.channelCid,
        isFavourite: state.isFavourite,
        isClosed: state.isClosed,
      },
    });
  } catch (error) {
    console.error("CLOSE CHAT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to close chat.",
    });
  }
};

// ---------------------------------------------------------------------------
// POST /api/chat/reopen — Reopen (un-hide) a closed conversation for current user
// ---------------------------------------------------------------------------
const reopenChat = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthenticated." });
    }

    const { channelCid } = req.body || {};
    if (!channelCid || typeof channelCid !== "string") {
      return res.status(400).json({ success: false, message: "Channel CID is required." });
    }

    const userId = req.user._id || req.user.id;

    const state = await UserChatState.findOneAndUpdate(
      { user: userId, channelCid: channelCid.trim() },
      {
        $set: {
          isClosed: false,
          closedAt: null,
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    return res.status(200).json({
      success: true,
      message: "Chat reopened.",
      state: {
        channelCid: state.channelCid,
        isFavourite: state.isFavourite,
        isClosed: state.isClosed,
      },
    });
  } catch (error) {
    console.error("REOPEN CHAT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reopen chat.",
    });
  }
};

// ---------------------------------------------------------------------------
// POST /api/chat/upload — Server Fallback File Upload Endpoint for Chat
// ---------------------------------------------------------------------------
const uploadChatFile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthenticated." });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    const publicUrl = `/uploads/chat/${req.file.filename}`;

    return res.status(200).json({
      success: true,
      url: publicUrl,
      file: publicUrl,
      name: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (error) {
    console.error("UPLOAD CHAT FILE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to upload file.",
    });
  }
};

// ---------------------------------------------------------------------------
// POST /api/chat/clear — Clear chat history for the authenticated user ONLY
// ---------------------------------------------------------------------------
const clearChat = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthenticated." });
    }

    const { cid, targetUserId } = req.body || {};
    if (!cid || typeof cid !== "string") {
      return res.status(400).json({ success: false, message: "Channel CID is required." });
    }

    const userId = req.user._id || req.user.id;
    const now = new Date();

    const state = await UserChatState.findOneAndUpdate(
      { user: userId, channelCid: cid.trim() },
      {
        $set: {
          clearedAt: now,
          ...(targetUserId ? { targetUserId: String(targetUserId) } : {}),
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    return res.status(200).json({
      success: true,
      cid: state.channelCid,
      clearedAt: state.clearedAt.toISOString(),
      message: "Chat history cleared for current user.",
    });
  } catch (error) {
    console.error("CLEAR CHAT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to clear chat.",
    });
  }
};

module.exports = {
  getStreamToken,
  ensureUser,
  checkChatAccess,
  blockUser,
  unblockUser,
  getBlockStatus,
  getChatStates,
  toggleFavourite,
  closeChat,
  reopenChat,
  uploadChatFile,
  clearChat,
};