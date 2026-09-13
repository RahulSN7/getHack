// ---------------------------------------------------------------------------
// server/tools/findTeammates.js — find_teammates Agent Tool
// Searches GetHack participant candidates by skills, role, interests, location, & availability.
// Uses shared teammateService to ensure EXACT candidate data parity with the Find Teammates page.
// ---------------------------------------------------------------------------

const mongoose = require("mongoose");
const Hackathon = require("../models/hackathon");
const User = require("../models/user");
const { getEligibleTeammateCandidates, normalizeAvailability } = require("../services/teammateService");

/**
 * Skill Synonym Dictionary for normalizing user/AI search terms
 */
const SKILL_SYNONYMS = {
  ml: ["machine learning", "ml", "ai", "artificial intelligence", "deep learning"],
  ai: ["artificial intelligence", "ai", "machine learning", "ml", "deep learning"],
  javascript: ["javascript", "js"],
  js: ["javascript", "js"],
  typescript: ["typescript", "ts"],
  ts: ["typescript", "ts"],
  react: ["react", "reactjs", "react.js"],
  reactjs: ["react", "reactjs", "react.js"],
  node: ["node", "nodejs", "node.js"],
  nodejs: ["node", "nodejs", "node.js"],
  "node.js": ["node", "nodejs", "node.js"],
  python: ["python", "py"],
  py: ["python", "py"],
  cpp: ["c++", "cpp"],
  "c++": ["c++", "cpp"],
  ui: ["ui/ux", "ui", "ux", "design", "user interface", "figma"],
  ux: ["ui/ux", "ui", "ux", "design", "user experience", "figma"],
  "ui/ux": ["ui/ux", "ui", "ux", "design", "figma"],
  design: ["ui/ux", "ui", "ux", "design", "figma"],
  designer: ["ui/ux", "ui", "ux", "design", "figma"],
  devops: ["devops", "aws", "docker", "kubernetes", "cloud"],
  aws: ["aws", "cloud", "devops", "amazon web services"],
  mongodb: ["mongodb", "mongo", "database"],
  express: ["express", "expressjs", "backend"],
  java: ["java"],
};

/**
 * Expand a skill term into all its synonym variants (lowercase)
 */
function getSynonyms(term) {
  if (!term || typeof term !== "string") return [];
  const clean = term.trim().toLowerCase();
  const synonyms = SKILL_SYNONYMS[clean] || [clean];
  return Array.from(new Set([clean, ...synonyms]));
}

/**
 * Checks if a target skill matches a source candidate skill/array
 */
function matchesTerm(sourceArrayOrString, targetTerm) {
  if (!targetTerm || !sourceArrayOrString) return false;
  const synonyms = getSynonyms(targetTerm);

  if (Array.isArray(sourceArrayOrString)) {
    return sourceArrayOrString.some((item) => {
      const low = String(item).toLowerCase();
      return synonyms.some((syn) => low.includes(syn) || syn.includes(low));
    });
  }

  if (typeof sourceArrayOrString === "string") {
    const low = sourceArrayOrString.toLowerCase();
    return synonyms.some((syn) => low.includes(syn) || syn.includes(low));
  }

  return false;
}

/**
 * Tool Definition Schema (for Gemini / OpenAI function declarations)
 */
