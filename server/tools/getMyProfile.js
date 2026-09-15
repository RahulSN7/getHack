
// server/tools/getMyProfile.js — get_my_profile Agent Tool
// Securely retrieves the authenticated user's GetHack profile details.


const mongoose = require("mongoose");
const User = require("../models/user");

/**
 * Tool Definition Schema (for Gemini / OpenAI function declarations)
 */
const getMyProfileDefinition = {
  name: "get_my_profile",
  description: "Retrieve the authenticated user's getHack profile details including role, skills, interests, experience level, location, and bio.",
  parameters: {
    type: "object",
    properties: {},
    required: [],
  },
};

/**
 * Execute get_my_profile tool
 * 
 * @param {Object} args - Tool parameters (empty)
 * @param {Object} context - Agent execution context containing authenticated user details
 * @returns {Promise<Object>} Structured user profile object
 */
async function getMyProfile(args = {}, context = {}) {
  try {
    const userId = context.userProfile?.id || context.user?._id?.toString() || context.user?.id;

    if (!userId) {
      // Fall back to context userProfile if DB lookup is unneeded or user ID missing
      const profile = context.userProfile || {};
      const skills = Array.isArray(profile.skills) ? profile.skills : [];
      const interests = Array.isArray(profile.interests) ? profile.interests : [];

      return {
        success: true,
        user: {
          id: profile.id || "unauthenticated",
          name: profile.name || "User",
          role: profile.role || "participant",
          headline: profile.headline || profile.role || "Developer",
          skills,
          interests,
          experienceLevel: profile.experienceLevel || "Intermediate",
          location: profile.location || "",
          bio: profile.bio || "",
        },
        isProfileComplete: skills.length > 0 || interests.length > 0,
      };
    }

    if (mongoose.connection.readyState === 1) {
      const dbUser = await User.findById(userId);
      if (dbUser) {
        const safeUser = dbUser.toSafeUser ? dbUser.toSafeUser() : dbUser;
        const p = safeUser.profile || {};
        const skills = Array.isArray(p.skills) ? p.skills : [];
        const interests = Array.isArray(p.interests) ? p.interests : [];

        return {
          success: true,
          user: {
            id: safeUser.id || userId,
            name: safeUser.name,
            email: safeUser.email,
            role: safeUser.role,
            headline: p.role || safeUser.role || "Developer",
            skills,
            interests,
            experienceLevel: p.experienceLevel || "Intermediate",
            location: p.location || "",
            bio: p.bio || "",
          },
          isProfileComplete: skills.length > 0 || interests.length > 0,
        };
      }
    }

    // Context fallback if database record is not found
    const profile = context.userProfile || {};
    const skills = Array.isArray(profile.skills) ? profile.skills : [];
    const interests = Array.isArray(profile.interests) ? profile.interests : [];

    return {
      success: true,
      user: {
        id: userId,
        name: profile.name || "User",
        role: profile.role || "participant",
        headline: profile.headline || profile.role || "Developer",
        skills,
        interests,
        experienceLevel: profile.experienceLevel || "Intermediate",
        location: profile.location || "",
        bio: profile.bio || "",
      },
      isProfileComplete: skills.length > 0 || interests.length > 0,
    };
  } catch (error) {
    console.error("[GetHack AI Tool Error: get_my_profile]:", error);
    return {
      success: false,
      error: "Unable to retrieve user profile",
    };
  }
}

module.exports = {
  getMyProfileDefinition,
  getMyProfile,
};
