// ---------------------------------------------------------------------------
// server/controllers/chatController.js — Chat Token & User Sync Controller
// Generates Stream Chat tokens, synchronizes users, and handles user blocking.
// ---------------------------------------------------------------------------

const fs = require("fs");
const path = require("path");
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

// ---------------------------------------------------------------------------
// POST /api/chat/groups — Create persistent group in MongoDB and Stream Chat
// ---------------------------------------------------------------------------
const Group = require("../models/group");

const createGroup = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthenticated." });
    }

    const { name, memberUserIds, avatarUrl } = req.body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "Group name is required." });
    }

    if (!Array.isArray(memberUserIds) || memberUserIds.length === 0) {
      return res.status(400).json({ success: false, message: "At least one group member must be selected." });
    }

    const currentUserIdStr = String(req.user._id || req.user.id);
    const uniqueMemberIdStrs = Array.from(
      new Set([currentUserIdStr, ...memberUserIds.map((id) => String(id))])
    );

    // Validate that all specified member IDs exist as Users in MongoDB
    const memberUsers = await User.find({ _id: { $in: uniqueMemberIdStrs } }).select("_id name profile.avatar");
    if (memberUsers.length !== uniqueMemberIdStrs.length) {
      return res.status(400).json({ success: false, message: "One or more selected group members do not exist." });
    }

    const allMemberObjectIds = memberUsers.map((u) => u._id);

    // Generate unique Stream channel ID
    const streamChannelId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const createdAt = new Date();
    const initialMemberHistory = allMemberObjectIds.map((mId) => ({
      user: mId,
      joinedAt: createdAt,
      removedAt: null,
    }));

    // 1. Create Group record in MongoDB
    const group = await Group.create({
      name: name.trim(),
      avatar: typeof avatarUrl === "string" ? avatarUrl.trim() : "",
      creator: req.user._id,
      members: allMemberObjectIds,
      memberHistory: initialMemberHistory,
      streamChannelId,
    });

    // 2. Sync members and create GetStream channel server-side
    try {
      await upsertStreamUsers(memberUsers);
      const streamClient = getStreamClient();
      const channel = streamClient.channel("messaging", streamChannelId, {
        name: group.name,
        image: group.avatar || undefined,
        avatar: group.avatar || undefined,
        members: uniqueMemberIdStrs,
        created_by_id: currentUserIdStr,
        isGroup: true,
      });
      await channel.create();
    } catch (streamErr) {
      console.error("Stream Channel creation error for group:", streamErr);
    }

    const populatedGroup = await Group.findById(group._id)
      .populate("creator", "name profile.avatar")
      .populate("members", "name profile.avatar");

    return res.status(201).json({
      success: true,
      group: populatedGroup,
      message: "Group created successfully.",
    });
  } catch (error) {
    console.error("CREATE GROUP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create group.",
    });
  }
};

// ---------------------------------------------------------------------------
// GET /api/chat/groups — Fetch persistent groups for authenticated user
// ---------------------------------------------------------------------------
const getUserGroups = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthenticated." });
    }

    const userId = req.user._id || req.user.id;

    const groups = await Group.find({
      members: userId,
      deletedForUsers: { $ne: userId },
    })
      .populate("creator", "name profile.avatar")
      .populate("members", "name profile.avatar")
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      groups,
    });
  } catch (error) {
    console.error("GET USER GROUPS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch user groups.",
    });
  }
};

// ---------------------------------------------------------------------------
// GET /api/chat/groups/removed — Fetch groups from which user was removed
// ---------------------------------------------------------------------------
const getUserRemovedGroups = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthenticated." });
    }

    const userId = req.user._id || req.user.id;

    const groups = await Group.find({
      removedMembers: userId,
      deletedForUsers: { $ne: userId },
    })
      .populate("creator", "name profile.avatar")
      .populate("members", "name profile.avatar")
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      groups,
    });
  } catch (error) {
    console.error("GET USER REMOVED GROUPS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch removed groups.",
    });
  }
};

