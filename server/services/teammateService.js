// ---------------------------------------------------------------------------
// server/services/teammateService.js — Shared Teammate Discovery Service
// Single source of truth for candidate teammate retrieval across Find Teammates page & AI
// ---------------------------------------------------------------------------

const User = require("../models/user");
const Connection = require("../models/connection");
const { isProfileComplete } = require("../utils/profileValidation");

/**
 * Normalizes availability string to standard "Available" or "Not Available"
 */
function normalizeAvailability(val) {
  if (!val || typeof val !== "string") return "Not Available";
  const clean = val.trim().toLowerCase().replace(/_/g, " ").replace(/-/g, " ");
  if (clean === "available" || clean === "online") {
    return "Available";
  }
  return "Not Available";
}

/**
 * Retrieve eligible teammate candidate user documents from MongoDB.
 * Shared business logic for both the Find Teammates page and GetHack AI:
 * 1. Role must be "participant".
 * 2. Excludes current authenticated user (_id != currentUserId).
 * 3. Excludes users with accepted connection status with current user.
 * 4. Requires complete profile (isProfileComplete).
 * 
 * @param {string|null} currentUserId - Authenticated user ID
 * @returns {Promise<{ eligibleUsers: Array<Object>, connectionsMap: Object }>}
 */
async function getEligibleTeammateCandidates(currentUserId = null) {
  let acceptedConnectedUserIds = new Set();
  let connectionsMap = {};

  const currStr = currentUserId ? currentUserId.toString() : null;

  if (currStr) {
    const connections = await Connection.find({
      $or: [{ sender: currentUserId }, { receiver: currentUserId }],
    });

    connections.forEach((c) => {
      const senderId = c.sender.toString();
      const receiverId = c.receiver.toString();
      const otherId = senderId === currStr ? receiverId : senderId;

      if (c.status === "accepted") {
        acceptedConnectedUserIds.add(otherId);
      }

      if (c.status === "pending" || c.status === "accepted") {
        connectionsMap[otherId] = {
          status: c.status,
          isSender: senderId === currStr,
          requestId: c._id.toString(),
        };
      }
    });
  }

  const excludedUserIds = currStr
    ? [currStr, ...Array.from(acceptedConnectedUserIds)]
    : [];

  const users = await User.find({
    role: "participant",
    ...(excludedUserIds.length > 0 ? { _id: { $nin: excludedUserIds } } : {}),
  }).sort({ createdAt: -1 });

  const eligibleUsers = users.filter((u) => {
    const isNotExcluded = currStr
      ? !excludedUserIds.includes(u._id.toString())
      : true;
    return isNotExcluded && isProfileComplete(u);
  });

  return { eligibleUsers, connectionsMap };
}

module.exports = {
  getEligibleTeammateCandidates,
  normalizeAvailability,
};
