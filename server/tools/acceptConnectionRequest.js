
// server/tools/acceptConnectionRequest.js — Tool for Accepting Incoming Connection Requests


const Connection = require("../models/connection");
const User = require("../models/user");
const { createNotification } = require("../services/notificationService");
const { emitConnectionEventToUsers } = require("../services/socketService");
const mongoose = require("mongoose");

const acceptConnectionRequestDefinition = {
  name: "accept_connection_request",
  description: "Accept an incoming pending connection request from another user.",
  parameters: {
    type: "object",
    properties: {
      targetUserId: {
        type: "string",
        description: "The User ID of the person who sent the connection request.",
      },
      connectionId: {
        type: "string",
        description: "The optional Connection record ID.",
      },
    },
    required: [],
  },
};

/**
 * Execute tool to accept an incoming pending connection request
 * @param {Object} args { targetUserId, connectionId }
 * @param {Object} context { user, userProfile }
 * @returns {Promise<Object>} Execution result payload
 */
async function acceptConnectionRequest(args = {}, context = {}) {
  try {
    const activeUserId = context.user?._id || context.userProfile?.id || context.userProfile?._id;
    if (!activeUserId) {
      return {
        success: false,
        reason: "unauthenticated",
        message: "You must be logged in to accept a connection request.",
      };
    }

    const { targetUserId, connectionId } = args;

    let connectionQuery = null;

    if (connectionId && mongoose.Types.ObjectId.isValid(connectionId)) {
      connectionQuery = { _id: connectionId, receiver: activeUserId };
    } else if (targetUserId && mongoose.Types.ObjectId.isValid(targetUserId)) {
      connectionQuery = { receiver: activeUserId, sender: targetUserId };
    } else if (targetUserId) {
      // Flexible lookup by custom string id
      const senderUser = await User.findOne({
        $or: [{ _id: targetUserId }, { id: targetUserId }],
      });
      if (senderUser) {
        connectionQuery = { receiver: activeUserId, sender: senderUser._id };
      }
    }

    if (!connectionQuery) {
      return {
        success: false,
        reason: "missing_target",
        message: "Target user or connection request ID was not specified.",
      };
    }

    let connection = await Connection.findOne(connectionQuery);

    if (!connection) {
      // Check if already accepted
      const alreadyAccepted = await Connection.findOne({
        ...connectionQuery,
        status: "accepted",
      });
      if (alreadyAccepted) {
        const sender = await User.findById(alreadyAccepted.sender);
        return {
          success: true,
          reason: "already_connected",
          message: `You are already connected with ${sender?.name || "this user"}.`,
          partnerName: sender?.name || "this user",
        };
      }

      return {
        success: false,
        reason: "request_not_found",
        message: "No pending connection request found from this user.",
      };
    }

    if (connection.status === "accepted") {
      const sender = await User.findById(connection.sender);
      return {
        success: true,
        reason: "already_connected",
        message: `You are already connected with ${sender?.name || "this user"}.`,
        partnerName: sender?.name || "this user",
      };
    }

    connection.status = "accepted";
    await connection.save();

    const senderUser = await User.findById(connection.sender);
    const receiverUser = await User.findById(connection.receiver);

    try {
      emitConnectionEventToUsers([connection.sender, connection.receiver], "connection:request-accepted", {
        type: "connection:request-accepted",
        requestId: connection._id.toString(),
        senderId: connection.sender.toString(),
        receiverId: connection.receiver.toString(),
        connection,
      });
    } catch (eErr) {
      console.warn("[acceptConnectionRequest] Failed to emit socket event:", eErr.message);
    }

    // Create notification for sender
    try {
      if (senderUser && receiverUser) {
        await createNotification({
          recipient: senderUser._id,
          sender: receiverUser._id,
          type: "CONNECTION_ACCEPTED",
          title: "Connection request accepted",
          message: `${receiverUser.name} accepted your connection request.`,
          entityType: "Connection",
          entityId: connection._id,
          metadata: {
            connectionId: connection._id.toString(),
            actionId: `conn_resp_accept_${connection._id}`,
          },
        });
      }
    } catch (notifErr) {
      console.warn("[acceptConnectionRequest] Failed to send notification:", notifErr.message);
    }

    return {
      success: true,
      action: "accept_connection_request",
      message: `Connection request from ${senderUser?.name || "the user"} accepted.`,
      targetUserId: senderUser?._id?.toString() || targetUserId,
      targetName: senderUser?.name || "User",
      connectionStatus: "connected",
    };
  } catch (error) {
    console.error("[acceptConnectionRequest Error]:", error);
    return {
      success: false,
      reason: "server_error",
      message: "Could not accept connection request right now. Please try again later.",
    };
  }
}

module.exports = {
  acceptConnectionRequestDefinition,
  acceptConnectionRequest,
};
