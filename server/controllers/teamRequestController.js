// ---------------------------------------------------------------------------
// server/controllers/teamRequestController.js — Controller for Team Join Requests
// Handles sending team join requests, listing incoming/sent requests, accept/reject, & cancel
// ---------------------------------------------------------------------------

const TeamRequest = require("../models/teamRequest");
const Team = require("../models/team");
const User = require("../models/user");
const mongoose = require("mongoose");

// POST /api/teams/:teamId/requests — Send request to join a team
const sendTeamRequest = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { note } = req.body;
    const userId = req.user._id;
    const userIdStr = userId.toString();

    let team = null;
    if (mongoose.Types.ObjectId.isValid(teamId)) {
      team = await Team.findById(teamId);
    }
    if (!team) {
      team = await Team.findOne({ id: teamId });
    }

    if (!team) {
      return res.status(404).json({ message: "Team not found." });
    }

    // 1. Leader check
    if (team.createdBy.toString() === userIdStr || (team.leader && team.leader.toString() === userIdStr)) {
      return res.status(400).json({ message: "You are the leader of this team." });
    }

    // 2. Member check
    const isMember = team.memberIds.includes(userIdStr) || team.members.some((m) => m.user && m.user.toString() === userIdStr);
    if (isMember) {
      return res.status(400).json({ message: "You are already a member of this team." });
    }

    // 3. Team status & capacity check
    if (team.currentSize >= team.maxSize || team.status !== "Recruiting") {
      return res.status(400).json({ message: "This team is currently full or not recruiting." });
    }

    // 4. Duplicate pending request check
    const existingRequest = await TeamRequest.findOne({
      team: team._id,
      requester: userId,
      status: "pending",
    });

    if (existingRequest) {
      return res.status(400).json({ message: "You have already sent a request to join this team." });
    }

    const newRequest = await TeamRequest.create({
      team: team._id,
      requester: userId,
      teamLeader: team.createdBy || team.leader,
      status: "pending",
      note: (note || "").trim(),
    });

    const populatedRequest = await TeamRequest.findById(newRequest._id)
      .populate("team", "teamName hackathonName location currentSize maxSize status")
      .populate("requester", "name email role profile")
      .populate("teamLeader", "name email role profile");

    return res.status(201).json({
      success: true,
      message: "Join request sent successfully.",
      request: populatedRequest,
    });
  } catch (error) {
    console.error("Send team request error:", error);
    return res.status(500).json({
      message: "Server error occurred while sending join request.",
      error: error.message,
    });
  }
};

// GET /api/teams/requests/incoming — Get incoming team requests for teams led by current user
const getIncomingRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all teams created/led by current user
    const userTeams = await Team.find({
      $or: [{ createdBy: userId }, { leader: userId }],
    }).select("_id");

    const teamIds = userTeams.map((t) => t._id);

    const requests = await TeamRequest.find({
      team: { $in: teamIds },
      status: "pending",
    })
      .populate("team", "teamName hackathonName location currentSize maxSize status")
      .populate("requester", "name email role profile")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error("Get incoming team requests error:", error);
    return res.status(500).json({
      message: "Server error occurred while fetching incoming team requests.",
      error: error.message,
    });
  }
};

// GET /api/teams/requests/sent — Get team join requests sent by current user
const getSentRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const requests = await TeamRequest.find({
      requester: userId,
    })
      .populate("team", "teamName hackathonName hackathonDates location currentSize maxSize status createdBy leader")
      .populate("teamLeader", "name email role profile")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error("Get sent team requests error:", error);
    return res.status(500).json({
      message: "Server error occurred while fetching sent team requests.",
      error: error.message,
    });
  }
};

