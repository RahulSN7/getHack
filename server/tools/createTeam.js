
// server/tools/createTeam.js — Tool for Creating a New Team for a Hackathon


const Team = require("../models/team");
const User = require("../models/user");
const mongoose = require("mongoose");

const createTeamDefinition = {
  name: "create_team",
  description: "Create a new team for a hackathon on getHack.",
  parameters: {
    type: "object",
    properties: {
      teamName: {
        type: "string",
        description: "The name of the new team to create.",
      },
      hackathonName: {
        type: "string",
        description: "The name of the target hackathon.",
      },
      hackathonId: {
        type: "string",
        description: "Optional Hackathon ID.",
      },
      description: {
        type: "string",
        description: "Brief team bio or project description.",
      },
      maxSize: {
        type: "number",
        description: "Maximum team capacity (default 4).",
      },
      rolesNeeded: {
        type: "array",
        items: { type: "string" },
        description: "List of roles being sought.",
      },
      techStack: {
        type: "array",
        items: { type: "string" },
        description: "Technologies used by the team.",
      },
      pendingInvitationIds: {
        type: "array",
        items: { type: "string" },
        description: "User IDs of candidates to invite initially.",
      },
    },
    required: ["teamName", "hackathonName"],
  },
};

/**
 * Execute tool to create a new team for a hackathon
 * @param {Object} args
 * @param {Object} context { user, userProfile }
 * @returns {Promise<Object>} Creation result
 */
async function createTeam(args = {}, context = {}) {
  try {
    const activeUserId = context.user?._id || context.userProfile?.id || context.userProfile?._id;
    if (!activeUserId) {
      return {
        success: false,
        reason: "unauthenticated",
        message: "You must be logged in to create a team.",
      };
    }

    const {
      teamName,
      hackathonName,
      hackathonId,
      description,
      maxSize = 4,
      rolesNeeded = [],
      techStack = [],
      pendingInvitationIds = [],
    } = args;

    const finalTeamName = (teamName || "").trim() || "Hackathon Squad";
    const finalHackName = (hackathonName || "").trim() || "Hackathon Challenge";

    const userIdStr = activeUserId.toString();
    const maxCap = Number(maxSize) || 4;

    const newTeam = await Team.create({
      teamName: finalTeamName,
      hackathon: hackathonId || `custom-hackathon-${Date.now()}`,
      hackathonName: finalHackName,
      description: (description || `Team for ${finalHackName}`).trim(),
      rolesNeeded: Array.isArray(rolesNeeded) ? rolesNeeded : [],
      techStack: Array.isArray(techStack) ? techStack : [],
      currentSize: 1,
      maxSize: maxCap,
      location: "Online",
      accent: "indigo",
      status: "Recruiting",
      createdBy: activeUserId,
      leader: activeUserId,
      members: [{ user: activeUserId, role: "Team Leader" }],
      memberIds: [userIdStr],
      pendingInvitationIds: Array.isArray(pendingInvitationIds) ? pendingInvitationIds : [],
    });

    const populatedTeam = await Team.findById(newTeam._id)
      .populate("createdBy", "name email role profile")
      .populate("leader", "name email role profile")
      .populate("members.user", "name email role profile");

    return {
      success: true,
      action: "create_team",
      message: `Team '${finalTeamName}' created successfully for ${finalHackName}.`,
      team: {
        id: populatedTeam._id.toString(),
        teamName: populatedTeam.teamName,
        hackathonName: populatedTeam.hackathonName,
        currentSize: populatedTeam.currentSize,
        maxSize: populatedTeam.maxSize,
        members: populatedTeam.members,
      },
    };
  } catch (error) {
    console.error("[createTeam Error]:", error);
    return {
      success: false,
      reason: "server_error",
      message: "Could not create team right now. Please try again later.",
    };
  }
}

module.exports = {
  createTeamDefinition,
  createTeam,
};
