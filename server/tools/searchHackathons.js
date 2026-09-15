
// server/tools/searchHackathons.js — search_hackathons Agent Tool
// Executes searches on the real GetHack Hackathon MongoDB database.


const mongoose = require("mongoose");
const Hackathon = require("../models/hackathon");

/**
 * Tool Definition Schema (for Gemini / OpenAI function declarations)
 */
const searchHackathonsDefinition = {
  name: "search_hackathons",
  description: "Search for real hackathons in the getHack database based on skills, mode, status, location, or search keywords.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query keywords (e.g. 'AI', 'React', 'Machine Learning', title or theme)",
      },
      skills: {
        type: "array",
        items: { type: "string" },
        description: "List of technology skills required (e.g. ['React', 'Node.js', 'Python', 'AI'])",
      },
      interests: {
        type: "array",
        items: { type: "string" },
        description: "List of hackathon themes/interests (e.g. ['AI', 'Web3', 'Open Source', 'Social Good'])",
      },
      mode: {
        type: "string",
        enum: ["online", "offline", "any"],
        description: "Event delivery mode: 'online', 'offline' (includes hybrid), or 'any'",
      },
      status: {
        type: "string",
        enum: ["registration_open", "upcoming", "live", "completed", "any"],
        description: "Registration/event status: 'registration_open', 'upcoming', 'live', 'completed', or 'any'",
      },
      location: {
        type: "string",
        description: "Location keyword or city name (e.g. 'Delhi', 'New York', 'India')",
      },
      limit: {
        type: "number",
        description: "Maximum number of hackathons to return (default: 10, max: 20)",
      },
    },
    required: [],
  },
};

/**
 * Execute search_hackathons tool
 * 
 * @param {Object} args - Structured tool parameters
 * @param {string} [args.query]
 * @param {Array<string>} [args.skills]
 * @param {Array<string>} [args.interests]
 * @param {string} [args.mode] - "online" | "offline" | "any"
 * @param {string} [args.status] - "registration_open" | "upcoming" | "live" | "completed" | "any"
 * @param {string} [args.location]
 * @param {number} [args.limit]
 * @returns {Promise<Object>} Structured tool result object
 */
