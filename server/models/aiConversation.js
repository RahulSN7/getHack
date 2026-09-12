// ---------------------------------------------------------------------------
// server/models/aiConversation.js — Mongoose Model for AI Chat & State
// Stores persistent conversation history, context, and agent execution state.
// ---------------------------------------------------------------------------

const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant", "system", "tool"],
      required: true,
    },
    content: {
      type: String,
      default: "",
    },
    toolCalls: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    toolResults: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    recommendations: {
      hackathons: { type: [mongoose.Schema.Types.Mixed], default: [] },
      teammates: { type: [mongoose.Schema.Types.Mixed], default: [] },
    },
    pendingAction: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const aiConversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    conversationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      default: "New Chat",
    },
    messages: [messageSchema],
    context: {
      page: { type: String, default: "dashboard" },
      hackathonId: { type: String, default: null },
      targetUserId: { type: String, default: null },
    },
    agentState: {
      selectedHackathon: { type: mongoose.Schema.Types.Mixed, default: null },
      selectedUsers: { type: [mongoose.Schema.Types.Mixed], default: [] },
      pendingAction: { type: mongoose.Schema.Types.Mixed, default: null },
      completedSteps: { type: [String], default: [] },
    },
    userPreferences: {
      preferredMode: { type: String, default: "" },
      preferredSkills: { type: [String], default: [] },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("AiConversation", aiConversationSchema);
