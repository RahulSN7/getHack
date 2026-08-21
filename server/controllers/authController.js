// ---------------------------------------------------------------------------
// server/controllers/authController.js — Authentication Controllers
// Handles signup, login, getMe, and logout with strict single-role validation.
// ---------------------------------------------------------------------------

const jwt = require("jsonwebtoken");
const User = require("../models/user");

const JWT_SECRET = process.env.JWT_SECRET || "gethack_super_secret_jwt_key_2026";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// Generate JWT token for user
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "7d" });
};

// ── 1. SIGNUP ──
const signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};

    // Temporary development logging (without logging plain password)
    console.log("Signup request received:", {
      name,
      email,
      role,
    });

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Please provide name, email, password, and account role." });
    }

    // Normalize role string (convert e.g. Participant -> participant)
    const normalizedRole = typeof role === "string" ? role.toLowerCase().trim() : "";

    // Strict single role validation
    if (normalizedRole !== "participant" && normalizedRole !== "organizer") {
      return res.status(400).json({ message: "Please select a valid account role ('participant' or 'organizer')." });
    }

    // Validate email format
    const normalizedEmail = email.toLowerCase().trim();
    if (!/\S+@\S+\.\S+/.test(normalizedEmail)) {
      return res.status(400).json({ message: "Please provide a valid email address." });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long." });
    }

    // Check duplicate email explicitly
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    // Create user
    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: normalizedRole,
      profile: {},
    });

    // Generate JWT token & set cookie
    const token = generateToken(newUser._id);
    res.cookie("token", token, COOKIE_OPTIONS);

    return res.status(201).json({
      message: "Account created successfully",
      user: newUser.toSafeUser(),
      token, // Also returned for client fallback
    });
  } catch (error) {
    // ─────────────────────────────────────────────
    // Detailed development error logging
    // ─────────────────────────────────────────────
    console.error("====================================");
    console.error("SIGNUP ERROR");
    console.error("====================================");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    console.error("Full error:", error);
    console.error("====================================");

    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    // Handle Mongoose validation errors
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    // Development response
    return res.status(500).json({
      message: "Unable to create your account right now.",
      error: error.message,
    });
  }
};

const mongoose = require("mongoose");

// ── 2. LOGIN ──
const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: "Please enter both email and password." });
    }

    // Database Connection Guard
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        message: "Database connection is establishing. Please try again in a few seconds.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    // Generate JWT token & set cookie
    const token = generateToken(user._id);
    res.cookie("token", token, COOKIE_OPTIONS);

    return res.status(200).json({
      message: "Logged in successfully",
      user: user.toSafeUser(),
      token,
    });
  } catch (error) {
    console.error("Login controller error:", error);
    if (error.name === "MongooseError" || error.message?.includes("buffering timed out")) {
      return res.status(503).json({
        message: "Database query timed out. Please check network connection or MongoDB cluster status.",
      });
    }
    return res.status(500).json({ message: "An unexpected server error occurred during login." });
  }
};

// ── 3. GET CURRENT USER (ME) ──
const getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthenticated." });
    }

    return res.status(200).json({
      user: req.user.toSafeUser(),
    });
  } catch (error) {
    console.error("GetMe controller error:", error);
    return res.status(500).json({ message: "Server error fetching user profile." });
  }
};

// ── 4. LOGOUT ──
const logout = async (req, res) => {
  try {
    res.clearCookie("token", COOKIE_OPTIONS);
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout controller error:", error);
    return res.status(500).json({ message: "Server error during logout." });
  }
};

module.exports = {
  signup,
  login,
  getMe,
  logout,
};
