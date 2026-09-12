// ---------------------------------------------------------------------------
// server/routes/aiRoutes.js — Express Router for GetHack AI
// ---------------------------------------------------------------------------

const express = require("express");
const router = express.Router();
const aiController = require("../controllers/aiController");
const { requireAuth } = require("../middleware/authMiddleware");

// All AI endpoints require user authentication
router.post("/chat", requireAuth, aiController.chatWithAI);
router.get("/conversations", requireAuth, aiController.getConversations);
router.get("/conversations/:id", requireAuth, aiController.getConversationById);
router.delete("/conversations/:id", requireAuth, aiController.deleteConversation);

module.exports = router;