// Helper to construct flexible MongoDB group query matching _id or streamChannelId (with or without group_ prefix)
const getGroupQuery = (groupId) => {
  if (!groupId) return null;
  const cleanId = String(groupId).trim();
  const isObjectId = Boolean(cleanId.match(/^[0-9a-fA-F]{24}$/));
  if (isObjectId) {
    return { _id: cleanId };
  }
  const withGroup = cleanId.startsWith("group_") ? cleanId : `group_${cleanId}`;
  const withoutGroup = cleanId.replace(/^group_/, "");
  return {
    $or: [
      { streamChannelId: cleanId },
      { streamChannelId: withGroup },
      { streamChannelId: withoutGroup },
    ],
  };
};

// ---------------------------------------------------------------------------
// GET /api/chat/groups/:groupId — Fetch single group details by ID or channel ID
// ---------------------------------------------------------------------------
const getGroupById = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthenticated." });
    }

    const { groupId } = req.params;
    if (!groupId) {
      return res.status(400).json({ success: false, message: "Group ID is required." });
    }

    const userId = req.user._id || req.user.id;
    const query = getGroupQuery(groupId);
    if (!query) {
      return res.status(400).json({ success: false, message: "Invalid Group ID." });
    }

    const group = await Group.findOne(query)
      .populate("creator", "_id name profile.avatar profile.bio profile.role profile.skills role")
      .populate("members", "_id name profile.avatar profile.bio profile.role profile.skills role")
      .populate("memberHistory.user", "_id name profile.avatar");

    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found." });
    }

    const isMember = group.members.some(
      (m) => String(m._id || m.id) === String(userId)
    );

    const isRemovedMember = !isMember && (group.removedMembers || []).some(
      (rm) => String(rm._id || rm.id || rm) === String(userId)
    );

    if (!isMember && !isRemovedMember) {
      return res.status(403).json({ success: false, message: "You are not a member of this group." });
    }

    // Ensure memberHistory fallback for legacy groups
    if (!Array.isArray(group.memberHistory) || group.memberHistory.length === 0) {
      const fallbackJoinedAt = group.createdAt || new Date();
      group.memberHistory = (group.members || []).map((m) => ({
        user: m._id || m.id || m,
        joinedAt: fallbackJoinedAt,
        removedAt: null,
      }));
    }

    return res.status(200).json({
      success: true,
      group,
      isRemovedMember,
    });
  } catch (error) {
    console.error("GET GROUP BY ID ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch group details.",
    });
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/chat/groups/:groupId/description — Update group description
// ---------------------------------------------------------------------------
const updateGroupDescription = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthenticated." });
    }

    const { groupId } = req.params;
    const { description } = req.body || {};
    const userId = req.user._id || req.user.id;

    const query = getGroupQuery(groupId);
    if (!query) {
      return res.status(400).json({ success: false, message: "Invalid Group ID." });
    }

    const group = await Group.findOne(query);
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found." });
    }

    // Admin authorization check
    const creatorIdStr = String(group.creator._id || group.creator.id || group.creator);
    if (creatorIdStr !== String(userId)) {
      return res.status(403).json({ success: false, message: "Only the group admin can update the group description." });
    }

    group.description = typeof description === "string" ? description.trim() : "";
    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate("creator", "_id name profile.avatar profile.bio profile.role profile.skills role")
      .populate("members", "_id name profile.avatar profile.bio profile.role profile.skills role");

    return res.status(200).json({
      success: true,
      group: populatedGroup,
      message: "Group description updated successfully.",
    });
  } catch (error) {
    console.error("UPDATE GROUP DESCRIPTION ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update group description.",
    });
  }
};

