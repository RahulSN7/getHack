// ---------------------------------------------------------------------------
// server/routes/invitationRoutes.js — Express Router for Team Invitations
// Defines endpoints for sending and responding to team invitations via Stream Chat
// ---------------------------------------------------------------------------

const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware");
const {
  sendInvitation,
  sendGroupInvitation,
  respondToInvitation,
  getInvitation,
} = require("../controllers/invitationController");

// POST /api/invitations/send — Send team invitation to connection via Stream Chat
router.post("/send", requireAuth, sendInvitation);

// POST /api/invitations/send-group — Send team invitation to group chat via Stream Chat
router.post("/send-group", requireAuth, sendGroupInvitation);

// PATCH /api/invitations/:id/respond — Accept or Reject team invitation
router.patch("/:id/respond", requireAuth, respondToInvitation);

// GET /api/invitations/:id — Get invitation details
router.get("/:id", requireAuth, getInvitation);

module.exports = router;