async function searchHackathons(args = {}) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return {
        success: false,
        count: 0,
        error: "Unable to search hackathons (Database connection unavailable)",
        hackathons: [],
      };
    }

    const {
      query: queryText,
      skills,
      interests,
      mode,
      status,
      location,
      limit: reqLimit,
    } = args;

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 1. Fetch all active/upcoming hackathons from MongoDB
    const baseQuery = {
      $or: [
        { expiresAt: { $gt: now } },
        {
          $and: [
            { expiresAt: { $exists: false } },
            {
              $or: [
                { registrationDeadline: { $gt: twentyFourHoursAgo } },
                { "registration.deadline": { $gt: twentyFourHoursAgo } },
                { registrationDeadline: { $exists: false } },
                { registrationDeadline: null },
              ],
            },
          ],
        },
      ],
    };

    if (status && status.toLowerCase() !== "any") {
      const s = status.toLowerCase();
      if (s === "upcoming") {
        baseQuery.registrationOpens = { $gt: now };
      } else if (s === "registration_open" || s === "registration-open" || s === "open") {
        baseQuery.registrationDeadline = { $gte: now };
      } else if (s === "registration-closed" || s === "closed") {
        baseQuery.registrationDeadline = { $lt: now };
        baseQuery.startDate = { $gt: now };
      } else if (s === "live" || s === "active") {
        baseQuery.startDate = { $lte: now };
        baseQuery.endDate = { $gte: now };
      } else if (s === "completed") {
        baseQuery.endDate = { $lt: now };
      }
    }

    const allHackathons = await Hackathon.find(baseQuery);
    const totalAvailable = allHackathons.length;

    console.log("\n[AI HACKATHON SEARCH]");
    console.log(`User query args: ${JSON.stringify(args)}`);
    console.log(`Total active/upcoming hackathons in DB: ${totalAvailable}`);

    if (totalAvailable === 0) {
      return {
        success: true,
        count: 0,
        totalAvailable: 0,
        hasExactProfileMatch: false,
        hackathons: [],
      };
    }

    // 2. Rank hackathons based on requested parameters & profile relevance
    let hasExactProfileMatch = false;

    const scoredHackathons = allHackathons.map((h) => {
      let score = 0;
      const doc = h.toJSON ? h.toJSON() : h;
      const hTitle = (doc.title || "").toLowerCase();
      const hDesc = (doc.shortDescription || doc.description || "").toLowerCase();
      const hSkills = (doc.skills || []).map((s) => String(s).toLowerCase());
      const hThemes = (doc.themes || []).map((t) => String(t).toLowerCase());
      const hMode = (doc.format || doc.event?.mode || "Online").toLowerCase();
      const hLoc = (doc.location?.city || doc.location?.venue || doc.event?.venue || "").toLowerCase();

      // Explicit Skills Match
      if (Array.isArray(skills) && skills.length > 0) {
        skills.forEach((sk) => {
          const cleanSk = sk.toLowerCase().trim();
          if (hSkills.some((s) => s.includes(cleanSk) || cleanSk.includes(s))) {
            score += 15;
            hasExactProfileMatch = true;
          } else if (hThemes.some((t) => t.includes(cleanSk) || cleanSk.includes(t))) {
            score += 10;
            hasExactProfileMatch = true;
          } else if (hTitle.includes(cleanSk) || hDesc.includes(cleanSk)) {
            score += 5;
          }
        });
      }

      // Explicit Interests / Themes Match
      if (Array.isArray(interests) && interests.length > 0) {
        interests.forEach((intr) => {
          const cleanIntr = intr.toLowerCase().trim();
          if (hThemes.some((t) => t.includes(cleanIntr) || cleanIntr.includes(t))) {
            score += 15;
            hasExactProfileMatch = true;
          } else if (hTitle.includes(cleanIntr) || hDesc.includes(cleanIntr)) {
            score += 8;
          }
        });
      }

      // Explicit Query Keyword Match
      if (queryText && typeof queryText === "string" && queryText.trim()) {
        const q = queryText.toLowerCase().trim();
        if (hTitle.includes(q)) score += 15;
        else if (hDesc.includes(q)) score += 8;
      }

      // Mode Match
      if (mode && mode.toLowerCase() !== "any") {
        const m = mode.toLowerCase();
        if (m === "online" && hMode.includes("online")) score += 10;
        else if (m === "offline" && (hMode.includes("offline") || hMode.includes("hybrid"))) score += 10;
      }

      // Location Match
      if (location && typeof location === "string" && location.trim()) {
        const loc = location.toLowerCase().trim();
        if (hLoc.includes(loc)) score += 10;
      }

      // Recency / Deadline boost (Nearer upcoming deadline gets slight priority)
      if (doc.registrationDeadline) {
        const deadlineDate = new Date(doc.registrationDeadline);
        if (deadlineDate >= now) {
          const daysLeft = (deadlineDate - now) / (1000 * 60 * 60 * 24);
          if (daysLeft <= 14) score += 5;
          else score += 2;
        }
      }

      return { hackathon: h, score };
    });

    // 3. Filter / Sort Hackathons:
    // If explicit mode or location was strictly requested, enforce soft filtering if candidates exist
    let filteredScored = [...scoredHackathons];

    if (mode && mode.toLowerCase() !== "any") {
      const targetMode = mode.toLowerCase();
      const modeMatches = filteredScored.filter((item) => {
        const m = (item.hackathon.format || item.hackathon.event?.mode || "Online").toLowerCase();
        return targetMode === "online" ? m.includes("online") : (m.includes("offline") || m.includes("hybrid"));
      });
      if (modeMatches.length > 0) filteredScored = modeMatches;
    }

    if (location && typeof location === "string" && location.trim()) {
      const targetLoc = location.toLowerCase().trim();
      const locMatches = filteredScored.filter((item) => {
        const l = (item.hackathon.location?.city || item.hackathon.location?.venue || item.hackathon.event?.venue || "").toLowerCase();
        return l.includes(targetLoc);
      });
      if (locMatches.length > 0) filteredScored = locMatches;
    }

    filteredScored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(a.hackathon.registrationDeadline || 0) - new Date(b.hackathon.registrationDeadline || 0);
    });

    const candidatesAfterFilters = filteredScored.length;

    // Apply Display Selection Rule:
    // <= 5 hackathons -> return ALL
    // > 5 hackathons  -> rank and return BEST 5
    const displayLimit = candidatesAfterFilters <= 5 ? candidatesAfterFilters : 5;
    const selectedHackathons = filteredScored.slice(0, displayLimit);

    console.log(`Hackathons after filters: ${candidatesAfterFilters}`);
    console.log(`Hackathons selected for display: ${selectedHackathons.length}\n`);

    // Format clean structured result payload
    const formattedHackathons = selectedHackathons.map((item) => {
      const h = item.hackathon;
      const doc = h.toJSON ? h.toJSON() : h;
      return {
        id: doc.id || doc._id?.toString(),
        title: doc.title,
        description: doc.shortDescription || doc.description?.substring(0, 200) || "",
        registrationDeadline: doc.registrationDeadline || doc.registration?.deadline || null,
        startDate: doc.startDate || doc.event?.startDate || null,
        endDate: doc.endDate || doc.event?.endDate || null,
        mode: doc.format || doc.event?.mode || "Online",
        location: doc.location?.city ? `${doc.location.city}, ${doc.location.country || ""}`.trim() : (doc.location?.venue || doc.event?.venue || "Online"),
        skills: doc.skills || [],
        themes: doc.themes || [],
        registrationUrl: doc.registrationUrl || doc.registration?.url || doc.source?.externalUrl || "",
        platform: doc.source?.platform || "gethack",
        organizerName: doc.organizerName || doc.organizer?.name || "Organizer",
        prizePool: doc.prizePool?.description || doc.prizes || (doc.prizePool?.amount ? `$${doc.prizePool.amount}` : "Prizes & Recognition"),
        status: h.status || doc.status || "registration-open",
        score: item.score,
      };
    });

    return {
      success: true,
      count: formattedHackathons.length,
      totalAvailable,
      hasExactProfileMatch,
      hackathons: formattedHackathons,
    };
  } catch (error) {
    console.error("[GetHack AI Tool Error: search_hackathons]:", error);
    return {
      success: false,
      count: 0,
      error: "Unable to search hackathons",
      hackathons: [],
    };
  }
}

module.exports = {
  searchHackathonsDefinition,
  searchHackathons,
};
