// ---------------------------------------------------------------------------
// server/controllers/notificationController.js — Express Controllers for Notifications
// Safe, paginated, and user-scoped notification API actions
// ---------------------------------------------------------------------------

const Notification = require("../models/notification");
const User = require("../models/user");
const mongoose = require("mongoose");

// ---------------------------------------------------------------------------
// GET /api/notifications — Fetch paginated notifications for current user
// ---------------------------------------------------------------------------
const getNotifications = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthenticated. Please log in." });
    }

    // Security: ONLY use req.user._id (ignore any query params requesting another user's notifications)
    const recipientId = req.user._id;

    // 15. PAGINATION (defaults: page=1, limit=20, max limit=50)
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 20;

    if (page < 1) page = 1;
    if (limit < 1) limit = 20;
    if (limit > 50) limit = 50;

    const skip = (page - 1) * limit;

    // 16. SORTING (Newest notifications first: createdAt = -1)
    const [notifications, total] = await Promise.all([
      Notification.find({ recipient: recipientId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("sender", "_id name email role profile.avatar")
        .lean(),
      Notification.countDocuments({ recipient: recipientId }),
    ]);

    const hasMore = skip + notifications.length < total;

    return res.status(200).json({
      success: true,
      notifications,
      pagination: {
        page,
        limit,
        total,
        hasMore,
      },
    });
  } catch (error) {
    console.error("Error in getNotifications controller:", error.message);
    return res.status(500).json({ message: "Internal server error fetching notifications." });
  }
};

// ---------------------------------------------------------------------------
// GET /api/notifications/unread-count — Count unread notifications for user
// ---------------------------------------------------------------------------
const getUnreadNotificationCount = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthenticated. Please log in." });
    }

    const count = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("Error in getUnreadNotificationCount controller:", error.message);
    return res.status(500).json({ message: "Internal server error counting unread notifications." });
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/notifications/:notificationId/read — Mark single notification read
// ---------------------------------------------------------------------------
const markNotificationAsRead = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthenticated. Please log in." });
    }

    const { notificationId } = req.params;

    if (!notificationId || !mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ message: "Invalid notification ID provided." });
    }

    // Security: strictly query by notificationId AND recipient: req.user._id
    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        recipient: req.user._id,
      },
      {
        $set: { isRead: true },
      },
      {
        returnDocument: "after",
      }
    ).populate("sender", "_id name email role profile.avatar");

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found or unauthorized.",
      });
    }

    return res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error("Error in markNotificationAsRead controller:", error.message);
    return res.status(500).json({ message: "Internal server error marking notification read." });
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/notifications/read-all — Mark all user notifications read
// ---------------------------------------------------------------------------
const markAllNotificationsAsRead = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthenticated. Please log in." });
    }

    await Notification.updateMany(
      {
        recipient: req.user._id,
        isRead: false,
      },
      {
        $set: { isRead: true },
      }
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
    });
  } catch (error) {
    console.error("Error in markAllNotificationsAsRead controller:", error.message);
    return res.status(500).json({ message: "Internal server error marking all notifications read." });
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/notifications/:notificationId — Delete single user notification
// ---------------------------------------------------------------------------
const deleteNotification = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthenticated. Please log in." });
    }

    const { notificationId } = req.params;

    if (!notificationId || !mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ message: "Invalid notification ID provided." });
    }

    // Security: strictly filter by _id AND recipient: req.user._id
    const deleted = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: req.user._id,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Notification not found or unauthorized.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification deleted.",
      notificationId,
    });
  } catch (error) {
    console.error("Error in deleteNotification controller:", error.message);
    return res.status(500).json({ message: "Internal server error deleting notification." });
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/notifications — Clear all user notifications
// ---------------------------------------------------------------------------
const clearAllNotifications = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthenticated. Please log in." });
    }

    // Security: strictly filter by recipient: req.user._id (NEVER global deleteMany)
    const result = await Notification.deleteMany({
      recipient: req.user._id,
    });

    return res.status(200).json({
      success: true,
      message: "All notifications cleared.",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error in clearAllNotifications controller:", error.message);
    return res.status(500).json({ message: "Internal server error clearing notifications." });
  }
};

module.exports = {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
};
