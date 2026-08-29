// ---------------------------------------------------------------------------
// server/services/notificationService.js — Core Notification Business Service
// Encapsulates notification creation, self-notification prevention, and deduplication
// ---------------------------------------------------------------------------

const Notification = require("../models/notification");
const { emitNotificationToUser } = require("./socketService");

/**
 * Creates and saves a new Notification document.
 * Prevents self-notifications (sender === recipient) and optional duplicate actions.
 * Immediately emits real-time event "notification:created" to recipient.
 */
const createNotification = async ({
  recipient,
  sender = null,
  type,
  title,
  message,
  entityType = null,
  entityId = null,
  metadata = {},
}) => {
  try {
    if (!recipient || !type || !title || !message) {
      throw new Error("Missing required notification fields: recipient, type, title, message");
    }

    // 13. PREVENT SELF-NOTIFICATIONS
    if (sender && recipient && sender.toString() === recipient.toString()) {
      return null;
    }

    // 14. DUPLICATE NOTIFICATION PROTECTION
    // If metadata contains actionId or deduplication hint, avoid creating duplicates
    if (metadata && metadata.actionId) {
      const existing = await Notification.findOne({
        recipient,
        sender: sender || null,
        type,
        "metadata.actionId": metadata.actionId,
      }).populate("sender", "_id name email role profile.avatar");

      if (existing) {
        return existing;
      }
    }

    const notification = await Notification.create({
      recipient,
      sender: sender || null,
      type,
      title,
      message,
      entityType,
      entityId,
      metadata,
      isRead: false,
    });

    // Populate sender details for full payload rendering on recipient client
    let fullNotification = notification;
    if (sender) {
      const populated = await Notification.findById(notification._id).populate(
        "sender",
        "_id name email role profile.avatar"
      );
      if (populated) {
        fullNotification = populated;
      }
    }

    // STEP 4: Emit real-time notification event strictly to recipient
    try {
      emitNotificationToUser(recipient, fullNotification.toObject ? fullNotification.toObject() : fullNotification);
    } catch (realtimeErr) {
      console.warn("Failed to deliver real-time notification event:", realtimeErr.message);
    }

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error.message);
    throw error;
  }
};

module.exports = {
  createNotification,
};
