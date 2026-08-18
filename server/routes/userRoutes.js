// ---------------------------------------------------------------------------
// server/routes/userRoutes.js — Express Router for User & Organizer Profiles
// ---------------------------------------------------------------------------

const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { requireAuth, optionalAuth } = require("../middleware/authMiddleware");
const { requireOrganizer } = require("../middleware/roleMiddleware");

// Public or optionally-authenticated organizer profile view
router.get("/organizer/:id", optionalAuth, userController.getOrganizerProfile);

// Authenticated organizer profile update
router.put("/profile", requireAuth, requireOrganizer, userController.updateOwnOrganizerProfile);

module.exports = router;
