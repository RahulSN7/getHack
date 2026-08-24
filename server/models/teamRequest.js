// ---------------------------------------------------------------------------
// server/models/teamRequest.js — Mongoose Team Request Model for getHack
// Stores person-to-team join requests, leader references, and request state
// ---------------------------------------------------------------------------

const mongoose = require("mongoose");

const teamRequestSchema = new mongoose.Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },

    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    teamLeader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled"],
      default: "pending",
    },

    note: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Populate virtual id field
teamRequestSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    return ret;
  },
});

module.exports = mongoose.model("TeamRequest", teamRequestSchema);
