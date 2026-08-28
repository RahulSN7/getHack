// ---------------------------------------------------------------------------
// TeamInvitationCard.jsx — Dedicated Interactive Card Component for Team Invitations in Chat
// Renders inside Stream Chat message list as a hackathon team invitation card.
// Allows recipients to Accept/Reject directly inside the chat conversation.
// ---------------------------------------------------------------------------

import { useState } from "react";
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

  const invitationId = msg.invitation_id || msg.invitationId || "";
  const teamName = msg.team_name || msg.teamName || "Team";
  const hackathonName = msg.hackathon_name || msg.hackathonName || "Hackathon";
  const senderId = String(msg.sender_id || msg.senderId || "");
  const senderName = msg.sender_name || msg.senderName || "A connection";
  const receiverId = String(msg.receiver_id || msg.receiverId || "");
  const currentStatus = msg.invitation_status || msg.invitationStatus || "pending";
  const currentSize = msg.current_size ?? msg.currentSize ?? 1;
  const maxSize = msg.max_size ?? msg.maxSize ?? 4;

  const isMine = String(currentUserId) === senderId;
  const isRecipient = String(currentUserId) === receiverId;

  const handleRespond = async (action) => {
    if (!invitationId || loading) return;
    try {
      setLoading(true);
      setActionError(null);

      const res = await invitationService.respondToInvitation(invitationId, action);
      if (onInvitationUpdated) {
        onInvitationUpdated(res.invitation, res.team);
      }
    } catch (err) {
      console.error("Failed to respond to invitation:", err);
      setActionError(err.message || "Failed to process invitation response.");
    } finally {
      setLoading(false);
    }
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
      <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="text-base">🤝</span>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Hackathon Team Invitation
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-medium">
          <span>{formatMessageTime(msg.created_at)}</span>
          {isMine && (
            <MessageStatus
              msg={msg}
              channel={channel}
              currentUserId={currentUserId}
              forceOpen={forceOpen}
              onClosePopover={onClosePopover}
            />
          )}
        </div>
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
              You invited a connection to join
            </>
          ) : (
            <>
              <span className="font-bold text-neutral-900 dark:text-white">{senderName}</span> sent an invitation to join
            </>
          )}
        </p>
        <h4 className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 truncate">
          Team {teamName}
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

      {/* ── Status & Actions Area ── */}
      <div className="pt-1">
        {currentStatus === "pending" ? (
          isRecipient ? (
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
          ) : (
            <div className="text-center py-1.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs">
              Invitation Pending
            </div>
          )
        ) : currentStatus === "accepted" ? (
          <div className="text-center py-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center gap-1">
            <span>✓</span> Invitation Accepted
          </div>
        ) : (
          <div className="text-center py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 font-bold text-xs">
            Invitation Rejected
          </div>
        )}
      </div>
    </div>
  );
}
