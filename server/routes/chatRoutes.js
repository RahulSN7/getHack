// ---------------------------------------------------------------------------
// server/routes/chatRoutes.js — Chat API Routes
// Provides Stream Chat token generation for authenticated users.
// ---------------------------------------------------------------------------

const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware");
const { getStreamToken } = require("../controllers/chatController");

// GET /api/chat/token — Generate Stream Chat token for current user
router.get("/token", requireAuth, getStreamToken);

module.exports = router;
