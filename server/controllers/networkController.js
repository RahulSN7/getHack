// ---------------------------------------------------------------------------
// server/controllers/networkController.js — Network & Connection Request Controllers
// Enforces backend profile completion checks, note validation, and connection limits
// ---------------------------------------------------------------------------

const Connection = require("../models/connection");
const User = require("../models/user");
const { isProfileComplete } = require("../utils/profileValidation");

// ---------------------------------------------------------------------------
// POST /api/network/requests — Send Connection Request
// ---------------------------------------------------------------------------
const sendConnectionRequest = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthenticated." });
    }

    const sender = await User.findById(req.user._id);
    if (!sender) {
      return res.status(404).json({ message: "Sender account not found." });
    }

    if (!isProfileComplete(sender)) {
      return res.status(400).json({
        success: false,
        code: "PROFILE_INCOMPLETE",
        message: "Please complete your profile before connecting with other users.",
      });
    }

    const { receiverId, note } = req.body || {};

    if (!receiverId || typeof receiverId !== "string" || !receiverId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid recipient specified." });
    }

    const senderIdStr = sender._id.toString();
    const receiverIdStr = receiverId.trim();

    // Prevent self-requests
    if (senderIdStr === receiverIdStr) {
      return res.status(400).json({ message: "You cannot send a connection request to yourself." });
    }

    // Verify receiver exists
    const receiver = await User.findById(receiverIdStr);
    if (!receiver) {
      return res.status(404).json({ message: "Recipient user not found." });
    }

    // Check existing connections / pending requests
    const existing = await Connection.findOne({
      $or: [
        { sender: sender._id, receiver: receiver._id },
        { sender: receiver._id, receiver: sender._id },
      ],
    });

    if (existing) {
      if (existing.status === "pending") {
        return res.status(400).json({ message: "Connection request already sent." });
      }
      if (existing.status === "accepted") {
        return res.status(400).json({ message: "You are already connected." });
      }
      // If previously rejected, allow re-requesting by updating status & note
      if (existing.status === "rejected") {
        let cleanNote = typeof note === "string" ? note.trim() : null;
        if (cleanNote && cleanNote.length > 300) {
          return res.status(400).json({ message: "Note cannot exceed 300 characters." });
        }
        if (!cleanNote) cleanNote = null;

        existing.sender = sender._id;
        existing.receiver = receiver._id;
        existing.note = cleanNote;
        existing.status = "pending";
        await existing.save();

        return res.status(200).json({
          message: "Connection request sent successfully.",
          connection: existing,
        });
      }
    }

    // Validate optional note (max 300 chars, whitespace trimmed, empty stored as null)
    let cleanNote = typeof note === "string" ? note.trim() : null;
    if (cleanNote && cleanNote.length > 300) {
      return res.status(400).json({ message: "Note cannot exceed 300 characters." });
    }
    if (!cleanNote) cleanNote = null;

    const newConnection = await Connection.create({
      sender: sender._id,
      receiver: receiver._id,
      note: cleanNote,
      status: "pending",
    });

    return res.status(201).json({
      message: "Connection request sent successfully.",
      connection: newConnection,
    });
  } catch (error) {
    console.error("Error in sendConnectionRequest:", error);
    return res.status(500).json({ message: "Failed to send connection request." });
  }
};

// ---------------------------------------------------------------------------
// GET /api/network/requests — Fetch Connections, Incoming & Outgoing Requests
// ---------------------------------------------------------------------------
function extractSafeUser(userDoc) {
  if (!userDoc) return {};
  if (typeof userDoc.toSafeUser === "function") {
    try {
      return userDoc.toSafeUser();
    } catch {
      // Fallback if toSafeUser throws
    }
  }
  const p = userDoc.profile || {};
  return {
    id: (userDoc._id || userDoc.id)?.toString() || "",
    name: userDoc.name || "Participant",
    email: userDoc.email || "",
    role: userDoc.role || "participant",
    avatar: typeof p.avatar === "string" ? p.avatar : "",
    profile: {
      avatar: typeof p.avatar === "string" ? p.avatar : "",
      role: typeof p.role === "string" ? p.role : "Developer",
      bio: typeof p.bio === "string" ? p.bio : "",
      skills: Array.isArray(p.skills) ? p.skills : [],
      location: typeof p.location === "string" ? p.location : "",
      availability: typeof p.availability === "string" ? p.availability : "",
    },
  };
}

