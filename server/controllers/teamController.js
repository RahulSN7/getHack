// ---------------------------------------------------------------------------
// server/controllers/teamController.js — Controller handlers for Team API
// Manages team creation, listing, details retrieval, and team join requests
// ---------------------------------------------------------------------------

const Team = require("../models/team");
const User = require("../models/user");
const mongoose = require("mongoose");

// POST /api/teams — Create a new team
const createTeam = async (req, res) => {
  try {
    const {
      teamName,
      hackathon,
      hackathonName,
      hackathonLink,
      hackathonDates,
      startDate,
      endDate,
      description,
      lookingForDescription,
      rolesNeeded = [],
      techStack = [],
      maxSize = 4,
      location = "Online",
      accent = "indigo",
      pendingInvitationIds = [],
    } = req.body;

    if (!teamName || !teamName.trim()) {
      return res.status(400).json({ message: "Team name is required." });
    }

    if (!hackathonName || !hackathonName.trim()) {
      return res.status(400).json({ message: "Hackathon name is required." });
    }

    const userId = req.user._id;
    const userIdStr = userId.toString();

    const team = await Team.create({
      teamName: teamName.trim(),
      hackathon: hackathon || `custom-hackathon-${Date.now()}`,
      hackathonName: hackathonName.trim(),
      hackathonLink: (hackathonLink || "").trim(),
      hackathonDates: (hackathonDates || "").trim(),
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      description: (description || "").trim(),
      lookingForDescription: (lookingForDescription || "").trim(),
      rolesNeeded: Array.isArray(rolesNeeded) ? rolesNeeded : [],
      techStack: Array.isArray(techStack) ? techStack : [],
      currentSize: 1,
      maxSize: Number(maxSize) || 4,
      location: location || "Online",
      accent: accent || "indigo",
      status: "Recruiting",
      createdBy: userId,
      leader: userId,
      members: [{ user: userId, role: "Team Leader" }],
      memberIds: [userIdStr],
      pendingInvitationIds: Array.isArray(pendingInvitationIds) ? pendingInvitationIds : [],
    });

    const populatedTeam = await Team.findById(team._id)
      .populate("createdBy", "name email role profile")
      .populate("leader", "name email role profile")
      .populate("members.user", "name email role profile");

    return res.status(201).json({
      success: true,
      message: "Team created successfully.",
      team: populatedTeam,
    });
  } catch (error) {
    console.error("Create team error:", error);
    return res.status(500).json({
      message: "Server error occurred while creating team.",
      error: error.message,
    });
  }
};

// GET /api/teams — Get all teams
const getTeams = async (req, res) => {
  try {
    const teams = await Team.find()
      .populate("createdBy", "name email role profile")
      .populate("leader", "name email role profile")
      .populate("members.user", "name email role profile")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      teams,
    });
  } catch (error) {
    console.error("Get teams error:", error);
    return res.status(500).json({
      message: "Server error occurred while fetching teams.",
      error: error.message,
    });
  }
};

// GET /api/teams/:id — Get team details by ID
const getTeamById = async (req, res) => {
  try {
    const { id } = req.params;

    let team = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      team = await Team.findById(id)
        .populate("createdBy", "name email role profile")
        .populate("leader", "name email role profile")
        .populate("members.user", "name email role profile");
    }

    if (!team) {
      // Fallback search by custom id if applicable
      team = await Team.findOne({ id })
        .populate("createdBy", "name email role profile")
        .populate("leader", "name email role profile")
        .populate("members.user", "name email role profile");
    }

    if (!team) {
      return res.status(404).json({ message: "Team not found." });
    }

    return res.json({
      success: true,
      team,
    });
  } catch (error) {
    console.error("Get team details error:", error);
    return res.status(500).json({
      message: "Server error occurred while fetching team details.",
      error: error.message,
    });
  }
};

