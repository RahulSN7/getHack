// ---------------------------------------------------------------------------
// server/tools/getMyNetwork.js — get_my_network Agent Tool
// Securely retrieves the authenticated user's accepted connection network.
// ---------------------------------------------------------------------------

const mongoose = require("mongoose");
const Connection = require("../models/connection");
const User = require("../models/user");

/**
 * Tool Definition Schema (for Gemini / OpenAI function declarations)
 */
const getMyNetworkDefinition = {
  name: "get_my_network",
  description: "Retrieve the authenticated user's accepted network connections.",
  parameters: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        description: "Maximum number of network connections to return (default: 10, max: 20)",
      },
    },
    required: [],
  },
};

/**
 * Execute get_my_network tool
 * 
 * @param {Object} args - Tool parameters
 * @param {Object} context - Execution context
 * @returns {Promise<Object>} Connected user profiles list
 */
async function getMyNetwork(args = {}, context = {}) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return {
        success: false,
        count: 0,
        error: "Database connection unavailable",
        connections: [],
      };
    }

    const currentUserId = context.userProfile?.id || context.user?._id?.toString() || context.user?.id;
    if (!currentUserId || !mongoose.Types.ObjectId.isValid(currentUserId)) {
      return {
        success: false,
        count: 0,
        error: "Authenticated user context required",
        connections: [],
      };
    }

    const limit = Math.min(Math.max(parseInt(args.limit, 10) || 10, 1), 20);

    const connectionsDocs = await Connection.find({
      $or: [{ sender: currentUserId }, { receiver: currentUserId }],
      status: "accepted",
    })
      .populate("sender", "name email role profile")
      .populate("receiver", "name email role profile")
      .limit(limit);

    const networkUsers = connectionsDocs
      .map((c) => {
        if (!c.sender || !c.receiver) return null;
        const isSender = c.sender._id.toString() === currentUserId.toString();
        const partnerDoc = isSender ? c.receiver : c.sender;
        if (!partnerDoc) return null;
        const safe = partnerDoc.toSafeUser ? partnerDoc.toSafeUser() : partnerDoc;
        const p = safe.profile || {};

        return {
          userId: safe.id || partnerDoc._id.toString(),
          name: safe.name,
          role: p.role || safe.role || "Developer",
          headline: p.role || "Network Connection",
          avatar: p.avatar || "",
          skills: Array.isArray(p.skills) ? p.skills : [],
          interests: Array.isArray(p.interests) ? p.interests : [],
          location: p.location || "",
          availability: p.availability || "Available",
          bio: p.bio || "",
          connectionStatus: "accepted",
        };
      })
      .filter(Boolean);

    return {
      success: true,
      count: networkUsers.length,
      connections: networkUsers,
      teammates: networkUsers,
    };
  } catch (error) {
    console.error("[GetHack AI Tool Error: get_my_network]:", error);
    return {
      success: false,
      count: 0,
      error: "Unable to retrieve network connections",
      connections: [],
    };
  }
}

module.exports = {
  getMyNetworkDefinition,
  getMyNetwork,
};
