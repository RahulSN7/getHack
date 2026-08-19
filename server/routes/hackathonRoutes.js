// ---------------------------------------------------------------------------
// server/routes/hackathonRoutes.js — Express Router for Hackathons
// Exposes public discovery endpoints, organizer management, and admin sync trigger.
// ---------------------------------------------------------------------------

const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware");
const { requireOrganizer } = require("../middleware/roleMiddleware");
const {
  createHackathon,
  getPublicHackathons,
  getUpcomingHackathons,
  getActiveHackathons,
  getRegistrationOpenHackathons,
  getMyHackathons,
  getHackathonById,
  getOrganizerHackathonById,
  updateHackathon,
  deleteHackathon,
  triggerSync,
} = require("../controllers/hackathonController");

// Public list & status-filtered discovery endpoints
router.get("/", getPublicHackathons);
router.get("/upcoming", getUpcomingHackathons);
router.get("/active", getActiveHackathons);
router.get("/registration-open", getRegistrationOpenHackathons);

// Manual sync trigger endpoint (available for organizer/admin)
router.post("/sync", requireAuth, requireOrganizer, triggerSync);

// Organizer my hackathons endpoints (must come before /:id)
router.get("/my", requireAuth, requireOrganizer, getMyHackathons);
router.get("/organizer/:id", requireAuth, requireOrganizer, getOrganizerHackathonById);

// Public single hackathon view endpoint (by ID or slug)
router.get("/:id", getHackathonById);

// Organizer mutation endpoints (require authentication & organizer role)
router.post("/", requireAuth, requireOrganizer, createHackathon);
router.put("/:id", requireAuth, requireOrganizer, updateHackathon);
router.delete("/:id", requireAuth, requireOrganizer, deleteHackathon);

module.exports = router;
