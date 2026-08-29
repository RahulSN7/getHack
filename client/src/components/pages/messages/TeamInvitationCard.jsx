// ---------------------------------------------------------------------------
// TeamInvitationCard.jsx — Dedicated Interactive Card Component for Team Invitations in Chat
// Renders inside Stream Chat message list as a hackathon team invitation card.
// Calculates status and CTAs PER LOGGED-IN USER dynamically.
// ---------------------------------------------------------------------------

import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { invitationService } from "../../../services/invitationService";
import MessageStatus from "./MessageStatus";

function formatMessageTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function TeamInvitationCard({ msg, channel, currentUserId, onInvitationUpdated, forceOpen, onClosePopover }) {
  if (msg.deleted_at || msg.type === "deleted") {
    return null;
  }

  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [liveData, setLiveData] = useState(null);

  const invitationId = msg.invitation_id || msg.invitationId || "";
  const targetTeamId = liveData?.team?._id || liveData?.team?.id || msg.team_id || msg.teamId || msg.team || "";
  const teamName = liveData?.team?.teamName || msg.team_name || msg.teamName || "Team";
  const hackathonName = liveData?.team?.hackathonName || msg.hackathon_name || msg.hackathonName || "Hackathon";
  const senderId = String(msg.sender_id || msg.senderId || "");
  const senderName = msg.sender_name || msg.senderName || "A connection";
  const receiverId = String(msg.receiver_id || msg.receiverId || "");
  const isGroupInvitation = Boolean(msg.is_group_invitation || liveData?.invitation?.isGroupInvitation);

  // Dynamic team size calculation from live team data or message payload fallback
  const currentSize = liveData?.team?.members?.length ?? liveData?.team?.currentSize ?? msg.current_size ?? msg.currentSize ?? 1;
  const maxSize = liveData?.team?.maxSize ?? msg.max_size ?? msg.maxSize ?? 4;

  const isMine = String(currentUserId) === senderId;
  const isRecipient = String(currentUserId) === receiverId;

  // Fetch persisted invitation & team details to evaluate per-user state accurately
  useEffect(() => {
    let isMounted = true;
    if (!invitationId) return;

    async function loadInvitationDetails() {
      try {
        const res = await invitationService.getInvitation(invitationId);
        if (isMounted && res?.success) {
          setLiveData({
            invitation: res.invitation,
            team: res.team || res.invitation?.team,
          });
        }
      } catch (err) {
        // Silently fallback to message metadata if API is unreachable
      }
    }

    loadInvitationDetails();
    return () => {
      isMounted = false;
    };
  }, [invitationId]);

  // Determine if the current user has already joined the hackathon team
  const currentUserHasJoinedTeam = useMemo(() => {
    if (!currentUserId) return false;
    const cId = String(currentUserId);

    const teamObj = liveData?.team;
    if (teamObj) {
      if (Array.isArray(teamObj.memberIds) && teamObj.memberIds.map(String).includes(cId)) {
        return true;
      }
      if (Array.isArray(teamObj.members)) {
        return teamObj.members.some((m) => {
          const mId = String(m._id || m.id || m.user?._id || m.user?.id || m.user || "");
          return mId === cId;
        });
      }
    }

    const invObj = liveData?.invitation;
    if (invObj && Array.isArray(invObj.acceptedUserIds)) {
      if (invObj.acceptedUserIds.map(String).includes(cId)) {
        return true;
      }
    }

    return false;
  }, [currentUserId, liveData]);

  // Determine if the current user has explicitly declined this invitation
  const currentUserDeclined = useMemo(() => {
    if (!currentUserId) return false;
    const cId = String(currentUserId);

    const invObj = liveData?.invitation;
    if (invObj && Array.isArray(invObj.declinedUserIds)) {
      if (invObj.declinedUserIds.map(String).includes(cId)) {
        return true;
      }
    }
    // For 1-on-1 direct invitation where current user is receiver and status is rejected
    if (!isGroupInvitation && isRecipient && (msg.invitation_status === "rejected" || invObj?.status === "rejected")) {
      return true;
    }
    return false;
  }, [currentUserId, liveData, isGroupInvitation, isRecipient, msg.invitation_status]);

  const handleRespond = async (action) => {
    if (!invitationId || loading) return;
    try {
      setLoading(true);
      setActionError(null);

      const res = await invitationService.respondToInvitation(invitationId, action);
      if (res?.success) {
        setLiveData({
          invitation: res.invitation,
          team: res.team || res.invitation?.team,
        });
        if (onInvitationUpdated) {
          onInvitationUpdated(res.invitation, res.team);
        }
      }
    } catch (err) {
      console.error("Failed to respond to invitation:", err);
      setActionError(err.message || "Failed to process invitation response.");
    } finally {
      setLoading(false);
    }
  };

  // Render per-user status badge or interactive response buttons
  const renderStatusOrActions = () => {
    // CASE 1: User already joined the team
    if (currentUserHasJoinedTeam) {
      return (
        <div className="text-center py-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center gap-1">
          <span>✓</span> You already joined
        </div>
      );
    }

    // CASE 2: User explicitly declined the invitation
    if (currentUserDeclined) {
      return (
        <div className="text-center py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 font-bold text-xs">
          Invitation Declined
        </div>
      );
    }

    // CASE 3: Team capacity is full
    if (currentSize >= maxSize) {
      return (
        <div className="text-center py-2 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs">
          Team Full
        </div>
      );
    }

    // CASE 4: 1-on-1 Invitation Sender (who isn't a recipient)
    if (!isGroupInvitation && isMine) {
      const overallStatus = liveData?.invitation?.status || msg.invitation_status || "pending";
      if (overallStatus === "accepted") {
        return (
          <div className="text-center py-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center gap-1">
            <span>✓</span> Invitation Accepted
          </div>
        );
      }
      if (overallStatus === "rejected") {
        return (
          <div className="text-center py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 font-bold text-xs">
            Invitation Rejected
          </div>
        );
      }
      return (
        <div className="text-center py-1.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs">
          Invitation Pending
        </div>
      );
    }

    // CASE 5: User has NOT responded yet & team has space — Render actionable CTAs
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleRespond("accept")}
          disabled={loading}
          className="
            flex-1 py-2 px-3 rounded-xl text-xs font-bold text-white
            bg-emerald-600 hover:bg-emerald-500 shadow-xs transition-colors
            disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer
          "
        >
          {loading ? (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <span>✓</span> Accept
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleRespond("reject")}
          disabled={loading}
          className="
            flex-1 py-2 px-3 rounded-xl text-xs font-bold text-neutral-700 dark:text-neutral-300
            bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700
            border border-neutral-200 dark:border-neutral-700 transition-colors
            disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer
          "
        >
          Reject
        </button>
      </div>
    );
  };

  return (
    <div
      className={`
        w-full max-w-sm rounded-2xl border p-4 shadow-md transition-all space-y-3.5 my-1
        ${isMine
          ? "bg-neutral-900 border-neutral-800 text-white"
          : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white"
        }
      `}
    >
      {/* ── Header Badge ── */}
      <div className="flex items-center gap-2 pb-2 border-b border-neutral-100 dark:border-neutral-800">
        <span className="text-base">🤝</span>
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          Hackathon Team Invitation
        </span>
      </div>

      {/* ── Subtitle Description ── */}
      <div className="space-y-1">
        <p className="text-xs text-neutral-600 dark:text-neutral-300">
          {isRecipient ? (
            <>
              <span className="font-bold text-neutral-900 dark:text-white">{senderName}</span> invited you to join
            </>
          ) : isMine ? (
            <>
              You invited {isGroupInvitation ? "the group" : "a connection"} to join
            </>
          ) : (
            <>
              <span className="font-bold text-neutral-900 dark:text-white">{senderName}</span> sent an invitation to join
            </>
          )}
        </p>
        <h4 className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 truncate">
          {targetTeamId ? (
            <Link
              to={`/team/${targetTeamId}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:underline cursor-pointer transition-colors"
              title={`View Team ${teamName}`}
            >
              Team {teamName}
            </Link>
          ) : (
            <span>Team {teamName}</span>
          )}
        </h4>
      </div>

      {/* ── Structured Details Box ── */}
      <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-700/60 text-xs">
        <div>
          <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
            Hackathon
          </p>
          <p className="font-bold text-neutral-800 dark:text-neutral-200 truncate mt-0.5">
            {hackathonName}
          </p>
        </div>

        <div>
          <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
            Team Size
          </p>
          <p className="font-bold text-neutral-800 dark:text-neutral-200 mt-0.5">
            {currentSize} / {maxSize} members
          </p>
        </div>
      </div>

      {/* ── Action Error Display ── */}
      {actionError && (
        <p className="text-[11px] font-semibold text-red-500 bg-red-500/10 p-2 rounded-lg text-center">
          {actionError}
        </p>
      )}

      {/* ── Per-User Status & Actions Area ── */}
      <div className="pt-1">
        {renderStatusOrActions()}
      </div>

      {/* ── Bottom Message Metadata (Timestamp & Read Receipt) ── */}
      <div
        className={`
          mt-2 pt-1 flex items-center gap-1 text-[10px] opacity-75
          ${isMine ? "justify-end text-neutral-300 dark:text-neutral-400" : "justify-start text-neutral-400 dark:text-neutral-500"}
        `}
      >
        <span>{formatMessageTime(msg.created_at)}</span>
        {isMine && (
          <span className="ml-0.5 inline-flex items-center">
            <MessageStatus
              msg={msg}
              channel={channel}
              currentUserId={currentUserId}
              forceOpen={forceOpen}
              onClosePopover={onClosePopover}
            />
          </span>
        )}
      </div>
    </div>
  );
}
