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
    clearChat,
    createGroup,
    getUserGroups,
    getUserRemovedGroups,
    getGroupById,
    updateGroupDescription,
    addGroupMembers,
    removeGroupMember,
    updateGroupName,
    updateGroupAvatar,
    exitGroup,
    deleteGroupForMe,
} = require("../controllers/chatController");

// GET /api/chat/groups — Fetch user's persistent groups from MongoDB
router.get("/groups", requireAuth, getUserGroups);

// GET /api/chat/groups/removed — Fetch groups from which user was removed (read-only)
router.get("/groups/removed", requireAuth, getUserRemovedGroups);

// POST /api/chat/groups — Create a persistent group chat
router.post("/groups", requireAuth, createGroup);

// GET /api/chat/groups/:groupId — Fetch single group info
router.get("/groups/:groupId", requireAuth, getGroupById);

// PATCH /api/chat/groups/:groupId/name — Admin-only group name update
router.patch("/groups/:groupId/name", requireAuth, updateGroupName);

// PATCH /api/chat/groups/:groupId/description — Update group description
router.patch("/groups/:groupId/description", requireAuth, updateGroupDescription);

// POST /api/chat/groups/:groupId/members — Add members to existing group
router.post("/groups/:groupId/members", requireAuth, addGroupMembers);

// DELETE /api/chat/groups/:groupId/members/:memberId — Admin-only member removal
router.delete("/groups/:groupId/members/:memberId", requireAuth, removeGroupMember);

// PATCH /api/chat/groups/:groupId/avatar — Admin-only avatar update
router.patch("/groups/:groupId/avatar", requireAuth, updateGroupAvatar);

// POST /api/chat/groups/:groupId/exit — Exit group chat
router.post("/groups/:groupId/exit", requireAuth, exitGroup);

// POST /api/chat/groups/:groupId/delete-for-me — Delete group for current user only
router.post("/groups/:groupId/delete-for-me", requireAuth, deleteGroupForMe);

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

// POST /api/chat/clear — Clear all messages in a conversation for both participants
router.post("/clear", requireAuth, clearChat);

// POST /api/chat/upload — Server fallback file upload endpoint for chat attachments
router.post("/upload", requireAuth, chatUpload.single("file"), uploadChatFile);

module.exports = router;
