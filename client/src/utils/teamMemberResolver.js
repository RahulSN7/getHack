// ---------------------------------------------------------------------------
// client/src/utils/teamMemberResolver.js
// Utility helper functions for normalizing and resolving team member & leader profiles
// Prevents rendering raw MongoDB ObjectIds as visible user names
// ---------------------------------------------------------------------------

import { TEAMMATES } from "../data/teammates";

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * Checks if a string looks like a raw MongoDB ObjectId hex string.
 */
export function isObjectId(str) {
  if (!str || typeof str !== "string") return false;
  return OBJECT_ID_REGEX.test(str.trim());
}

/**
 * Normalizes a single team member entry into a clean user profile object.
 * Handles both populated Mongoose User objects and raw member ID strings/fallbacks.
 */
export function resolveTeamMember(memberItem, currentUser, createdById) {
  if (!memberItem) {
    return {
      id: "unknown",
      name: "Team Member",
      avatar: "",
      role: "Member",
      skills: [],
      email: "",
    };
  }

  // Case A: Member is an object with a populated 'user' field from backend
  const u = typeof memberItem.user === "object" && memberItem.user !== null ? memberItem.user : null;
  if (u) {
    const rawId = u._id || u.id || memberItem._id || memberItem.id;
    const userIdStr = rawId ? rawId.toString() : "unknown";
    const profile = u.profile || {};

    const name = u.name && !isObjectId(u.name) ? u.name : "Team Member";
    const avatar = profile.avatar || u.avatar || "";
    const role = profile.role || u.role || memberItem.role || "Member";
    const skills = Array.isArray(profile.skills) ? profile.skills : Array.isArray(u.skills) ? u.skills : [];

    return {
      id: userIdStr,
      name,
      avatar,
      role,
      skills,
      email: u.email || "",
      isOwner: Boolean(createdById && userIdStr === createdById.toString()),
    };
  }

  // Case B: memberItem itself is a populated User object
  if (typeof memberItem === "object" && memberItem !== null && (memberItem.name || memberItem._id)) {
    const rawId = memberItem._id || memberItem.id;
    const userIdStr = rawId ? rawId.toString() : "unknown";
    const profile = memberItem.profile || {};

    const name = memberItem.name && !isObjectId(memberItem.name) ? memberItem.name : "Team Member";
    const avatar = profile.avatar || memberItem.avatar || "";
    const role = profile.role || memberItem.role || "Member";
    const skills = Array.isArray(profile.skills) ? profile.skills : Array.isArray(memberItem.skills) ? memberItem.skills : [];

    return {
      id: userIdStr,
      name,
      avatar,
      role,
      skills,
      email: memberItem.email || "",
      isOwner: Boolean(createdById && userIdStr === createdById.toString()),
    };
  }

  // Case C: Raw member ID string
  const mId = typeof memberItem === "string" ? memberItem : memberItem.toString();
  const currentUserIdStr = currentUser?.id || currentUser?._id;

  // C1: Matches current logged in user
  if (currentUser && (mId === currentUserIdStr || mId === currentUserIdStr?.toString())) {
    const p = currentUser.profile || {};
    return {
      id: currentUserIdStr.toString(),
      name: currentUser.name || "Team Member",
      avatar: p.avatar || currentUser.avatar || "",
      role: p.role || currentUser.role || "Member",
      skills: Array.isArray(p.skills) ? p.skills : Array.isArray(currentUser.skills) ? currentUser.skills : [],
      email: currentUser.email || "",
      isOwner: Boolean(createdById && currentUserIdStr.toString() === createdById.toString()),
    };
  }

  // C2: Matches static TEAMMATES dataset
  const foundInTeammates = TEAMMATES.find((item) => item.id === mId || item.username === mId);
  if (foundInTeammates) {
    const p = foundInTeammates.profile || {};
    return {
      id: foundInTeammates.id,
      name: foundInTeammates.name,
      avatar: foundInTeammates.avatar || p.avatar || "",
      role: p.role || foundInTeammates.role || "Member",
      skills: Array.isArray(p.skills) ? p.skills : Array.isArray(foundInTeammates.skills) ? foundInTeammates.skills : [],
      email: foundInTeammates.email || "",
      isOwner: Boolean(createdById && foundInTeammates.id === createdById.toString()),
    };
  }

  // C3: Fallback formatting — NEVER show 24-character ObjectId string
  const safeName = isObjectId(mId) ? "Team Member" : mId.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  return {
    id: mId,
    name: safeName || "Team Member",
    avatar: "",
    role: "Member",
    skills: [],
    email: "",
    isOwner: Boolean(createdById && mId === createdById.toString()),
  };
}

