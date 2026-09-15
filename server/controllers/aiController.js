
// server/controllers/aiController.js — Controller for GetHack AI Endpoints


const crypto = require("crypto");
const AiConversation = require("../models/aiConversation");
const { runAgentLoop } = require("../services/agentEngine");

/**
 * POST /api/ai/chat — Primary AI Chat & Goal Execution Endpoint
 */
const chatWithAI = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthenticated. Please log in." });
    }

    const { message, conversationId: reqConvId, context } = req.body || {};

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ success: false, message: "Message text is required." });
    }

    const cleanMessage = message.trim();
    let conversationId = reqConvId;

    let conversation = null;
    if (conversationId && typeof conversationId === "string") {
      conversation = await AiConversation.findOne({
        conversationId,
        userId: req.user._id,
      });
    }

    if (!conversation) {
      conversationId = `conv_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
      conversation = new AiConversation({
        userId: req.user._id,
        conversationId,
        title: cleanMessage.slice(0, 40),
        messages: [],
        context: context || {},
      });
    }

    // Record User Message
    conversation.messages.push({
      role: "user",
      content: cleanMessage,
      timestamp: new Date(),
    });

    // Execute Agent Loop
    const agentResult = await runAgentLoop({
      user: req.user,
      conversation,
      message: cleanMessage,
      context: context || {},
    });

    // Record Assistant Message
    conversation.messages.push({
      role: "assistant",
      content: agentResult.text,
      recommendations: agentResult.recommendations,
      pendingAction: agentResult.pendingAction,
      timestamp: new Date(),
    });

    await conversation.save();

    return res.status(200).json({
      success: true,
      conversationId,
      message: agentResult.text,
      recommendations: agentResult.recommendations,
      pendingAction: agentResult.pendingAction,
      toolResults: agentResult.toolResults,
      completedSteps: agentResult.completedSteps,
    });
  } catch (error) {
    console.error("[GetHack AI Controller Error]:", error);
    return res.status(500).json({
      success: false,
      message: "I couldn't complete that request right now. Please try again.",
    });
  }
};

/**
 * GET /api/ai/conversations — Fetch AI Conversation History List
 */
const getConversations = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthenticated." });
    }

    const conversations = await AiConversation.find({ userId: req.user._id })
      .select("conversationId title context createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .limit(20);

    return res.status(200).json({
      success: true,
      conversations,
    });
  } catch (error) {
    console.error("GET CONVERSATIONS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to load conversations." });
  }
};

/**
 * GET /api/ai/conversations/:id — Fetch Single Conversation Detail
 */
const getConversationById = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthenticated." });
    }

    const conversation = await AiConversation.findOne({
      conversationId: req.params.id,
      userId: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found." });
    }

    return res.status(200).json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.error("GET CONVERSATION BY ID ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to load conversation." });
  }
};

/**
 * DELETE /api/ai/conversations/:id — Delete Conversation
 */
const deleteConversation = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthenticated." });
    }

    await AiConversation.deleteOne({
      conversationId: req.params.id,
      userId: req.user._id,
    });

    return res.status(200).json({
      success: true,
      message: "Conversation deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE CONVERSATION ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to delete conversation." });
  }
};

module.exports = {
  chatWithAI,
  getConversations,
  getConversationById,
  deleteConversation,
};
