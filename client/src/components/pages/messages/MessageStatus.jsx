// ---------------------------------------------------------------------------
// MessageStatus.jsx — WhatsApp-Style Message Status & Read Receipts
// Displays Sending (◷), Sent (✓), Delivered (✓✓ neutral), Read (✓✓ indigo), Failed (⚠)
// Powered by Stream Chat message state and channel read events.
// ---------------------------------------------------------------------------

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

export function getMessageStatusDetails(msg, channel, currentUserId) {
  if (!msg) return { status: "sent", readDetails: [], deliveredDetails: [] };

  // Failed status
  if (msg.status === "failed" || msg.error || msg.send_failed) {
    return { status: "failed", readDetails: [], deliveredDetails: [] };
  }

  // Sending status
  if (msg.status === "sending" || msg.sending || msg._local) {
    return { status: "sending", readDetails: [], deliveredDetails: [] };
  }

  const createdTime = new Date(msg.created_at || Date.now()).getTime();
  const readStates = channel?.state?.read || {};
  const members = channel?.state?.members || {};

  const recipientIds = Object.keys(members).filter(
    (uid) => String(uid) !== String(currentUserId)
  );

  if (recipientIds.length === 0) {
    return { status: "sent", readDetails: [], deliveredDetails: [] };
  }

  const readDetails = [];
  const deliveredDetails = [];

  for (const rId of recipientIds) {
    const memberObj = members[rId];
    const rName = memberObj?.user?.name || memberObj?.user?.id || "Participant";
    const rRead = readStates[rId];
    const rLastRead = rRead?.last_read ? new Date(rRead.last_read).getTime() : 0;

    if (rLastRead >= createdTime) {
      readDetails.push({
        id: rId,
        name: rName,
        time: rRead.last_read,
      });
      deliveredDetails.push({
        id: rId,
        name: rName,
        time: rRead.last_read || msg.created_at,
      });
    } else {
      const isOnline = Boolean(memberObj?.user?.online || memberObj?.online);
      if (isOnline) {
        deliveredDetails.push({
          id: rId,
          name: rName,
          time: msg.created_at,
        });
      }
    }
  }

  let status = "sent";
  if (readDetails.length === recipientIds.length && recipientIds.length > 0) {
    status = "read";
  } else if (deliveredDetails.length === recipientIds.length && recipientIds.length > 0) {
    status = "delivered";
  }

  return { status, readDetails, deliveredDetails };
}

export function getMessageStatus(msg, channel, currentUserId) {
  return getMessageStatusDetails(msg, channel, currentUserId).status;
}

