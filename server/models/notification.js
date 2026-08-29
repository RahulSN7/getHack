// ---------------------------------------------------------------------------
// server/models/notification.js — Mongoose Notification Model for getHack
// Stores user notifications with controlled types, entity references & metadata
// ---------------------------------------------------------------------------

const mongoose = require("mongoose");

const NOTIFICATION_TYPES = [
  "CONNECTION_REQUEST",
  "CONNECTION_ACCEPTED",
  "CONNECTION_REJECTED",
  "NEW_CONNECTION",

  "TEAM_INVITATION",
  "TEAM_INVITATION_ACCEPTED",
  "TEAM_INVITATION_REJECTED",
  "TEAM_MEMBER_ADDED",
  "TEAM_MEMBER_REMOVED",

  "NEW_MESSAGE",
  "MESSAGE_REPLY",

  "SAVED_HACKATHON_UPDATE",
  "SAVED_HACKATHON_DEADLINE",

  "REGISTRATION_HACAKATHON_UPDATE",
];

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Recipient is required"],
      index: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    type: {
      type: String,
      required: [true, "Notification type is required"],
      enum: {
        values: NOTIFICATION_TYPES,
        message: "Invalid notification type: {VALUE}",
      },
      index: true,
    },

    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },

    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
    },

    entityType: {
      type: String,
      default: null,
    },

    entityId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Useful Compound Indexes for efficient querying
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);

module.exports = Notification;
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