// ---------------------------------------------------------------------------
// POST /api/chat/groups/:groupId/members — Add new members to a group
// ---------------------------------------------------------------------------
const addGroupMembers = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthenticated." });
    }

    const { groupId } = req.params;
    const { memberUserIds } = req.body || {};

    if (!Array.isArray(memberUserIds) || memberUserIds.length === 0) {
      return res.status(400).json({ success: false, message: "No members specified to add." });
    }

    const userId = req.user._id || req.user.id;
    const query = getGroupQuery(groupId);
    if (!query) {
      return res.status(400).json({ success: false, message: "Invalid Group ID." });
    }

    const group = await Group.findOne(query);
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found." });
    }

    // Admin authorization check
    const creatorIdStr = String(group.creator._id || group.creator.id || group.creator);
    if (creatorIdStr !== String(userId)) {
      return res.status(403).json({ success: false, message: "Only the group admin can add members to this group." });
    }

    // Filter out user IDs already in group members
    const existingMemberStrSet = new Set(group.members.map((m) => String(m)));
    const newMemberIdStrs = Array.from(new Set(memberUserIds.map((id) => String(id))))
      .filter((id) => !existingMemberStrSet.has(id));

    if (newMemberIdStrs.length === 0) {
      return res.status(400).json({ success: false, message: "Selected users are already members of this group." });
    }

    const newUsers = await User.find({ _id: { $in: newMemberIdStrs } }).select("_id name profile.avatar");
    if (newUsers.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid user IDs specified." });
    }

    const newObjectIds = newUsers.map((u) => u._id);
    group.members.push(...newObjectIds);

    // Track new membership period in memberHistory
    const now = new Date();
    if (!Array.isArray(group.memberHistory)) group.memberHistory = [];
    for (const mId of newObjectIds) {
      group.memberHistory.push({
        user: mId,
        joinedAt: now,
        removedAt: null,
      });
    }

    // Remove re-added members from deletedForUsers array if present so group reappears in their chat list
    if (Array.isArray(group.deletedForUsers)) {
      group.deletedForUsers = group.deletedForUsers.filter(
        (id) => !newMemberIdStrs.includes(String(id._id || id.id || id))
      );
    }

    // Clean re-added users from removedMembers (if they were previously removed)
    if (Array.isArray(group.removedMembers) && group.removedMembers.length > 0) {
      const reAddedSet = new Set(newMemberIdStrs);
      group.removedMembers = group.removedMembers.filter(
        (rm) => !reAddedSet.has(String(rm._id || rm.id || rm))
      );
    }

    await group.save();

    // Sync to Stream Chat & Dispatch System Message (Single Source of Truth)
    try {
      await upsertStreamUsers(newUsers);
      const streamClient = getStreamClient();
      const channel = streamClient.channel("messaging", group.streamChannelId);

      const adminName = req.user.name || "Admin";
      const targetUserNames = newUsers.map((u) => u.name || "a user").join(", ");
      const systemText = `${adminName} added ${targetUserNames}`;
      const firstTarget = newUsers[0];

      await channel.addMembers(newMemberIdStrs, {
        text: systemText,
        type: "system",
        custom_type: "member_added",
        is_system_message: true,
        event: "member_added",
        actor_id: String(req.user._id || req.user.id),
        actor_name: adminName,
        target_user_id: String(firstTarget?._id || firstTarget?.id || newMemberIdStrs[0]),
        target_user_name: targetUserNames,
        user: {
          id: String(req.user._id || req.user.id),
          name: adminName,
        },
      });
    } catch (streamErr) {
      console.error("Failed to add members or send system message to Stream Chat channel:", streamErr);
    }

    const populatedGroup = await Group.findById(group._id)
      .populate("creator", "_id name profile.avatar profile.bio profile.role profile.skills role")
      .populate("members", "_id name profile.avatar profile.bio profile.role profile.skills role");

    return res.status(200).json({
      success: true,
      group: populatedGroup,
      message: "Members added successfully.",
    });
  } catch (error) {
    console.error("ADD GROUP MEMBERS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to add members to group.",
    });
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/chat/groups/:groupId/name — Admin-only group name update
// ---------------------------------------------------------------------------
const updateGroupName = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthenticated." });
    }

    const { groupId } = req.params;
    const { name } = req.body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "Group name is required." });
    }

    const trimmedName = name.trim();
    if (trimmedName.length > 50) {
      return res.status(400).json({ success: false, message: "Group name cannot exceed 50 characters." });
    }

    const userId = req.user._id || req.user.id;
    const userIdStr = String(userId);

    const query = getGroupQuery(groupId);
    if (!query) {
      return res.status(400).json({ success: false, message: "Invalid Group ID." });
    }

    const group = await Group.findOne(query);
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found." });
    }

    // Authorization Check: Only group admin/creator can update group name
    const creatorIdStr = String(group.creator._id || group.creator.id || group.creator);
    if (creatorIdStr !== userIdStr) {
      return res.status(403).json({
        success: false,
        message: "Only the group admin can update the group name.",
      });
    }

    group.name = trimmedName;
    await group.save();

    // Sync GetStream channel name
    try {
      const streamClient = getStreamClient();
      const channel = streamClient.channel("messaging", group.streamChannelId);
      await channel.updatePartial({
        set: {
          name: trimmedName,
        },
      });
    } catch (streamErr) {
      console.error("Failed to update GetStream channel name:", streamErr);
    }

    const populatedGroup = await Group.findById(group._id)
      .populate("creator", "_id name profile.avatar profile.bio profile.role profile.skills role")
      .populate("members", "_id name profile.avatar profile.bio profile.role profile.skills role");

    return res.status(200).json({
      success: true,
      group: populatedGroup,
      message: "Group name updated successfully.",
    });
  } catch (error) {
    console.error("UPDATE GROUP NAME ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update group name.",
    });
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/chat/groups/:groupId/avatar — Admin-only group avatar update
// ---------------------------------------------------------------------------
const updateGroupAvatar = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthenticated." });
    }

    const { groupId } = req.params;
    const { avatarUrl } = req.body || {};
    const userId = req.user._id || req.user.id;
    const userIdStr = String(userId);

    const query = getGroupQuery(groupId);
    if (!query) {
      return res.status(400).json({ success: false, message: "Invalid Group ID." });
    }

    const group = await Group.findOne(query);
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found." });
    }

    // Backend Authorization Check: Only the group admin/creator can update group avatar
    const creatorIdStr = String(group.creator._id || group.creator.id || group.creator);
    if (creatorIdStr !== userIdStr) {
      return res.status(403).json({
        success: false,
        message: "Only the group admin can update the group avatar.",
      });
    }

    const oldAvatar = group.avatar || "";
    const newAvatar = typeof avatarUrl === "string" ? avatarUrl.trim() : "";

    group.avatar = newAvatar;
    await group.save();

    // Safely delete old stored image file from storage if replaced or removed
    if (
      oldAvatar &&
      oldAvatar !== newAvatar &&
      oldAvatar.startsWith("/uploads/")
    ) {
      const oldFilePath = path.join(__dirname, "../public", oldAvatar);
      fs.unlink(oldFilePath, (error) => {
        if (error && error.code !== "ENOENT") {
          console.warn("Could not delete old group avatar file:", oldFilePath, error);
        }
      });
    }

    // Update GetStream channel image metadata
    try {
      const streamClient = getStreamClient();
      const channel = streamClient.channel("messaging", group.streamChannelId);
      await channel.updatePartial({
        set: {
          image: newAvatar || undefined,
          avatar: newAvatar || undefined,
        },
      });
    } catch (streamErr) {
      console.error("Failed to update GetStream channel image metadata:", streamErr);
    }

    const populatedGroup = await Group.findById(group._id)
      .populate("creator", "_id name profile.avatar profile.bio profile.role profile.skills role")
      .populate("members", "_id name profile.avatar profile.bio profile.role profile.skills role");

    return res.status(200).json({
      success: true,
      group: populatedGroup,
      message: "Group avatar updated successfully.",
    });
  } catch (error) {
    console.error("UPDATE GROUP AVATAR ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update group avatar.",
    });
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/chat/groups/:groupId/members/:memberId — Admin-only member removal
// ---------------------------------------------------------------------------
const removeGroupMember = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthenticated." });
    }

    const { groupId, memberId } = req.params;
    if (!groupId || !memberId) {
      return res.status(400).json({ success: false, message: "Group ID and Member ID are required." });
    }

    const userId = req.user._id || req.user.id;
    const userIdStr = String(userId);
    const targetMemberIdStr = String(memberId);

    const query = getGroupQuery(groupId);
    if (!query) {
      return res.status(400).json({ success: false, message: "Invalid Group ID." });
    }

    const group = await Group.findOne(query);
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found." });
    }

    // Authorization Check 1: Only group admin/creator can remove members
    const creatorIdStr = String(group.creator._id || group.creator.id || group.creator);
    if (creatorIdStr !== userIdStr) {
      return res.status(403).json({
        success: false,
        message: "Only the group admin can remove members from this group.",
      });
    }

    // Authorization Check 2: Admin cannot remove themselves
    if (creatorIdStr === targetMemberIdStr) {
      return res.status(400).json({
        success: false,
        message: "The group admin cannot be removed from the group.",
      });
    }

    // Check if target user is currently in group.members
    const memberIndex = group.members.findIndex(
      (m) => String(m._id || m.id || m) === targetMemberIdStr
    );

    if (memberIndex === -1) {
      return res.status(400).json({
        success: false,
        message: "Target user is not a member of this group.",
      });
    }

    // Remove member from MongoDB group document
    group.members.splice(memberIndex, 1);

    // Update active memberHistory entry with removal timestamp
    const now = new Date();
    if (Array.isArray(group.memberHistory)) {
      for (let i = group.memberHistory.length - 1; i >= 0; i--) {
        const entry = group.memberHistory[i];
        if (
          String(entry.user._id || entry.user.id || entry.user) === targetMemberIdStr &&
          !entry.removedAt
        ) {
          entry.removedAt = now;
          break;
        }
      }
    }

    // Track in removedMembers for read-only chat history access (WhatsApp-style)
    const alreadyInRemoved = (group.removedMembers || []).some(
      (rm) => String(rm._id || rm.id || rm) === targetMemberIdStr
    );
    if (!alreadyInRemoved) {
      if (!group.removedMembers) group.removedMembers = [];
      group.removedMembers.push(targetMemberIdStr);
    }

    await group.save();

    let targetUserName = "a user";
    try {
      const targetUser = await User.findById(targetMemberIdStr).select("name");
      if (targetUser && targetUser.name) {
        targetUserName = targetUser.name;
      }
    } catch (uErr) {
      console.error("Failed to fetch target user name:", uErr);
    }

    // Sync GetStream channel membership & Dispatch System Message (Single Source of Truth)
    try {
      const streamClient = getStreamClient();
      const channel = streamClient.channel("messaging", group.streamChannelId);

      const adminName = req.user.name || "Admin";
      const systemText = `${adminName} removed ${targetUserName}`;

      await channel.removeMembers([targetMemberIdStr], {
        text: systemText,
        type: "system",
        custom_type: "member_removed",
        is_system_message: true,
        event: "member_removed",
        actor_id: String(req.user._id || req.user.id),
        actor_name: adminName,
        target_user_id: String(targetMemberIdStr),
        target_user_name: targetUserName,
        user: {
          id: String(req.user._id || req.user.id),
          name: adminName,
        },
      });
    } catch (streamErr) {
      console.error("Failed to remove member from Stream Chat channel:", streamErr);
    }

    const populatedGroup = await Group.findById(group._id)
      .populate("creator", "_id name profile.avatar profile.bio profile.role profile.skills role")
      .populate("members", "_id name profile.avatar profile.bio profile.role profile.skills role");

    return res.status(200).json({
      success: true,
      group: populatedGroup,
      message: "Member removed successfully.",
    });
  } catch (error) {
    console.error("REMOVE GROUP MEMBER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to remove member from group.",
    });
  }
};