const getNetworkRequests = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthenticated." });
    }

    const userId = req.user._id;

    // Fetch accepted connections
    const rawConnections = await Connection.find({
      $or: [{ sender: userId }, { receiver: userId }],
      status: "accepted",
    })
      .populate("sender", "name email role profile createdAt")
      .populate("receiver", "name email role profile createdAt")
      .sort({ updatedAt: -1 });

    const connections = rawConnections.map((c) => {
      const senderIdStr = c.sender?._id ? c.sender._id.toString() : (c.sender ? c.sender.toString() : "");
      const isSender = senderIdStr === userId.toString();
      const partner = isSender ? c.receiver : c.sender;
      const safePartner = extractSafeUser(partner);

      return {
        id: c._id.toString(),
        connectionId: c._id.toString(),
        userId: safePartner.id,
        name: safePartner.name || "Participant",
        role: safePartner.profile?.role || "Developer",
        avatar: safePartner.profile?.avatar || "",
        bio: safePartner.profile?.bio || "",
        skills: safePartner.profile?.skills || [],
        location: safePartner.profile?.location || "",
        availability: safePartner.profile?.availability || "",
        connectedAt: c.updatedAt,
      };
    });

    // Fetch incoming pending requests (with optional note)
    const rawIncoming = await Connection.find({
      receiver: userId,
      status: "pending",
    })
      .populate("sender", "name email role profile createdAt")
      .sort({ createdAt: -1 });

    const incoming = rawIncoming.map((c) => {
      const safeSender = extractSafeUser(c.sender);
      return {
        id: c._id.toString(),
        requestId: c._id.toString(),
        senderId: safeSender.id,
        name: safeSender.name || "Participant",
        role: safeSender.profile?.role || "Developer",
        avatar: safeSender.profile?.avatar || "",
        bio: safeSender.profile?.bio || "",
        skills: safeSender.profile?.skills || [],
        location: safeSender.profile?.location || "",
        availability: safeSender.profile?.availability || "",
        note: c.note || null,
        createdAt: c.createdAt,
      };
    });

    // Fetch outgoing pending requests
    const rawOutgoing = await Connection.find({
      sender: userId,
      status: "pending",
    })
      .populate("receiver", "name email role profile createdAt")
      .sort({ createdAt: -1 });

    const outgoing = rawOutgoing.map((c) => {
      const safeReceiver = extractSafeUser(c.receiver);
      return {
        id: c._id.toString(),
        requestId: c._id.toString(),
        receiverId: safeReceiver.id,
        name: safeReceiver.name || "Participant",
        role: safeReceiver.profile?.role || "Developer",
        avatar: safeReceiver.profile?.avatar || "",
        bio: safeReceiver.profile?.bio || "",
        skills: safeReceiver.profile?.skills || [],
        location: safeReceiver.profile?.location || "",
        availability: safeReceiver.profile?.availability || "",
        note: c.note || null,
        createdAt: c.createdAt,
      };
    });

    return res.status(200).json({
      success: true,
      connections,
      incoming,
      outgoing,
    });
  } catch (error) {
    console.error("Error in getNetworkRequests:", error);
    return res.status(500).json({ success: false, message: "Failed to load network requests." });
  }
};

// ---------------------------------------------------------------------------
// PUT /api/network/requests/:id — Respond to Connection Request (Accept/Decline)
// ---------------------------------------------------------------------------
const respondToConnectionRequest = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthenticated." });
    }

    const { id } = req.params;
    const { action } = req.body || {};

    if (action !== "accept" && action !== "decline") {
      return res.status(400).json({ success: false, message: "Invalid action. Use 'accept' or 'decline'." });
    }

    const connection = await Connection.findOne({
      _id: id,
      receiver: req.user._id,
      status: "pending",
    });

    if (!connection) {
      return res.status(404).json({ success: false, message: "Connection request not found or already processed." });
    }

    connection.status = action === "accept" ? "accepted" : "rejected";
    await connection.save();

    return res.status(200).json({
      success: true,
      message: `Connection request ${action === "accept" ? "accepted" : "declined"}.`,
      connection,
    });
  } catch (error) {
    console.error("Error in respondToConnectionRequest:", error);
    return res.status(500).json({ message: "Failed to update connection request." });
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/network/requests/:id — Cancel Sent Connection Request
// ---------------------------------------------------------------------------
const cancelConnectionRequest = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthenticated." });
    }

    const { id } = req.params;

    // Validate ObjectId format
    if (!id || typeof id !== "string" || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: "Invalid connection request ID." });
    }

    // Check if request exists
    const existing = await Connection.findById(id);

    if (!existing) {
      return res.status(404).json({ success: false, message: "Connection request not found." });
    }

    // Verify authenticated user is the sender
    if (existing.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "You are not authorized to cancel this connection request." });
    }

    // Check if request is still pending
    if (existing.status === "accepted") {
      return res.status(400).json({
        success: false,
        message: "This connection request can no longer be cancelled as it has already been accepted.",
      });
    }

    if (existing.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "This connection request is no longer pending.",
      });
    }

    // Secure database cancellation scoped to sender and pending status
    const cancelled = await Connection.findOneAndDelete({
      _id: id,
      sender: req.user._id,
      status: "pending",
    });

    if (!cancelled) {
      return res.status(400).json({
        success: false,
        message: "Connection request could not be cancelled. It may have already been processed.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Connection request cancelled successfully.",
      requestId: id,
    });
  } catch (error) {
    console.error("Error in cancelConnectionRequest:", error);
    return res.status(500).json({ success: false, message: "Failed to cancel connection request." });
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/network/connections/:targetUserId — Remove Accepted Connection
// ---------------------------------------------------------------------------
const removeConnection = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthenticated." });
    }

    const { targetUserId } = req.params;

    if (!targetUserId || typeof targetUserId !== "string" || !targetUserId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: "Invalid target user specified." });
    }

    const currentUserId = req.user._id;

    if (currentUserId.toString() === targetUserId) {
      return res.status(400).json({ success: false, message: "You cannot remove a connection with yourself." });
    }

    // Find accepted connection where current user is either sender or receiver
    const connection = await Connection.findOne({
      $or: [
        { sender: currentUserId, receiver: targetUserId },
        { sender: targetUserId, receiver: currentUserId },
      ],
      status: "accepted",
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "No accepted connection found with this user.",
      });
    }

    // Delete connection record
    await Connection.findByIdAndDelete(connection._id);

    return res.status(200).json({
      success: true,
      message: "Connection removed successfully.",
      targetUserId,
    });
  } catch (error) {
    console.error("Error in removeConnection:", error);
    return res.status(500).json({ success: false, message: "Failed to remove connection." });
  }
};

module.exports = {
  sendConnectionRequest,
  getNetworkRequests,
  respondToConnectionRequest,
  cancelConnectionRequest,
  removeConnection,
};
