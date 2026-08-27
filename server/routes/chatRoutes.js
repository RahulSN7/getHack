// ---------------------------------------------------------------------------
// server/routes/chatRoutes.js — Chat API Routes
// Provides Stream Chat token generation, user sync, and block/unblock endpoints.
// ---------------------------------------------------------------------------

const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware");
const { chatUpload } = require("../middleware/uploadMiddleware");
const {
    getStreamToken,
    ensureUser,
    checkChatAccess,
    blockUser,
    unblockUser,
    getBlockStatus,
    getChatStates,
    toggleFavourite,
    closeChat,
    reopenChat,
    uploadChatFile,
} = require("../controllers/chatController");

// GET /api/chat/token — Generate Stream Chat token for current user
router.get("/token", requireAuth, getStreamToken);

// GET /api/chat/access/:userId — Verify accepted connection & block authorization
router.get("/access/:userId", requireAuth, checkChatAccess);

// POST /api/chat/ensure-user — Upsert target user into Stream Chat
router.post("/ensure-user", requireAuth, ensureUser);

// POST /api/chat/block/:userId — Block target user
router.post("/block/:userId", requireAuth, blockUser);

// POST /api/chat/unblock/:userId — Unblock target user
router.post("/unblock/:userId", requireAuth, unblockUser);

// GET /api/chat/block-status/:userId — Get block status for target user
router.get("/block-status/:userId", requireAuth, getBlockStatus);

// GET /api/chat/states — Get all chat states (favourites & closed) for current user
router.get("/states", requireAuth, getChatStates);

// POST /api/chat/favourite — Toggle favourite status for a channel
router.post("/favourite", requireAuth, toggleFavourite);

// POST /api/chat/close — Close a conversation for current user
router.post("/close", requireAuth, closeChat);

// POST /api/chat/reopen — Reopen a closed conversation for current user
router.post("/reopen", requireAuth, reopenChat);

// POST /api/chat/upload — Server fallback file upload endpoint for chat attachments
router.post("/upload", requireAuth, chatUpload.single("file"), uploadChatFile);

module.exports = router;