/**
 * POST /api/chat/groups/:groupId/exit
 * Exit group chat (WhatsApp-style self-exit).
 */
const exitGroup = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthenticated." });
    }

    const { groupId } = req.params;
    if (!groupId) {
      return res.status(400).json({ success: false, message: "Group ID is required." });
    }

    const userIdStr = String(req.user._id || req.user.id);
    const query = getGroupQuery(groupId);
    if (!query) {
      return res.status(400).json({ success: false, message: "Invalid Group ID." });
    }

    const group = await Group.findOne(query);
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found." });
    }

    // Check if user is currently an active member
    const memberIndex = group.members.findIndex(
      (m) => String(m._id || m.id || m) === userIdStr
    );

    if (memberIndex === -1) {
      return res.status(400).json({
        success: false,
        message: "You are not an active member of this group.",
      });
    }

    // Remove member from MongoDB group document
    group.members.splice(memberIndex, 1);

    // Update active memberHistory entry with removal timestamp
    const now = new Date();
    if (Array.isArray(group.memberHistory)) {
      for (let i = group.memberHistory.length - 1; i >= 0; i--) {
        const entry = group.memberHistory[i];
        if (
          String(entry.user._id || entry.user.id || entry.user) === userIdStr &&
          !entry.removedAt
        ) {
          entry.removedAt = now;
          break;
        }
      }
    }

    // Track in removedMembers for read-only chat history access (WhatsApp-style)
    const alreadyInRemoved = (group.removedMembers || []).some(
      (rm) => String(rm._id || rm.id || rm) === userIdStr
    );
    if (!alreadyInRemoved) {
      if (!group.removedMembers) group.removedMembers = [];
      group.removedMembers.push(userIdStr);
    }

    // Admin Exit Handling: If exiting user is admin/creator and members remain, assign next active member as creator
    const creatorIdStr = String(group.creator._id || group.creator.id || group.creator);
    if (creatorIdStr === userIdStr && group.members.length > 0) {
      group.creator = group.members[0];
    }

    await group.save();

    // Sync GetStream channel membership & Dispatch System Message (Single Source of Truth)
    try {
      const streamClient = getStreamClient();
      const channel = streamClient.channel("messaging", group.streamChannelId);

      const userName = req.user.name || "A member";
      const systemText = `${userName} left`;

      await channel.removeMembers([userIdStr], {
        text: systemText,
        type: "system",
        custom_type: "member_left",
        is_system_message: true,
        event: "member_left",
        actor_id: userIdStr,
        actor_name: userName,
        target_user_id: userIdStr,
        target_user_name: userName,
        user: {
          id: userIdStr,
          name: userName,
        },
      });
    } catch (streamErr) {
      console.error("Failed to remove member or send exit system message to Stream Chat channel:", streamErr);
    }

    const populatedGroup = await Group.findById(group._id)
      .populate("creator", "_id name profile.avatar profile.bio profile.role profile.skills role")
      .populate("members", "_id name profile.avatar profile.bio profile.role profile.skills role")
      .populate("memberHistory.user", "_id name profile.avatar");

    return res.status(200).json({
      success: true,
      group: populatedGroup,
      message: "Successfully exited group.",
    });
  } catch (error) {
    console.error("EXIT GROUP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to exit group.",
    });
  }
};

