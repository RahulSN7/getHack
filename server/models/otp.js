// ---------------------------------------------------------------------------
// server/models/otp.js — Mongoose OTP Schema for Email Verification
// Stores hashed 6-digit OTPs with automatic TTL expiration & attempt tracking.
// ---------------------------------------------------------------------------

const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // Automatically deleted by MongoDB when expiresAt date is reached
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastSentAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Otp", otpSchema);
