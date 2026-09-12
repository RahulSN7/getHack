// ---------------------------------------------------------------------------
// server/tools/getUserProfile.js — get_user_profile Agent Tool
// Securely retrieves public profile details for a specific GetHack participant.
// ---------------------------------------------------------------------------

const mongoose = require("mongoose");
const User = require("../models/user");

/**
 * Tool Definition Schema (for Gemini / OpenAI function declarations)
 */
const getUserProfileDefinition = {
  name: "get_user_profile",
  description: "Retrieve public profile details for a candidate participant user by ID or handle.",
  parameters: {
    type: "object",
    properties: {
      userId: {
        type: "string",
        description: "The target user's MongoDB ID or handle (e.g. '6a9c5ea62e3ceb6c0bff8784', 'GH-123456')",
      },
    },
    required: ["userId"],
  },
};

/**
 * Execute get_user_profile tool
 * 
 * @param {Object} args - Tool arguments
 * @param {string} args.userId - Candidate user ID or handle
 * @param {Object} context - Execution context
 * @returns {Promise<Object>} Public user profile object
 */
async function getUserProfile(args = {}, context = {}) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return {
        success: false,
        error: "Database connection unavailable",
      };
    }

    const { userId } = args;

    if (!userId || typeof userId !== "string" || !userId.trim()) {
      return {
        success: false,
        error: "User identifier is required",
      };
    }

    const cleanId = userId.trim();
    let targetUser = null;

    if (mongoose.Types.ObjectId.isValid(cleanId)) {
      targetUser = await User.findById(cleanId);
    }

    if (!targetUser) {
      targetUser = await User.findOne({ "profile.handle": cleanId });
    }

    if (!targetUser) {
      return {
        success: false,
        error: `User '${cleanId}' not found`,
      };
    }

    const safeUser = targetUser.toSafeUser ? targetUser.toSafeUser() : targetUser;
    const p = safeUser.profile || {};

    return {
      success: true,
      user: {
        userId: safeUser.id || targetUser._id.toString(),
        name: safeUser.name,
        role: safeUser.role,
        headline: p.role || safeUser.role || "Developer",
        avatar: p.avatar || "",
        skills: Array.isArray(p.skills) ? p.skills : [],
        interests: Array.isArray(p.interests) ? p.interests : [],
        experienceLevel: p.experienceLevel || "Intermediate",
        location: p.location || "",
        availability: p.availability || "Available",
        bio: p.bio || "",
        github: p.github || "",
        linkedin: p.linkedin || "",
        portfolio: p.portfolio || "",
      },
    };
  } catch (error) {
    console.error("[GetHack AI Tool Error: get_user_profile]:", error);
    return {
      success: false,
      error: "Unable to retrieve user profile",
    };
  }
}

module.exports = {
  getUserProfileDefinition,
  getUserProfile,
};