// POST /api/teams/:id/join — Join a team
const joinTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userIdStr = userId.toString();

    let team = await Team.findById(id);
    if (!team) {
      team = await Team.findOne({ id });
    }

    if (!team) {
      return res.status(404).json({ message: "Team not found." });
    }

    // 1. Leader check
    if (team.createdBy.toString() === userIdStr || (team.leader && team.leader.toString() === userIdStr)) {
      return res.status(400).json({ message: "You are the leader of this team." });
    }

    // 2. Existing member check
    const isAlreadyMember = team.memberIds.includes(userIdStr) || team.members.some((m) => m.user && m.user.toString() === userIdStr);
    if (isAlreadyMember) {
      return res.status(400).json({ message: "You are already a member of this team." });
    }

    // 3. Capacity check
    if (team.currentSize >= team.maxSize || team.status !== "Recruiting") {
      return res.status(400).json({ message: "This team is currently full or not recruiting." });
    }

    // Add user to members
    team.members.push({ user: userId, role: "Member" });
    if (!team.memberIds.includes(userIdStr)) {
      team.memberIds.push(userIdStr);
    }
    team.currentSize = team.members.length;
    if (team.currentSize >= team.maxSize) {
      team.status = "Full";
    }

    await team.save();

    const updatedTeam = await Team.findById(team._id)
      .populate("createdBy", "name email role profile")
      .populate("leader", "name email role profile")
      .populate("members.user", "name email role profile");

    return res.json({
      success: true,
      message: "Joined team successfully.",
      team: updatedTeam,
    });
  } catch (error) {
    console.error("Join team error:", error);
    return res.status(500).json({
      message: "Server error occurred while joining team.",
      error: error.message,
    });
  }
};

// GET /api/teams/my-teams — Get teams where current user is leader or member
const getMyTeams = async (req, res) => {
  try {
    const userId = req.user._id;
    const userIdStr = userId.toString();

    const teams = await Team.find({
      $or: [
        { createdBy: userId },
        { leader: userId },
        { memberIds: userIdStr },
        { "members.user": userId },
      ],
    })
      .populate("createdBy", "name email role profile")
      .populate("leader", "name email role profile")
      .populate("members.user", "name email role profile")
      .sort({ updatedAt: -1 });

    return res.json({
      success: true,
      teams,
    });
  } catch (error) {
    console.error("Get my teams error:", error);
    return res.status(500).json({
      message: "Server error occurred while fetching your teams.",
      error: error.message,
    });
  }
};

// PUT /api/teams/:id — Edit team details (Team Leader only)
const updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userIdStr = userId.toString();

    let team = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      team = await Team.findById(id);
    }
    if (!team) {
      team = await Team.findOne({ id });
    }

    if (!team) {
      return res.status(404).json({ message: "Team not found." });
    }

    // Leader authorization check
    const isLeader = team.createdBy.toString() === userIdStr || (team.leader && team.leader.toString() === userIdStr);
    if (!isLeader) {
      return res.status(403).json({ message: "Only the team leader can edit team information." });
    }

    const {
      teamName,
      hackathonName,
      hackathonLink,
      hackathonDates,
      startDate,
      endDate,
      description,
      lookingForDescription,
      rolesNeeded,
      techStack,
      maxSize,
      location,
      accent,
    } = req.body;

    if (teamName !== undefined && teamName.trim()) team.teamName = teamName.trim();
    if (hackathonName !== undefined && hackathonName.trim()) team.hackathonName = hackathonName.trim();
    if (hackathonLink !== undefined) team.hackathonLink = hackathonLink.trim();
    if (hackathonDates !== undefined) team.hackathonDates = hackathonDates.trim();
    if (startDate !== undefined) team.startDate = startDate ? new Date(startDate) : undefined;
    if (endDate !== undefined) team.endDate = endDate ? new Date(endDate) : undefined;
    if (description !== undefined) team.description = description.trim();
    if (lookingForDescription !== undefined) team.lookingForDescription = lookingForDescription.trim();
    if (Array.isArray(rolesNeeded)) team.rolesNeeded = rolesNeeded;
    if (Array.isArray(techStack)) team.techStack = techStack;
    if (maxSize !== undefined && Number(maxSize) >= team.currentSize) team.maxSize = Number(maxSize);
    if (location !== undefined) team.location = location;
    if (accent !== undefined) team.accent = accent;

    if (team.currentSize >= team.maxSize) {
      team.status = "Full";
    } else if (team.status === "Full") {
      team.status = "Recruiting";
    }

    await team.save();

    const updatedTeam = await Team.findById(team._id)
      .populate("createdBy", "name email role profile")
      .populate("leader", "name email role profile")
      .populate("members.user", "name email role profile");

    return res.json({
      success: true,
      message: "Team updated successfully.",
      team: updatedTeam,
    });
  } catch (error) {
    console.error("Update team error:", error);
    return res.status(500).json({
      message: "Server error occurred while updating team.",
      error: error.message,
    });
  }
};