function formatDetailTime(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function MessageStatus({ msg, channel, currentUserId, onRetry, forceOpen, onClosePopover }) {
  const [showPopover, setShowPopover] = useState(false);
  const btnRef = useRef(null);
  const [popoverCoords, setPopoverCoords] = useState({ top: 0, left: 0 });

  const isMine = String(msg?.user?.id || msg?.user_id || msg?.sender_id) === String(currentUserId);
  const isDeleted = Boolean(msg?.deleted_at || msg?.type === "deleted");

  // Show status only on sent messages that are not deleted
  if (!isMine || isDeleted || !msg) {
    return null;
  }

  const { status, readDetails, deliveredDetails } = getMessageStatusDetails(msg, channel, currentUserId);

  const togglePopover = (e) => {
    if (e) e.stopPropagation();
    if (showPopover) {
      setShowPopover(false);
      if (onClosePopover) onClosePopover();
      return;
    }

    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const popoverWidth = 220;
      const popoverHeight = 140;

      let top = rect.top - popoverHeight - 6;
      if (top < 8) top = rect.bottom + 6;

      let left = rect.right - popoverWidth;
      left = Math.max(8, Math.min(left, window.innerWidth - popoverWidth - 8));

      setPopoverCoords({ top, left });
      setShowPopover(true);
    }
  };

  // Trigger popover when forceOpen is true (e.g. from More Actions "Message Info")
  useEffect(() => {
    if (forceOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const popoverWidth = 220;
      const popoverHeight = 140;

      let top = rect.top - popoverHeight - 6;
      if (top < 8) top = rect.bottom + 6;

      let left = rect.right - popoverWidth;
      left = Math.max(8, Math.min(left, window.innerWidth - popoverWidth - 8));

      setPopoverCoords({ top, left });
      setShowPopover(true);
    }
  }, [forceOpen]);

  useEffect(() => {
    if (!showPopover) return;

    const handleDismiss = () => {
      setShowPopover(false);
      if (onClosePopover) onClosePopover();
    };
    window.addEventListener("pointerdown", handleDismiss);
    window.addEventListener("keydown", (e) => e.key === "Escape" && handleDismiss());
    window.addEventListener("scroll", handleDismiss, true);
    window.addEventListener("resize", handleDismiss);

    return () => {
      window.removeEventListener("pointerdown", handleDismiss);
      window.removeEventListener("keydown", handleDismiss);
      window.removeEventListener("scroll", handleDismiss, true);
      window.removeEventListener("resize", handleDismiss);
    };
  }, [showPopover, onClosePopover]);

  return (
    <span className="inline-flex items-center shrink-0 ml-1 select-none">
      <button
        ref={btnRef}
        type="button"
        onClick={status === "failed" ? onRetry : togglePopover}
        className="inline-flex items-center justify-center p-0.5 rounded text-[11px] transition-transform active:scale-90 focus:outline-none"
        title={
          status === "sending"
            ? "Sending..."
            : status === "sent"
            ? "Sent to server"
            : status === "delivered"
            ? "Delivered to recipient"
            : status === "read"
            ? "Read by recipient"
            : "Failed to send (Click to retry)"
        }
      >
        {status === "sending" ? (
          <svg className="h-3 w-3 animate-spin text-indigo-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="9" strokeDasharray="24" strokeDashoffset="8" />
          </svg>
        ) : status === "failed" ? (
          <span className="text-rose-400 font-bold text-xs" onClick={onRetry}>
            ⚠
          </span>
        ) : status === "sent" ? (
          /* Single Checkmark ✓ */
          <svg className="h-3.5 w-3.5 text-indigo-200/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : status === "delivered" ? (
          /* Double Checkmark ✓✓ (Neutral) */
          <svg className="h-3.5 w-4 text-indigo-200/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L7 17l-5-5" />
            <path d="M22 6l-11 11" />
          </svg>
        ) : (
          /* Double Checkmark ✓✓ (Read — Indigo Accent) */
          <svg className="h-3.5 w-4 text-sky-300 dark:text-sky-300 drop-shadow-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L7 17l-5-5" />
            <path d="M22 6l-11 11" />
          </svg>
        )}
      </button>

      {/* Message Info Popover Portal */}
      {showPopover &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: `${popoverCoords.top}px`,
              left: `${popoverCoords.left}px`,
              zIndex: 9999,
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-56 rounded-xl border border-neutral-700 bg-neutral-900/95 p-3 text-white shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 space-y-2.5"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5">
              <span className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
                Message Info
              </span>
              <span className="text-[10px] font-semibold text-neutral-400 capitalize">
                {status}
              </span>
            </div>

            {readDetails.length > 0 ? (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">
                  Read
                </p>
                {readDetails.map((item) => (
                  <div key={`read-${item.id}`} className="flex items-center justify-between text-xs">
                    <span className="truncate font-semibold text-neutral-200">{item.name}</span>
                    <span className="text-[10px] text-neutral-400 shrink-0">{formatDetailTime(item.time)}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {deliveredDetails.length > 0 ? (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  Delivered
                </p>
                {deliveredDetails.map((item) => (
                  <div key={`del-${item.id}`} className="flex items-center justify-between text-xs">
                    <span className="truncate font-semibold text-neutral-300">{item.name}</span>
                    <span className="text-[10px] text-neutral-400 shrink-0">{formatDetailTime(item.time)}</span>
                  </div>
                ))}
              </div>
            ) : (
              readDetails.length === 0 && (
                <p className="text-[11px] italic text-neutral-400">
                  Sent to server
                </p>
              )
            )}
          </div>,
          document.body
        )}
    </span>
  );
}