const findTeammatesDefinition = {
  name: "find_teammates",
  description: "Search and rank getHack participant candidate teammates by skills, role, hackathon requirements, location, and availability.",
  parameters: {
    type: "object",
    properties: {
      skills: {
        type: "array",
        items: { type: "string" },
        description: "Required or target technology skills (e.g. ['Python', 'Machine Learning', 'UI/UX'])",
      },
      query: {
        type: "string",
        description: "Free-form search query or skill keyword (e.g. 'Python', 'ML')",
      },
      hackathonId: {
        type: "string",
        description: "Hackathon ID or slug to match required and complementary technologies against",
      },
      role: {
        type: "string",
        description: "Target candidate role (e.g. 'ML Developer', 'Frontend Developer', 'Designer')",
      },
      interests: {
        type: "array",
        items: { type: "string" },
        description: "Target candidate interests (e.g. ['AI', 'Web3', 'Open Source'])",
      },
      location: {
        type: "string",
        description: "Target location keyword or city (e.g. 'Delhi', 'India')",
      },
      availability: {
        type: "string",
        enum: ["available", "all"],
        description: "Filter by availability status: 'available' (only Available candidates) or 'all' (default: 'all')",
      },
      limit: {
        type: "number",
        description: "Maximum number of candidate teammates to return per page (default: 5, max: 50)",
      },
      page: {
        type: "number",
        description: "Page number for candidate pagination (default: 1)",
      },
      offset: {
        type: "number",
        description: "Offset index for candidate pagination (default: 0)",
      },
      excludeUserIds: {
        type: "array",
        items: { type: "string" },
        description: "List of candidate user IDs to exclude from results for pagination and deduplication",
      },
      matchMode: {
        type: "string",
        enum: ["all", "skill", "hackathon", "skill_and_hackathon", "complementary"],
        description: "Search mode context: 'all' (generic discovery), 'skill' (target skill), 'hackathon' (hackathon match), 'skill_and_hackathon' (both), or 'complementary' (rank by complementary skills user lacks)",
      },
    },
    required: [],
  },
};

/**
 * Execute find_teammates tool
 * 
 * @param {Object} args - Structured search arguments
 * @param {Object} context - Agent execution context (contains authenticated user identity & context)
 * @returns {Promise<Object>} Structured candidates object
 */
