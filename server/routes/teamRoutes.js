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
  getMyTeams,
  getTeamById,
  updateTeam,
  joinTeam,
  leaveTeam,
} = require("../controllers/teamController");

const {
  sendTeamRequest,
  getIncomingRequests,
  getSentRequests,
  acceptRequest,
  rejectRequest,
  cancelRequest,
} = require("../controllers/teamRequestController");

// Create team — requires authentication
router.post("/", requireAuth, createTeam);

// Get all teams — optional authentication
router.get("/", optionalAuth, getTeams);

// Get my teams (leader or member)
router.get("/my-teams", requireAuth, getMyTeams);

// Team requests endpoints
router.get("/requests/incoming", requireAuth, getIncomingRequests);
router.get("/requests/sent", requireAuth, getSentRequests);
router.post("/:teamId/requests", requireAuth, sendTeamRequest);
router.patch("/requests/:id/accept", requireAuth, acceptRequest);
router.patch("/requests/:id/reject", requireAuth, rejectRequest);
router.patch("/requests/:id/cancel", requireAuth, cancelRequest);

// Get single team details by ID
router.get("/:id", optionalAuth, getTeamById);

// Edit team — team leader only
router.put("/:id", requireAuth, updateTeam);

// Join team — direct join request handler
router.post("/:id/join", requireAuth, joinTeam);

// Leave team — non-leader member
router.post("/:id/leave", requireAuth, leaveTeam);

module.exports = router;
