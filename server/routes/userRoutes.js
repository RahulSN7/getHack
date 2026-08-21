// ---------------------------------------------------------------------------
// server/routes/userRoutes.js — Express Router for User & Organizer Profiles
// ---------------------------------------------------------------------------

const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { requireAuth, optionalAuth } = require("../middleware/authMiddleware");
const { requireOrganizer } = require("../middleware/roleMiddleware");

const upload = require("../middleware/uploadMiddleware");

// Logged-in user's own profile & completion stats
router.get("/profile", requireAuth, userController.getOwnProfile);

// Authenticated participant profile update (supports Multer file upload)
router.put(
  "/profile/participant",
  requireAuth,
  upload.single("profilePhoto"),
  userController.updateOwnParticipantProfile
);

// Public or optionally-authenticated participant profile view
router.get("/participant/:id", optionalAuth, userController.getParticipantProfile);

// Public or optionally-authenticated organizer profile view
router.get("/organizer/:id", optionalAuth, userController.getOrganizerProfile);

// Authenticated organizer profile update
router.put("/profile/organizer", requireAuth, requireOrganizer, userController.updateOwnOrganizerProfile);

module.exports = router;