async function findTeammates(args = {}, context = {}) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return {
        success: false,
        count: 0,
        error: "Unable to search teammates (Database connection unavailable)",
        teammates: [],
      };
    }

    const currentUserId = context.userProfile?.id || context.user?._id?.toString() || context.user?.id;
    const {
      skills: reqSkills,
      query: reqQuery,
      hackathonId: reqHackId,
      role: targetRole,
      interests: reqInterests,
      location: targetLocation,
      availability: reqAvailability = "all",
      limit: reqLimit = 5,
      page: reqPage = 1,
      offset: reqOffset = null,
      excludeUserIds: reqExcludeUserIds = [],
      matchMode = "all",
    } = args;

    const page = Math.max(parseInt(reqPage, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(reqLimit, 10) || 5, 1), 5);

    // Assemble target skills array from `skills` and `query`
    const targetSkills = [];
    if (Array.isArray(reqSkills)) {
      reqSkills.forEach((s) => {
        if (s && typeof s === "string" && s.trim()) targetSkills.push(s.trim());
      });
    }
    if (reqQuery && typeof reqQuery === "string" && reqQuery.trim()) {
      if (!targetSkills.some((s) => s.toLowerCase() === reqQuery.trim().toLowerCase())) {
        targetSkills.push(reqQuery.trim());
      }
    }

    // Resolve Hackathon requirements if hackathonId is supplied or present in context
    const targetHackId = reqHackId || context.hackathonId || null;
    let hackSkills = [];
    let hackThemes = [];

    if (targetHackId && typeof targetHackId === "string" && targetHackId.trim()) {
      const cleanHackId = targetHackId.trim();
      let hackDoc = null;
      if (mongoose.Types.ObjectId.isValid(cleanHackId)) {
        hackDoc = await Hackathon.findById(cleanHackId);
      }
      if (!hackDoc) {
        hackDoc = await Hackathon.findOne({ slug: cleanHackId });
      }
      if (!hackDoc) {
        hackDoc = await Hackathon.findOne({ title: new RegExp(cleanHackId, "i") });
      }
      if (hackDoc) {
        hackSkills = Array.isArray(hackDoc.skills) ? hackDoc.skills : [];
        hackThemes = Array.isArray(hackDoc.themes) ? hackDoc.themes : [];
      }
    }

    // Resolve Current User Profile skills to compute complementary skill gap
    let userSkills = Array.isArray(context.userProfile?.skills) ? context.userProfile.skills : [];
    if (userSkills.length === 0 && currentUserId && mongoose.Types.ObjectId.isValid(currentUserId)) {
      const currUserDoc = await User.findById(currentUserId).select("profile");
      if (currUserDoc?.profile?.skills) {
        userSkills = currUserDoc.profile.skills;
      }
    }

    console.log("\n[AI FIND TEAMMATES]");
    console.log(`Authenticated user: ${currentUserId || "guest"}`);
    console.log(`Search parameters: ${JSON.stringify(args)}`);
    console.log(`Current user skills: ${userSkills.length > 0 ? userSkills.join(", ") : "None"}`);
    console.log(`Extracted skills: ${targetSkills.length > 0 ? targetSkills.join(", ") : "None (Generic / Complementary Search)"}`);

    // Call shared teammate service (same source of truth & eligibility rules as Find Teammates page)
    const { eligibleUsers, connectionsMap } = await getEligibleTeammateCandidates(currentUserId);

    // Direct MongoDB user query for name, handle, email, or ID search terms
    const searchTerms = [reqQuery, ...targetSkills].filter((t) => t && typeof t === "string" && t.trim());
    if (searchTerms.length > 0) {
      const escapeRegex = (str) => String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const $orConditions = [];
      searchTerms.forEach((term) => {
        const clean = term.trim();
        const esc = escapeRegex(clean);
        const rx = new RegExp(esc, "i");
        $orConditions.push(
          { name: rx },
          { "profile.handle": rx },
          { email: rx },
          { "profile.skills": rx },
          { "profile.role": rx },
          { "profile.headline": rx }
        );
        if (mongoose.Types.ObjectId.isValid(clean)) {
          $orConditions.push({ _id: clean });
        }
      });

      const directDbUsers = await User.find({
        $or: $orConditions,
        ...(currentUserId ? { _id: { $ne: currentUserId } } : {}),
      });

      directDbUsers.forEach((u) => {
        const uIdStr = (u._id || u.id).toString();
        if (!eligibleUsers.some((eu) => (eu._id || eu.id).toString() === uIdStr)) {
          eligibleUsers.push(u);
        }
      });
    }

    const totalEligible = eligibleUsers.length;

    // Transparent scoring and ranking over candidate pool
    const scoredCandidates = eligibleUsers.map((u) => {
      let score = 0;
      let matchedExplicitSkill = false;
      let newSkillsCount = 0;
      let overlappingSkillsCount = 0;

      const p = u.profile || {};
      const uSkills = Array.isArray(p.skills) ? p.skills : [];
      const uRole = p.role || p.headline || "";
      const uBio = p.bio || "";
      const uLocation = p.location || "";
      const uInterests = Array.isArray(p.interests) ? p.interests : [];
      const uExp = p.experienceLevel || "Intermediate";
      const uName = u.name || "";
      const uHandle = p.handle || u.handle || "";
      const uEmail = u.email || "";
      const uId = u.id || u._id?.toString() || "";

      // 1. Explicit Requested Skill or Name Match (Only for explicit skill/name mode)
      if (targetSkills.length > 0 && matchMode !== "complementary") {
        targetSkills.forEach((reqSkill) => {
          if (
            matchesTerm(uName, reqSkill) ||
            matchesTerm(uHandle, reqSkill) ||
            matchesTerm(uEmail, reqSkill) ||
            (uId && uId.toLowerCase() === reqSkill.toLowerCase())
          ) {
            score += 25;
            matchedExplicitSkill = true;
          } else if (matchesTerm(uSkills, reqSkill)) {
            score += 10;
            matchedExplicitSkill = true;
          } else if (matchesTerm(uRole, reqSkill)) {
            score += 5;
            matchedExplicitSkill = true;
          } else if (matchesTerm(uBio, reqSkill)) {
            score += 2;
          }
        });
      }

      // 2. User Skill Complementarity & Gap Calculation
      if (userSkills.length > 0) {
        uSkills.forEach((sk) => {
          if (!matchesTerm(userSkills, sk)) {
            newSkillsCount++;
            let pts = 8;
            if (hackSkills.length > 0 && matchesTerm(hackSkills, sk)) {
              pts = 12; // Extra boost if candidate skill fills a missing hackathon requirement!
            }
            score += pts;
          } else {
            overlappingSkillsCount++;
            score += 2; // Baseline overlap score
          }
        });
      } else {
        newSkillsCount = uSkills.length;
        score += uSkills.length * 5;
      }

      // 3. Hackathon Requirement & Theme Match
      if (hackSkills.length > 0) {
        hackSkills.forEach((hSkill) => {
          if (matchesTerm(uSkills, hSkill)) {
            const userHasIt = matchesTerm(userSkills, hSkill);
            if (!userHasIt) {
              score += 10; // High boost for candidate filling missing hackathon skill
            } else {
              score += 5; // General hackathon skill match
            }
          }
        });
        hackThemes.forEach((hTheme) => {
          if (matchesTerm(uInterests, hTheme)) score += 3;
        });
      }

      // 4. Role Complementarity & Match
      if (targetRole && matchesTerm(uRole, targetRole)) {
        score += 5;
      }

      // 5. Location Match
      if (targetLocation && matchesTerm(uLocation, targetLocation)) {
        score += 5;
      }

      // 6. Interests Match
      if (Array.isArray(reqInterests) && reqInterests.length > 0) {
        reqInterests.forEach((i) => {
          if (matchesTerm(uInterests, i)) score += 3;
        });
      }

      // 7. Experience Level Boost
      if (uExp === "Advanced") score += 3;
      else if (uExp === "Intermediate") score += 2;
      else if (uExp === "Beginner") score += 1;

      // 8. Availability Boost
      const normAvail = normalizeAvailability(p.availability || u.availability);
      if (normAvail === "Available") score += 2;

      // 9. Profile Quality Boost
      if (p.github || p.portfolio || p.linkedin) score += 1;

      return { user: u, score, normAvail, matchedExplicitSkill, newSkillsCount, overlappingSkillsCount };
    });

    let filteredCandidates = [...scoredCandidates];
    let hasUnavailableMatches = false;
    let hasStrongComplement = false;
    let hasWeakComplement = false;

    if (matchMode === "complementary") {
      hasStrongComplement = scoredCandidates.some((c) => c.newSkillsCount > 0);
      if (totalEligible > 0 && !hasStrongComplement) {
        hasWeakComplement = true;
      }

      console.log("\n[AI COMPLEMENTARY TEAMMATE SEARCH]");
      console.log(`Current user ID: ${currentUserId || "guest"}`);
      console.log(`Current user skills: ${userSkills.length > 0 ? userSkills.join(", ") : "None"}`);
      console.log(`Total eligible candidates in pool: ${totalEligible}`);
      console.log(`Candidates with new complementary skills: ${scoredCandidates.filter((c) => c.newSkillsCount > 0).length}`);
    }

    // If explicit targetSkills (e.g. ['JavaScript']) were requested (and NOT complementary search):
    if (targetSkills.length > 0 && matchMode !== "complementary") {
      const explicitSkillMatches = scoredCandidates.filter((c) => c.matchedExplicitSkill);
      filteredCandidates = explicitSkillMatches;

      // If no eligible candidate matches, check if any user in DB overall has the skill or name (for Case 3 detection)
      if (explicitSkillMatches.length === 0) {
        const escapeRegex = (str) => String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const dbUsersWithSkill = await User.find({
          $or: targetSkills.flatMap((sk) => {
            const rx = new RegExp(escapeRegex(sk), "i");
            return [
              { name: rx },
              { "profile.handle": rx },
              { email: rx },
              { "profile.skills": rx },
              { "profile.role": rx },
              { "profile.headline": rx },
            ];
          }),
        }).limit(5);

        if (dbUsersWithSkill.length > 0) {
          hasUnavailableMatches = true;
        }
      }
    }

    // Availability Filter (strictly filter available candidates when 'available' requested)
    if (reqAvailability && reqAvailability.toLowerCase() === "available") {
      filteredCandidates = filteredCandidates.filter((c) => c.normAvail === "Available");
    }

    // Sort Candidates:
    // Primary: matchedExplicitSkill (if explicit skills requested)
    // Secondary: score descending
    // Tertiary: createdAt descending
    filteredCandidates.sort((a, b) => {
      if (targetSkills.length > 0 && matchMode !== "complementary") {
        if (a.matchedExplicitSkill !== b.matchedExplicitSkill) {
          return a.matchedExplicitSkill ? -1 : 1;
        }
      }
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.user.createdAt) - new Date(a.user.createdAt);
    });

    const candidatesAfterFilters = filteredCandidates.length;

    // Apply Exclude User IDs filtering for deduplication across pagination turns
    const excludeSet = new Set(
      Array.isArray(reqExcludeUserIds) ? reqExcludeUserIds.map((id) => String(id)) : []
    );

    let candidatesForPagination = filteredCandidates;
    if (excludeSet.size > 0) {
      candidatesForPagination = filteredCandidates.filter((item) => {
        const u = item.user;
        const uId = u.id || u._id.toString();
        return !excludeSet.has(uId);
      });
    }

    const remainingAfterExclusions = candidatesForPagination.length;

    // Calculate Pagination Slicing (default 5 candidates per page)
    const offset = reqOffset !== null && !isNaN(parseInt(reqOffset, 10))
      ? Math.max(parseInt(reqOffset, 10), 0)
      : (page - 1) * limit;

    const selectedForDisplay = candidatesForPagination.slice(offset, offset + limit);
    const hasMore = (offset + selectedForDisplay.length) < remainingAfterExclusions;

    console.log(`Total eligible candidates: ${totalEligible}`);
    console.log(`Candidates after requested filters: ${candidatesAfterFilters}`);
    console.log(`Candidates after excludeUserIds: ${remainingAfterExclusions}`);
    console.log(`Candidates selected for display: ${selectedForDisplay.length} (Offset: ${offset}, Limit: ${limit}, HasMore: ${hasMore})\n`);

    // Format safe structured candidate objects & deduplicate by userId
    const seenUserIds = new Set();
    const formattedTeammates = [];

    for (const item of selectedForDisplay) {
      const u = item.user;
      const safe = u.toSafeUser ? u.toSafeUser() : u;
      const uId = safe.id || u._id.toString();

      if (seenUserIds.has(uId)) continue;
      seenUserIds.add(uId);

      const p = safe.profile || {};
      const connInfo = connectionsMap[uId];
      let connectionStatus = "none";
      if (connInfo) {
        if (connInfo.status === "accepted") {
          connectionStatus = "connected";
        } else if (connInfo.status === "pending") {
          connectionStatus = "request_sent";
        }
      }

      formattedTeammates.push({
        userId: uId,
        name: safe.name,
        role: p.role || p.headline || "Developer",
        headline: p.headline || p.role || "Participant",
        avatar: p.avatar || "",
        skills: Array.isArray(p.skills) ? p.skills : [],
        interests: Array.isArray(p.interests) ? p.interests : [],
        location: p.location || "",
        experienceLevel: p.experienceLevel || "Intermediate",
        availability: p.availability || "Available",
        bio: p.bio || "",
        github: p.github || "",
        linkedin: p.linkedin || "",
        portfolio: p.portfolio || "",
        score: item.score,
        connectionStatus,
      });
    }

    return {
      success: true,
      count: formattedTeammates.length,
      searchArgs: {
        query: reqQuery,
        skills: reqSkills,
        matchMode,
      },
      totalEligible,
      candidatesAfterFilters,
      remainingAfterExclusions,
      page: Math.floor(offset / limit) + 1,
      limit,
      hasMore,
      hasUnavailableMatches,
      hasStrongComplement,
      hasWeakComplement,
      candidatesSelectedForDisplay: formattedTeammates.length,
      teammates: formattedTeammates,
    };
  } catch (error) {
    console.error("[GetHack AI Tool Error: find_teammates]:", error);
    return {
      success: false,
      count: 0,
      error: "Unable to search teammates",
      teammates: [],
    };
  }
}

module.exports = {
  findTeammatesDefinition,
  findTeammates,
  SKILL_SYNONYMS,
  getSynonyms,
  matchesTerm,
};