/**
 * Resolves all members for a team into normalized profile objects.
 */
export function resolveTeamMembers(team, currentUser) {
  if (!team) return [];

  const rawCreator = team.createdBy || team.leader;
  const createdById = typeof rawCreator === "object" ? (rawCreator?._id || rawCreator?.id) : rawCreator;

  // Prefer populated team.members array
  if (Array.isArray(team.members) && team.members.length > 0) {
    return team.members
      .map((m) => resolveTeamMember(m, currentUser, createdById))
      .filter(Boolean);
  }

  // Fallback to team.memberIds array
  if (Array.isArray(team.memberIds) && team.memberIds.length > 0) {
    return team.memberIds
      .map((mId) => resolveTeamMember(mId, currentUser, createdById))
      .filter(Boolean);
  }

  // Fallback to leader if available
  if (rawCreator) {
    return [resolveTeamMember(rawCreator, currentUser, createdById)];
  }

  return [];
}

/**
 * Resolves team leader into a normalized profile object.
 */
export function resolveTeamLeader(team, currentUser) {
  if (!team) return null;
  const rawLeader = team.leader || team.createdBy;
  if (!rawLeader) return null;
  return resolveTeamMember(rawLeader, currentUser, rawLeader?._id || rawLeader?.id || rawLeader);
}

/**
 * Unified team action state machine evaluator.
 * Determines the single source of truth action state for any team & user combination.
 * Returns: { type: 'leader' | 'member' | 'pending' | 'full' | 'eligible', label: string, disabled: boolean }
 */
export function getTeamActionState(team, currentUser, sentRequests = []) {
  if (!team) return { type: "eligible", label: "Request to Join", disabled: false };

  const teamIdStr = (team._id || team.id)?.toString();
  const currentUserIdStr = (currentUser?._id || currentUser?.id)?.toString();

  const rawLeader = team.createdBy || team.leader;
  const leaderIdStr = (typeof rawLeader === "object" ? (rawLeader?._id || rawLeader?.id) : rawLeader)?.toString();

  const isLeader = Boolean(
    currentUserIdStr &&
      (currentUserIdStr === leaderIdStr || leaderIdStr === "priya-sharma" || leaderIdStr === "user-current")
  );
  if (isLeader) {
    return { type: "leader", label: "Your Team", disabled: true };
  }

  const memberIdsList = Array.isArray(team.memberIds) ? team.memberIds : [];
  const membersList = Array.isArray(team.members) ? team.members : [];
  const isMember = Boolean(
    currentUserIdStr &&
      (memberIdsList.includes(currentUserIdStr) ||
        membersList.some((m) => (m.user?._id || m.user?.id || m.user || m)?.toString() === currentUserIdStr))
  );
  if (isMember) {
    return { type: "member", label: "You are a member", disabled: true };
  }

  const pendingReq = Array.isArray(sentRequests)
    ? sentRequests.find(
        (r) => (r.team?._id || r.team?.id || r.team)?.toString() === teamIdStr && r.status === "pending"
      )
    : null;
  if (pendingReq) {
    return { type: "pending", label: "✓ Request Sent", disabled: true };
  }

  const maxSize = team.maxSize || 4;
  const currentSize = team.currentSize || 1;
  const spotsLeft = Math.max(0, maxSize - currentSize);
  if (spotsLeft === 0 || team.status === "Full") {
    return { type: "full", label: "Team Full", disabled: true };
  }

  return { type: "eligible", label: "Request to Join", disabled: false };
}
