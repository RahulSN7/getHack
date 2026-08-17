// ---------------------------------------------------------------------------
// server/middleware/authMiddleware.js — Authentication Verification Middleware
// Verifies JWT token from HTTP-only cookie or Authorization header.
// ---------------------------------------------------------------------------

const jwt = require("jsonwebtoken");
const User = require("../models/user");

const requireAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.token;

    // Fallback to Bearer token header if present
    if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ message: "Unauthenticated. Please log in." });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "gethack_super_secret_jwt_key_2026"
    );

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User account no longer exists." });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired session. Please log in again." });
  }
};

module.exports = { requireAuth };
