
// server/tools/getHackathonDetails.js — get_hackathon_details Agent Tool
// Retrieves full details for a specific hackathon by ID, slug, or title keyword.


const mongoose = require("mongoose");
const Hackathon = require("../models/hackathon");

/**
 * Tool Definition Schema (for Gemini / OpenAI function declarations)
 */
const getHackathonDetailsDefinition = {
  name: "get_hackathon_details",
  description: "Retrieve full details, themes, requirements, dates, and technologies for a specific hackathon by ID, slug, or title.",
  parameters: {
    type: "object",
    properties: {
      hackathonId: {
        type: "string",
        description: "The unique hackathon ID, URL slug, or title keywords (e.g. 'delhi-ai-2026', '6a85a15188e78b8ffa6bdd04')",
      },
    },
    required: ["hackathonId"],
  },
};

/**
 * Execute get_hackathon_details tool
 * 
 * @param {Object} args - Tool parameters
 * @param {string} args.hackathonId - ID, slug, or title
 * @param {Object} context - Execution context
 * @returns {Promise<Object>} Hackathon details object
 */
async function getHackathonDetails(args = {}, context = {}) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return {
        success: false,
        error: "Database connection unavailable",
      };
    }

    const { hackathonId } = args;
    const targetId = hackathonId || context.hackathonId;

    if (!targetId || typeof targetId !== "string" || !targetId.trim()) {
      return {
        success: false,
        error: "Hackathon identifier is required",
      };
    }

    const cleanId = targetId.trim();
    let hackathon = null;

    if (mongoose.Types.ObjectId.isValid(cleanId)) {
      hackathon = await Hackathon.findById(cleanId);
    }

    if (!hackathon) {
      hackathon = await Hackathon.findOne({ slug: cleanId });
    }

    if (!hackathon) {
      hackathon = await Hackathon.findOne({ title: new RegExp(cleanId, "i") });
    }

    if (!hackathon) {
      return {
        success: false,
        error: `Hackathon '${cleanId}' not found`,
      };
    }

    const doc = hackathon.toJSON ? hackathon.toJSON() : hackathon;

    return {
      success: true,
      hackathon: {
        id: doc.id || doc._id?.toString(),
        title: doc.title,
        shortDescription: doc.shortDescription || "",
        description: doc.description || "",
        mode: doc.format || doc.event?.mode || "Online",
        location: doc.location?.city ? `${doc.location.city}, ${doc.location.country || ""}`.trim() : (doc.location?.venue || "Online"),
        registrationDeadline: doc.registrationDeadline || doc.registration?.deadline || null,
        startDate: doc.startDate || doc.event?.startDate || null,
        endDate: doc.endDate || doc.event?.endDate || null,
        skills: doc.skills || [],
        themes: doc.themes || [],
        requirements: doc.requirements || [],
        prizePool: doc.prizePool?.description || doc.prizes || "Prizes & Recognition",
        registrationUrl: doc.registrationUrl || doc.registration?.url || "",
        platform: doc.source?.platform || "gethack",
        organizerName: doc.organizerName || doc.organizer?.name || "Organizer",
        eligibility: doc.eligibility || "Open to all participants",
      },
    };
  } catch (error) {
    console.error("[GetHack AI Tool Error: get_hackathon_details]:", error);
    return {
      success: false,
      error: "Unable to retrieve hackathon details",
    };
  }
}

module.exports = {
  getHackathonDetailsDefinition,
  getHackathonDetails,
};