/**
 * POST /api/chat/groups/:groupId/delete-for-me
 * Delete/hide group chat for current user only (WhatsApp-style Delete Group for Me).
 */
const deleteGroupForMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthenticated." });
    }

    const { groupId } = req.params;
    if (!groupId) {
      return res.status(400).json({ success: false, message: "Group ID is required." });
    }

    const userIdStr = String(req.user._id || req.user.id);
    const query = getGroupQuery(groupId);
    if (!query) {
      return res.status(400).json({ success: false, message: "Invalid Group ID." });
    }

    const group = await Group.findOne(query);
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found." });
    }

    // Add user to deletedForUsers array if not already present
    const alreadyDeleted = (group.deletedForUsers || []).some(
      (id) => String(id._id || id.id || id) === userIdStr
    );

    if (!alreadyDeleted) {
      if (!group.deletedForUsers) group.deletedForUsers = [];
      group.deletedForUsers.push(userIdStr);
      await group.save();
    }

    return res.status(200).json({
      success: true,
      message: "Group chat deleted for you successfully.",
    });
  } catch (error) {
    console.error("DELETE GROUP FOR ME ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete group for you.",
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
  createGroup,
  getUserGroups,
  getUserRemovedGroups,
  getGroupById,
  updateGroupDescription,
  addGroupMembers,
  removeGroupMember,
  updateGroupName,
  updateGroupAvatar,
  exitGroup,
  deleteGroupForMe,
};