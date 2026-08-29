// ---------------------------------------------------------------------------
// server/routes/notificationRoutes.js — Express Router for Notifications
// ---------------------------------------------------------------------------

const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const { requireAuth } = require("../middleware/authMiddleware");

// All notification endpoints require user authentication
router.get("/", requireAuth, notificationController.getNotifications);
router.get("/unread-count", requireAuth, notificationController.getUnreadNotificationCount);
router.patch("/read-all", requireAuth, notificationController.markAllNotificationsAsRead);
router.patch("/:notificationId/read", requireAuth, notificationController.markNotificationAsRead);
router.delete("/clear-all", requireAuth, notificationController.clearAllNotifications);
router.delete("/:notificationId", requireAuth, notificationController.deleteNotification);
router.delete("/", requireAuth, notificationController.clearAllNotifications);

module.exports = router;
