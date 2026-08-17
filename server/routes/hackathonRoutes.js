// ---------------------------------------------------------------------------
// server/routes/hackathonRoutes.js — Express Router for Hackathons
// Protects organizer endpoints with authentication and organizer role checks.
// ---------------------------------------------------------------------------

const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware");
const { requireOrganizer } = require("../middleware/roleMiddleware");
const {
  createHackathon,
  getPublicHackathons,
  getMyHackathons,
  getHackathonById,
  getOrganizerHackathonById,
  updateHackathon,
  deleteHackathon,
} = require("../controllers/hackathonController");

// Public endpoints
router.get("/", getPublicHackathons);

// Organizer my hackathons endpoints (must come before /:id)
router.get("/my", requireAuth, requireOrganizer, getMyHackathons);
router.get("/organizer/:id", requireAuth, requireOrganizer, getOrganizerHackathonById);

// Public single hackathon view endpoint
router.get("/:id", getHackathonById);

// Organizer mutation endpoints (require authentication & organizer role)
router.post("/", requireAuth, requireOrganizer, createHackathon);
router.put("/:id", requireAuth, requireOrganizer, updateHackathon);
router.delete("/:id", requireAuth, requireOrganizer, deleteHackathon);

module.exports = router;
