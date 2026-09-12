// ---------------------------------------------------------------------------
// server/tools/inviteToTeam.js — Tool for Inviting Connections to an Active Team
// ---------------------------------------------------------------------------

const Team = require("../models/team");
const User = require("../models/user");
const Connection = require("../models/connection");
const TeamInvitation = require("../models/teamInvitation");
const { createNotification } = require("../services/notificationService");
const mongoose = require("mongoose");

const inviteToTeamDefinition = {
  name: "invite_to_team",
  description: "Invite a connected teammate to join your active hackathon team.",
  parameters: {
    type: "object",
    properties: {
      teamId: {
        type: "string",
        description: "The ID of your team.",
      },
      receiverId: {
        type: "string",
        description: "The User ID of the candidate to invite.",
      },
      receiverName: {
        type: "string",
        description: "Optional name of the candidate.",
      },
    },
    required: ["teamId", "receiverId"],
  },
};

/**
 * Execute tool to invite a connected user to a team
 * @param {Object} args { teamId, receiverId, receiverName }
 * @param {Object} context { user, userProfile }
 * @returns {Promise<Object>} Invitation result
 */
async function inviteToTeam(args = {}, context = {}) {
  try {
    const senderId = context.user?._id || context.userProfile?.id || context.userProfile?._id;
    if (!senderId) {
      return {
        success: false,
        reason: "unauthenticated",
        message: "You must be logged in to send team invitations.",
      };
    }

    const { teamId, receiverId, receiverName } = args;

    if (!teamId || !receiverId) {
      return {
        success: false,
        reason: "missing_parameters",
        message: "Team ID and recipient User ID are required to send an invitation.",
      };
    }

    // 1. Fetch receiver user
    let receiverUser = null;
    if (mongoose.Types.ObjectId.isValid(receiverId)) {
      receiverUser = await User.findById(receiverId);
    }
    if (!receiverUser) {
      receiverUser = await User.findOne({
        $or: [{ _id: receiverId }, { id: receiverId }],
      });
    }

    if (!receiverUser) {
      return {
        success: false,
        reason: "user_not_found",
        message: `Could not find candidate user ${receiverName || ""}.`,
      };
    }

    const actualReceiverId = receiverUser._id;
    const actualReceiverIdStr = actualReceiverId.toString();
    const senderIdStr = senderId.toString();

    if (senderIdStr === actualReceiverIdStr) {
      return {
        success: false,
        reason: "self_invitation",
        message: "You cannot invite yourself to a team.",
      };
    }

    // 2. Fetch team
    let team = null;
    if (mongoose.Types.ObjectId.isValid(teamId)) {
      team = await Team.findById(teamId);
    }
    if (!team) {
      team = await Team.findOne({ id: teamId });
    }

    if (!team) {
      return {
        success: false,
        reason: "team_not_found",
        message: "Target team was not found.",
      };
    }

    // 3. Sender authorization check
    const isLeaderOrMember =
      team.createdBy.toString() === senderIdStr ||
      (team.leader && team.leader.toString() === senderIdStr) ||
      (team.memberIds && team.memberIds.includes(senderIdStr));

    if (!isLeaderOrMember) {
      return {
        success: false,
        reason: "unauthorized",
        message: "Only team members or leaders can send invitations to this team.",
      };
    }

    // 4. Connection check
    const isConnected = await Connection.findOne({
      $or: [
        { sender: senderId, receiver: actualReceiverId, status: "accepted" },
        { sender: actualReceiverId, receiver: senderId, status: "accepted" },
      ],
    });

    if (!isConnected) {
      return {
        success: false,
        reason: "not_connected",
        message: `You must be connected with ${receiverUser.name} to send a team invitation.`,
      };
    }

    // 5. Capacity check
    const currentSize = team.members && team.members.length > 0 ? team.members.length : (team.currentSize || 1);
    if (currentSize >= team.maxSize) {
      return {
        success: false,
        reason: "team_full",
        message: `Your team '${team.teamName}' is currently full (${team.maxSize}/${team.maxSize}).`,
      };
    }

    // 6. Existing member check
    const isAlreadyMember = (team.members || []).some((m) => {
      const mId = String(m.user?._id || m.user?.id || m.user || m);
      return mId === actualReceiverIdStr;
    });

    if (isAlreadyMember) {
      return {
        success: true,
        reason: "already_member",
        message: `${receiverUser.name} is already a member of '${team.teamName}'.`,
      };
    }

    // Create TeamInvitation record
    const invitation = await TeamInvitation.create({
      team: team._id,
      sender: senderId,
      receiver: actualReceiverId,
      status: "pending",
    });

    // Notify receiver
    try {
      const senderUser = await User.findById(senderId);
      await createNotification({
        recipient: actualReceiverId,
        sender: senderId,
        type: "TEAM_INVITATION",
        title: "Team invitation",
        message: `${senderUser?.name || "A user"} invited you to join '${team.teamName}'.`,
        entityType: "Team",
        entityId: team._id,
        metadata: { invitationId: invitation._id.toString(), teamId: team._id.toString() },
      });
    } catch (notifErr) {
      console.warn("[inviteToTeam] Failed to create notification:", notifErr.message);
    }

    return {
      success: true,
      action: "invite_to_team",
      message: `Invitation sent to ${receiverUser.name} for team '${team.teamName}'.`,
      receiverName: receiverUser.name,
      teamName: team.teamName,
    };
  } catch (error) {
    console.error("[inviteToTeam Error]:", error);
    return {
      success: false,
      reason: "server_error",
      message: "Could not send team invitation right now. Please try again later.",
    };
  }
}

module.exports = {
  inviteToTeamDefinition,
  inviteToTeam,
};