// PATCH /api/teams/requests/:id/accept — Accept team request (Team Leader only)
const acceptRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userIdStr = userId.toString();

    const teamRequest = await TeamRequest.findById(id).populate("team");
    if (!teamRequest) {
      return res.status(404).json({ message: "Team request not found." });
    }

    if (teamRequest.status !== "pending") {
      return res.status(400).json({ message: `Request is already ${teamRequest.status}.` });
    }

    const team = teamRequest.team;
    if (!team) {
      return res.status(404).json({ message: "Associated team not found." });
    }

    // Verify leader authorization
    const isLeader = team.createdBy.toString() === userIdStr || (team.leader && team.leader.toString() === userIdStr);
    if (!isLeader) {
      return res.status(403).json({ message: "Only the team leader can accept join requests." });
    }

    // Capacity check
    if (team.currentSize >= team.maxSize) {
      return res.status(400).json({ message: "Team has reached maximum capacity." });
    }

    const requesterId = teamRequest.requester;
    const requesterIdStr = requesterId.toString();

    // Add member if not already present
    const isAlreadyMember = team.memberIds.includes(requesterIdStr);
    if (!isAlreadyMember) {
      team.members.push({ user: requesterId, role: "Member" });
      team.memberIds.push(requesterIdStr);
      team.currentSize = team.members.length;
      if (team.currentSize >= team.maxSize) {
        team.status = "Full";
      }
      await team.save();
    }

    teamRequest.status = "accepted";
    await teamRequest.save();

    const updatedRequest = await TeamRequest.findById(teamRequest._id)
      .populate("team", "teamName hackathonName location currentSize maxSize status")
      .populate("requester", "name email role profile");

    const populatedTeam = await Team.findById(team._id)
      .populate("createdBy", "name email role profile")
      .populate("leader", "name email role profile")
      .populate("members.user", "name email role profile");

    return res.json({
      success: true,
      message: "Team request accepted.",
      request: updatedRequest,
      team: populatedTeam,
    });
  } catch (error) {
    console.error("Accept team request error:", error);
    return res.status(500).json({
      message: "Server error occurred while accepting team request.",
      error: error.message,
    });
  }
};

// PATCH /api/teams/requests/:id/reject — Reject team request (Team Leader only)
const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userIdStr = userId.toString();

    const teamRequest = await TeamRequest.findById(id).populate("team");
    if (!teamRequest) {
      return res.status(404).json({ message: "Team request not found." });
    }

    if (teamRequest.status !== "pending") {
      return res.status(400).json({ message: `Request is already ${teamRequest.status}.` });
    }

    const team = teamRequest.team;
    if (!team) {
      return res.status(404).json({ message: "Associated team not found." });
    }

    const isLeader = team.createdBy.toString() === userIdStr || (team.leader && team.leader.toString() === userIdStr);
    if (!isLeader) {
      return res.status(403).json({ message: "Only the team leader can reject join requests." });
    }

    teamRequest.status = "rejected";
    await teamRequest.save();

    return res.json({
      success: true,
      message: "Team request rejected.",
      request: teamRequest,
    });
  } catch (error) {
    console.error("Reject team request error:", error);
    return res.status(500).json({
      message: "Server error occurred while rejecting team request.",
      error: error.message,
    });
  }
};

// PATCH /api/teams/requests/:id/cancel — Cancel sent team request (Requester only)
const cancelRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const teamRequest = await TeamRequest.findById(id);
    if (!teamRequest) {
      return res.status(404).json({ message: "Team request not found." });
    }

    if (teamRequest.requester.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only the requester can cancel this request." });
    }

    if (teamRequest.status !== "pending") {
      return res.status(400).json({ message: `Request is already ${teamRequest.status}.` });
    }

    teamRequest.status = "cancelled";
    await teamRequest.save();

    return res.json({
      success: true,
      message: "Team request cancelled.",
      request: teamRequest,
    });
  } catch (error) {
    console.error("Cancel team request error:", error);
    return res.status(500).json({
      message: "Server error occurred while cancelling team request.",
      error: error.message,
    });
  }
};

module.exports = {
  sendTeamRequest,
  getIncomingRequests,
  getSentRequests,
  acceptRequest,
  rejectRequest,
  cancelRequest,
};
