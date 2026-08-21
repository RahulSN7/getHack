// ---------------------------------------------------------------------------
// server/routes/userRoutes.js — Express Router for User & Organizer Profiles
// ---------------------------------------------------------------------------

const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { requireAuth, optionalAuth } = require("../middleware/authMiddleware");
const { requireOrganizer } = require("../middleware/roleMiddleware");

// Logged-in user's own profile & completion stats
router.get("/profile", requireAuth, userController.getOwnProfile);

// Authenticated participant profile update
router.put("/profile/participant", requireAuth, userController.updateOwnParticipantProfile);

// Public or optionally-authenticated participant profile view
router.get("/participant/:id", optionalAuth, userController.getParticipantProfile);

// Public or optionally-authenticated organizer profile view
router.get("/organizer/:id", optionalAuth, userController.getOrganizerProfile);

// Authenticated organizer profile update
router.put("/profile/organizer", requireAuth, requireOrganizer, userController.updateOwnOrganizerProfile);

module.exports = router;
