// ---------------------------------------------------------------------------
// server/routes/authRoutes.js — Express Router for OTP Authentication APIs
// ---------------------------------------------------------------------------

const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");

// Public OTP authentication endpoints
router.post("/send-otp", authController.sendOtp);
router.post("/verify-otp", authController.verifyOtp);

// Google OAuth endpoints
router.post("/google", authController.googleAuth);
router.get("/google", authController.googleRedirect);
router.get("/google/callback", authController.googleCallback);

// Public session logout endpoint
router.post("/logout", authController.logout);

// Protected current user endpoint
router.get("/me", requireAuth, authController.getMe);

module.exports = router;
