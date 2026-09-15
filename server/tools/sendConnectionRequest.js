
// server/tools/sendConnectionRequest.js — send_connection_request Agent Tool
// Controlled action tool to send connection requests to GetHack users.
// Reuses existing Connection model, profile validation, and notification system.


const mongoose = require("mongoose");
const Connection = require("../models/connection");
const User = require("../models/user");
const { isProfileComplete } = require("../utils/profileValidation");
const { createNotification } = require("../services/notificationService");
const { emitConnectionEventToUsers } = require("../services/socketService");

/**
 * Tool Definition Schema (for Gemini / OpenAI function declarations)
 */
const sendConnectionRequestDefinition = {
  name: "send_connection_request",
  description: "Send a connection request to a getHack user by targetUserId.",
  parameters: {
    type: "object",
    properties: {
      targetUserId: {
        type: "string",
        description: "Target GetHack user ID to send connection request to",
      },
      note: {
        type: "string",
        description: "Optional custom note for the connection request (max 300 chars)",
      },
    },
    required: ["targetUserId"],
  },
};

/**
 * Execute send_connection_request tool
 * 
 * @param {Object} args - Tool parameters ({ targetUserId, note })
 * @param {Object} context - Agent execution context (contains authenticated user identity)
 * @returns {Promise<Object>} Execution result payload
 */
async function sendConnectionRequest(args = {}, context = {}) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return {
        success: false,
        reason: "db_unavailable",
        message: "Database connection unavailable.",
      };
    }

    // Sender is strictly enforced from authenticated user context
    const currentUserId = context.userProfile?.id || context.user?._id?.toString() || context.user?.id;
    if (!currentUserId || !mongoose.Types.ObjectId.isValid(currentUserId)) {
      return {
        success: false,
        reason: "unauthenticated",
        message: "Unauthenticated. User identity context required.",
      };
    }

    const sender = await User.findById(currentUserId);
    if (!sender) {
      return {
        success: false,
        reason: "sender_not_found",
        message: "Sender account not found.",
      };
    }

    // Check sender profile completion requirement
    if (!isProfileComplete(sender)) {
      return {
        success: false,
        reason: "profile_incomplete",
        message: "Please complete your profile before connecting with other users.",
      };
    }

    const targetUserId = args.targetUserId ? String(args.targetUserId).trim() : "";
    if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
      return {
        success: false,
        reason: "invalid_target",
        message: "Invalid target user specified.",
      };
    }

    const senderIdStr = sender._id.toString();

    // Prevent self-connection requests
    if (senderIdStr === targetUserId) {
      return {
        success: false,
        reason: "self_request",
        message: "You cannot send a connection request to yourself.",
      };
    }

    // Verify recipient user exists
    const recipient = await User.findById(targetUserId);
    if (!recipient) {
      return {
        success: false,
        reason: "user_not_found",
        message: "I couldn't find that getHack user.",
      };
    }

    // Check existing connections / pending requests
    const existing = await Connection.findOne({
      $or: [
        { sender: sender._id, receiver: recipient._id },
        { sender: recipient._id, receiver: sender._id },
      ],
    });

    if (existing) {
      if (existing.status === "pending") {
        if (existing.sender.toString() === recipient._id.toString()) {
          return {
            success: false,
            reason: "incoming_request_exists",
            targetUserId,
            targetName: recipient.name,
            message: `${recipient.name} has already sent you a connection request.`,
          };
        }
        return {
          success: false,
          reason: "already_pending",
          targetUserId,
          targetName: recipient.name,
          message: `You have already sent a connection request to ${recipient.name}.`,
        };
      }
      if (existing.status === "accepted") {
        return {
          success: false,
          reason: "already_connected",
          targetUserId,
          targetName: recipient.name,
          message: `You're already connected with ${recipient.name}.`,
        };
      }
      if (existing.status === "rejected") {
        let cleanNote = typeof args.note === "string" ? args.note.trim() : null;
        if (cleanNote && cleanNote.length > 300) cleanNote = cleanNote.slice(0, 300);
        if (!cleanNote) cleanNote = null;

        existing.sender = sender._id;
        existing.receiver = recipient._id;
        existing.note = cleanNote;
        existing.status = "pending";
        await existing.save();

        // Create notification for recipient
        try {
          await createNotification({
            recipient: recipient._id,
            sender: sender._id,
            type: "CONNECTION_REQUEST",
            title: "New connection request",
            message: `${sender.name} sent you a connection request.`,
            entityType: "Connection",
            entityId: existing._id,
            metadata: { connectionId: existing._id.toString(), actionId: `conn_req_${existing._id}` },
          });
        } catch (notifErr) {
          console.warn("Failed to create connection request notification:", notifErr.message);
        }

        try {
          emitConnectionEventToUsers([sender._id, recipient._id], "connection:request-created", {
            type: "connection:request-created",
            requestId: existing._id.toString(),
            senderId: sender._id.toString(),
            receiverId: recipient._id.toString(),
            connection: existing,
          });
        } catch (eErr) {
          console.warn("Failed to emit connection event in AI tool:", eErr.message);
        }

        return {
          success: true,
          action: "send_connection_request",
          targetUserId,
          targetName: recipient.name,
          message: `Connection request sent to ${recipient.name}.`,
          connectionId: existing._id.toString(),
        };
      }
    }

    let cleanNote = typeof args.note === "string" ? args.note.trim() : null;
    if (cleanNote && cleanNote.length > 300) cleanNote = cleanNote.slice(0, 300);
    if (!cleanNote) cleanNote = null;

    const newConnection = await Connection.create({
      sender: sender._id,
      receiver: recipient._id,
      note: cleanNote,
      status: "pending",
    });

    // Create notification for recipient
    try {
      await createNotification({
        recipient: recipient._id,
        sender: sender._id,
        type: "CONNECTION_REQUEST",
        title: "New connection request",
        message: `${sender.name} sent you a connection request.`,
        entityType: "Connection",
        entityId: newConnection._id,
        metadata: { connectionId: newConnection._id.toString(), actionId: `conn_req_${newConnection._id}` },
      });
    } catch (notifErr) {
      console.warn("Failed to create connection request notification:", notifErr.message);
    }

    try {
      emitConnectionEventToUsers([sender._id, recipient._id], "connection:request-created", {
        type: "connection:request-created",
        requestId: newConnection._id.toString(),
        senderId: sender._id.toString(),
        receiverId: recipient._id.toString(),
        connection: newConnection,
      });
    } catch (eErr) {
      console.warn("Failed to emit connection event in AI tool:", eErr.message);
    }

    return {
      success: true,
      action: "send_connection_request",
      targetUserId,
      targetName: recipient.name,
      message: `Connection request sent to ${recipient.name}.`,
      connectionId: newConnection._id.toString(),
    };
  } catch (error) {
    console.error("[GetHack AI Tool Error: send_connection_request]:", error);
    return {
      success: false,
      reason: "server_error",
      message: "I couldn't send the connection request right now. Please try again.",
    };
  }
}

module.exports = {
  sendConnectionRequestDefinition,
  sendConnectionRequest,
};
