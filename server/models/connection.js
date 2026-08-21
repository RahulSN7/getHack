// ---------------------------------------------------------------------------
// server/models/connection.js — Mongoose Connection Request Model for getHack
// Stores connection requests between participants with optional notes
// ---------------------------------------------------------------------------

const mongoose = require("mongoose");

const connectionSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender is required"],
    },

    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Receiver is required"],
    },

    note: {
      type: String,
      default: null,
      maxlength: [300, "Note cannot exceed 300 characters"],
      trim: true,
    },

    status: {
      type: String,
      enum: {
        values: ["pending", "accepted", "rejected"],
        message: "Status must be 'pending', 'accepted', or 'rejected'",
      },
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

// Index to quickly search pair connections and prevent duplicate active requests
connectionSchema.index({ sender: 1, receiver: 1 });
connectionSchema.index({ receiver: 1, status: 1 });

module.exports = mongoose.model("Connection", connectionSchema);