// POST /api/teams/:id/leave — Leave team (Member only, non-leader)
const leaveTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userIdStr = userId.toString();

    let team = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      team = await Team.findById(id);
    }
    if (!team) {
      team = await Team.findOne({ id });
    }

    if (!team) {
      return res.status(404).json({ message: "Team not found." });
    }

    // Leader cannot leave
    if (team.createdBy.toString() === userIdStr || (team.leader && team.leader.toString() === userIdStr)) {
      return res.status(400).json({ message: "Team leader cannot leave the team. Transfer leadership or delete team instead." });
    }

    // Member check
    const isMember = team.memberIds.includes(userIdStr) || team.members.some((m) => m.user && m.user.toString() === userIdStr);
    if (!isMember) {
      return res.status(400).json({ message: "You are not a member of this team." });
    }

    // Remove user from members & memberIds
    team.members = team.members.filter((m) => m.user && m.user.toString() !== userIdStr);
    team.memberIds = team.memberIds.filter((mId) => mId !== userIdStr);
    team.currentSize = team.members.length;

    if (team.status === "Full" && team.currentSize < team.maxSize) {
      team.status = "Recruiting";
    }

    await team.save();

    return res.json({
      success: true,
      message: "Left team successfully.",
      teamId: team.id || team._id,
    });
  } catch (error) {
    console.error("Leave team error:", error);
    return res.status(500).json({
      message: "Server error occurred while leaving team.",
      error: error.message,
    });
  }
};

// DELETE /api/teams/:id/members/:memberId — Remove team member (Team Leader only)
const removeMember = async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const userId = req.user._id;
    const userIdStr = userId.toString();

    let team = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      team = await Team.findById(id);
    }
    if (!team) {
      team = await Team.findOne({ id });
    }

    if (!team) {
      return res.status(404).json({ message: "Team not found." });
    }

    // Leader authorization check
    const isLeader = team.createdBy.toString() === userIdStr || (team.leader && team.leader.toString() === userIdStr);
    if (!isLeader) {
      return res.status(403).json({ message: "Only the team leader can remove team members." });
    }

    // Cannot remove team leader
    const rawCreator = team.createdBy || team.leader;
    const creatorIdStr = (typeof rawCreator === "object" ? (rawCreator._id || rawCreator.id) : rawCreator).toString();
    if (memberId === creatorIdStr) {
      return res.status(400).json({ message: "Cannot remove the team leader." });
    }

    // Member check
    const isMember = team.memberIds.includes(memberId) || team.members.some((m) => m.user && m.user.toString() === memberId);
    if (!isMember) {
      return res.status(400).json({ message: "User is not a member of this team." });
    }

    // Remove user from members & memberIds
    team.members = team.members.filter((m) => m.user && m.user.toString() !== memberId);
    team.memberIds = team.memberIds.filter((mId) => mId !== memberId);
    team.currentSize = team.members.length;

    if (team.status === "Full" && team.currentSize < team.maxSize) {
      team.status = "Recruiting";
    }

    await team.save();

    const updatedTeam = await Team.findById(team._id)
      .populate("createdBy", "name email role profile")
      .populate("leader", "name email role profile")
      .populate("members.user", "name email role profile");

    return res.json({
      success: true,
      message: "Team member removed successfully.",
      team: updatedTeam,
    });
  } catch (error) {
    console.error("Remove team member error:", error);
    return res.status(500).json({
      message: "Server error occurred while removing team member.",
      error: error.message,
    });
  }
};

module.exports = {
  createTeam,
  getTeams,
  getMyTeams,
  getTeamById,
  updateTeam,
  joinTeam,
  leaveTeam,
  removeMember,
};

