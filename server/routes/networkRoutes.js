// ---------------------------------------------------------------------------
// server/routes/networkRoutes.js — Express Router for Network & Connection Requests
// ---------------------------------------------------------------------------

const express = require("express");
const router = express.Router();
const networkController = require("../controllers/networkController");
const { requireAuth } = require("../middleware/authMiddleware");

// All network endpoints require authentication
router.post("/requests", requireAuth, networkController.sendConnectionRequest);
router.get("/requests", requireAuth, networkController.getNetworkRequests);
router.put("/requests/:id", requireAuth, networkController.respondToConnectionRequest);
router.delete("/requests/:id", requireAuth, networkController.cancelConnectionRequest);

module.exports = router;
