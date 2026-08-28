// ---------------------------------------------------------------------------
// server/models/teamInvitation.js — Mongoose Team Invitation Model for getHack
// Stores team invitations sent directly via Stream Chat conversations
// ---------------------------------------------------------------------------

const mongoose = require("mongoose");

const teamInvitationSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },

    teamName: {
      type: String,
      required: true,
      trim: true,
    },

    hackathonName: {
      type: String,
      trim: true,
      default: "Hackathon",
    },

    hackathonId: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },

    streamMessageId: {
      type: String,
      trim: true,
      default: "",
    },

    streamChannelCid: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

teamInvitationSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    return ret;
  },
});

module.exports = mongoose.model("TeamInvitation", teamInvitationSchema);
