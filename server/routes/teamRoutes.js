// ---------------------------------------------------------------------------
// server/routes/teamRoutes.js — Express Router for Team Management
// Defines endpoints for team creation, retrieval, and joining
// ---------------------------------------------------------------------------

const express = require("express");
const router = express.Router();
const { requireAuth, optionalAuth } = require("../middleware/authMiddleware");
const {
  createTeam,
  getTeams,
  getTeamById,
  joinTeam,
} = require("../controllers/teamController");

// Create team — requires authentication
router.post("/", requireAuth, createTeam);

// Get all teams — optional authentication
router.get("/", optionalAuth, getTeams);

// Get single team details by ID
router.get("/:id", optionalAuth, getTeamById);

// Join team — requires authentication
router.post("/:id/join", requireAuth, joinTeam);

module.exports = router;
