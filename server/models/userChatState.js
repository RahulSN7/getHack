// ---------------------------------------------------------------------------
// server/models/userChatState.js — Per-User Chat State & Preferences
// Tracks per-user favorite status and closed (archived) status for channels.
// ---------------------------------------------------------------------------

const mongoose = require("mongoose");

const userChatStateSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    channelCid: {
      type: String,
      required: true,
      index: true,
    },
    targetUserId: {
      type: String,
      default: "",
    },
    isFavourite: {
      type: Boolean,
      default: false,
    },
    isClosed: {
      type: Boolean,
      default: false,
    },
    closedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure single state record per user per channel
userChatStateSchema.index({ user: 1, channelCid: 1 }, { unique: true });

module.exports = mongoose.model("UserChatState", userChatStateSchema);
