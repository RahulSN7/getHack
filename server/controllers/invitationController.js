// ---------------------------------------------------------------------------
// server/controllers/invitationController.js — Controller for Team Invitations via Chat
// Handles sending invitations into Stream Chat 1-on-1 conversations and recipient responses
// ---------------------------------------------------------------------------

const TeamInvitation = require("../models/teamInvitation");
const Team = require("../models/team");
const User = require("../models/user");
const Connection = require("../models/connection");
const mongoose = require("mongoose");
const { getStreamClient, upsertStreamUsers } = require("../services/streamService");
const { createNotification } = require("../services/notificationService");

// ---------------------------------------------------------------------------
// POST /api/invitations/send — Send Team Invitation directly through Stream Chat
// ---------------------------------------------------------------------------
const sendInvitation = async (req, res) => {
  try {
    const { teamId, receiverId } = req.body;
    const senderId = req.user._id;
    const senderIdStr = senderId.toString();

    if (!teamId || !receiverId) {
      return res.status(400).json({ message: "Team ID and Receiver ID are required." });
    }

    const receiverIdStr = receiverId.toString();

    if (senderIdStr === receiverIdStr) {
      return res.status(400).json({ message: "You cannot invite yourself to a team." });
    }

    // 1. Fetch team
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

    // 2. Sender authorization check (Leader or Member)
    const isLeaderOrMember =
      team.createdBy.toString() === senderIdStr ||
      (team.leader && team.leader.toString() === senderIdStr) ||
      (team.memberIds && team.memberIds.includes(senderIdStr));

    if (!isLeaderOrMember) {
      return res.status(403).json({ message: "Only team members can invite connections to this team." });
    }

    // 3. Capacity check
    const currentSize = team.members && team.members.length > 0 ? team.members.length : (team.currentSize || 1);
    const availableSpots = Math.max(0, team.maxSize - currentSize);

    if (availableSpots <= 0) {
      return res.status(400).json({ message: "This team is currently full." });
    }

    // 4. Existing member check
    if (team.memberIds.includes(receiverIdStr)) {
      return res.status(400).json({ message: "User is already a member of this team." });
    }

    // 5. Check duplicate pending invitation
    const existingPending = await TeamInvitation.findOne({
      team: team._id,
      receiver: receiverIdStr,
      status: "pending",
    });

    if (existingPending) {
      return res.status(400).json({ message: "Invitation already sent to this connection." });
    }

    // 6. Fetch target receiver profile
    const receiverUser = await User.findById(receiverIdStr);
    if (!receiverUser) {
      return res.status(404).json({ message: "Target connection user not found." });
    }

    // 7. Create TeamInvitation record in MongoDB
    const invitation = await TeamInvitation.create({
      sender: senderId,
      receiver: receiverId,
      team: team._id,
      teamName: team.teamName,
      hackathonName: team.hackathonName || "Hackathon",
      hackathonId: team.hackathon || "",
      status: "pending",
    });

    // 8. Send custom team_invitation message to Stream Chat channel (if credentials configured)
    try {
      await upsertStreamUsers([req.user, receiverUser]);
      const client = getStreamClient();
      const channel = client.channel("messaging", {
        members: [senderIdStr, receiverIdStr],
        created_by_id: senderIdStr,
      });
      await channel.create();
      invitation.streamChannelCid = channel.cid;

      const senderName = req.user.name || "A connection";
      const messageRes = await channel.sendMessage({
        text: `🤝 Hackathon Team Invitation: ${senderName} invited you to join Team ${team.teamName}`,
        user_id: senderIdStr,
        type: "regular",
        custom_type: "team_invitation",
        invitation_id: invitation._id.toString(),
        team_id: team._id.toString(),
        team_name: team.teamName,
        hackathon_name: team.hackathonName || "Hackathon",
        sender_id: senderIdStr,
        sender_name: senderName,
        receiver_id: receiverIdStr,
        invitation_status: "pending",
        max_size: team.maxSize,
        current_size: currentSize,
      });

      invitation.streamMessageId = messageRes.message.id;
    } catch (streamErr) {
      console.warn("[Stream Chat] Could not post chat invitation message:", streamErr.message);
    }

    await invitation.save();

    // 9. Add receiverId to pendingInvitationIds on team
    if (!team.pendingInvitationIds.includes(receiverIdStr)) {
      team.pendingInvitationIds.push(receiverIdStr);
      await team.save();
    }

    // Create Notification for receiver
    try {
      const invSenderName = req.user.name || "A team member";
      await createNotification({
        recipient: receiverId,
        sender: senderId,
        type: "TEAM_INVITATION",
        title: "New team invitation",
        message: `${invSenderName} invited you to join team ${team.teamName || "a team"}.`,
        entityType: "Team",
        entityId: team._id,
        metadata: {
          teamId: team._id.toString(),
          invitationId: invitation._id.toString(),
          hackathonId: team.hackathon || "",
          actionId: `team_inv_${invitation._id}`,
        },
      });
    } catch (notifErr) {
      console.warn("Failed to create team invitation notification:", notifErr.message);
    }

    const populatedTeam = await Team.findById(team._id)
      .populate("createdBy", "name email role profile")
      .populate("leader", "name email role profile")
      .populate("members.user", "name email role profile");

    return res.status(201).json({
      success: true,
      message: "Invitation sent directly to chat conversation.",
      invitation,
      team: populatedTeam,
    });
  } catch (error) {
    console.error("Send invitation error:", error);
    return res.status(500).json({
      message: "Server error occurred while sending invitation.",
      error: error.message,
    });
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/invitations/:id/respond — Accept or Reject Team Invitation
// ---------------------------------------------------------------------------
const respondToInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    const userIdStr = req.user._id.toString();

    if (!action || !["accept", "reject"].includes(action)) {
      return res.status(400).json({ message: "Invalid action. Must be 'accept' or 'reject'." });
    }

    const invitation = await TeamInvitation.findById(id);
    if (!invitation) {
      return res.status(404).json({ message: "Team invitation not found." });
    }

    // Authorization: Only the intended recipient can accept/reject
    if (invitation.receiver.toString() !== userIdStr) {
      return res.status(403).json({ message: "Only the invitation recipient can accept or reject this invitation." });
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({ message: `Invitation is already ${invitation.status}.` });
    }

    let team = await Team.findById(invitation.team);
    if (!team) {
      return res.status(404).json({ message: "Associated team not found." });
    }

    if (action === "accept") {
      // Re-verify capacity from actual database members
      const currentMemberCount = team.members ? team.members.length : (team.currentSize || 1);
      if (currentMemberCount >= team.maxSize) {
        return res.status(400).json({ message: "This team is already full." });
      }

      // Add user to members if not present
      const isAlreadyMember = team.memberIds.includes(userIdStr);
      if (!isAlreadyMember) {
        team.members.push({ user: req.user._id, role: "Member" });
        team.memberIds.push(userIdStr);
        team.currentSize = team.members.length;
        if (team.currentSize >= team.maxSize) {
          team.status = "Full";
        }
      }

      // Remove from pending invitations
      team.pendingInvitationIds = (team.pendingInvitationIds || []).filter((pId) => pId !== userIdStr);
      await team.save();

      invitation.status = "accepted";
    } else if (action === "reject") {
      // Remove from pending invitations
      team.pendingInvitationIds = (team.pendingInvitationIds || []).filter((pId) => pId !== userIdStr);
      await team.save();

      invitation.status = "rejected";
    }

    await invitation.save();

    // Create Notification for invitation sender / team leader
    try {
      const responderName = req.user.name || "A participant";
      const isAccepted = invitation.status === "accepted";
      const targetRecipient = invitation.sender || team.createdBy || team.leader;
      await createNotification({
        recipient: targetRecipient,
        sender: req.user._id,
        type: isAccepted ? "TEAM_INVITATION_ACCEPTED" : "TEAM_INVITATION_REJECTED",
        title: isAccepted ? "Team invitation accepted" : "Team invitation declined",
        message: isAccepted
          ? `${responderName} accepted your invitation to join ${team.teamName || "the team"}.`
          : `${responderName} declined your invitation to join ${team.teamName || "the team"}.`,
        entityType: "Team",
        entityId: team._id,
        metadata: {
          teamId: team._id.toString(),
          invitationId: invitation._id.toString(),
          actionId: `team_inv_resp_${invitation.status}_${invitation._id}`,
        },
      });
    } catch (notifErr) {
      console.warn("Failed to create team invitation response notification:", notifErr.message);
    }

    // Update Stream Chat message real-time so both users see the updated status card
    if (invitation.streamMessageId) {
      try {
        const client = getStreamClient();
        const updatedCurrentSize = team.members ? team.members.length : (team.currentSize || 1);
        await client.updateMessage({
          id: invitation.streamMessageId,
          text: invitation.status === "accepted"
            ? `🤝 Hackathon Team Invitation: Accepted for ${team.teamName}`
            : `🤝 Hackathon Team Invitation: Rejected for ${team.teamName}`,
          user_id: invitation.sender.toString(),
          type: "regular",
          custom_type: "team_invitation",
          invitation_id: invitation._id.toString(),
          team_id: team._id.toString(),
          team_name: team.teamName,
          hackathon_name: team.hackathonName || "Hackathon",
          sender_id: invitation.sender.toString(),
          receiver_id: invitation.receiver.toString(),
          invitation_status: invitation.status,
          max_size: team.maxSize,
          current_size: updatedCurrentSize,
        });
      } catch (streamErr) {
        console.warn("Could not update Stream Chat message status:", streamErr.message);
      }
    }

    const populatedTeam = await Team.findById(team._id)
      .populate("createdBy", "name email role profile")
      .populate("leader", "name email role profile")
      .populate("members.user", "name email role profile");

    return res.json({
      success: true,
      message: `Invitation ${invitation.status} successfully.`,
      invitation,
      team: populatedTeam,
    });
  } catch (error) {
    console.error("Respond to invitation error:", error);
    return res.status(500).json({
      message: "Server error occurred while responding to invitation.",
      error: error.message,
    });
  }
};

// ---------------------------------------------------------------------------
// GET /api/invitations/:id — Get Invitation Details by ID
// ---------------------------------------------------------------------------
const getInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const invitation = await TeamInvitation.findById(id)
      .populate("sender", "name email role profile")
      .populate("receiver", "name email role profile")
      .populate("team");

    if (!invitation) {
      return res.status(404).json({ message: "Team invitation not found." });
    }

    return res.json({
      success: true,
      invitation,
    });
  } catch (error) {
    console.error("Get invitation error:", error);
    return res.status(500).json({
      message: "Server error occurred while fetching invitation details.",
      error: error.message,
    });
  }
};

module.exports = {
  sendInvitation,
  respondToInvitation,
  getInvitation,
};
