// ---------------------------------------------------------------------------
// server/routes/authRoutes.js — Express Router for Authentication APIs
// ---------------------------------------------------------------------------

const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");

// Public auth endpoints
router.post("/signup", (req, res, next) => {
  console.log("🔥 SIGNUP ROUTE HIT");

  console.log("Signup body:", {
    name: req.body?.name,
    email: req.body?.email,
    role: req.body?.role,
  });

  next();
}, authController.signup);
router.post("/login", authController.login);
router.post("/logout", authController.logout);

// Protected current user endpoint
router.get("/me", requireAuth, authController.getMe);

module.exports = router;
