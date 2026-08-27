// ---------------------------------------------------------------------------
// server/models/team.js — Mongoose Team Model for getHack
// Stores hackathon teams, creator/leader references, and member lists
// ---------------------------------------------------------------------------

const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema(
  {
    teamName: {
      type: String,
      required: [true, "Team name is required"],
      trim: true,
    },

    hackathon: {
      type: String,
      required: true,
      default: "general",
    },

    hackathonName: {
      type: String,
      required: [true, "Hackathon name is required"],
      trim: true,
    },

    hackathonLink: {
      type: String,
      trim: true,
      default: "",
    },

    hackathonDates: {
      type: String,
      trim: true,
      default: "",
    },

    startDate: {
      type: Date,
    },

    endDate: {
      type: Date,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    lookingForDescription: {
      type: String,
      trim: true,
      default: "",
    },

    rolesNeeded: {
      type: [String],
      default: [],
    },

    techStack: {
      type: [String],
      default: [],
    },

    currentSize: {
      type: Number,
      default: 1,
    },

    maxSize: {
      type: Number,
      default: 4,
    },

    location: {
      type: String,
      default: "Online",
    },

    accent: {
      type: String,
      default: "indigo",
    },

    status: {
      type: String,
      enum: ["Recruiting", "Full", "Closed", "Completed"],
      default: "Recruiting",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    leader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          default: "Member",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    memberIds: [
      {
        type: String,
      },
    ],

    pendingInvitationIds: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Ensure virtual 'id' is serialized
teamSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    return ret;
  },
});

module.exports = mongoose.model("Team", teamSchema);
