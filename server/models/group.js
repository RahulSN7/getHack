// ---------------------------------------------------------------------------
// server/models/group.js — Mongoose Group Chat Model for getHack
// Stores persistent group chat identity, membership, and Stream Chat channel ID
// ---------------------------------------------------------------------------

const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Group name is required"],
      trim: true,
    },

    avatar: {
      type: String,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    // Users who were removed by the admin — kept for read-only chat history access
    removedMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Tracks membership intervals (joinedAt, removedAt) for WhatsApp-style chat history filtering
    memberHistory: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        removedAt: {
          type: Date,
          default: null,
        },
      },
    ],

    // Users who deleted this group conversation for themselves (Delete Group for Me)
    deletedForUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    streamChannelId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure virtual 'id' is serialized
groupSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    return ret;
  },
});

module.exports = mongoose.model("Group", groupSchema);
