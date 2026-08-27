// ---------------------------------------------------------------------------
// ConversationItem.jsx — Individual Conversation Row
// WhatsApp-style conversation row with avatar, name, last message, time, unread
// Avatar click → profile | Row click → open chat
// ---------------------------------------------------------------------------

import { useState } from "react";
import { useNavigate } from "react-router-dom";

function formatTime(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function ConversationItem({ channel, currentUserId, isActive, onClick }) {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

  // Extract the other user from channel members
  const members = Object.values(channel.state?.members || {});
  const otherMember = members.find((m) => m.user_id !== currentUserId || m.user?.id !== currentUserId);
  const otherUser = otherMember?.user || {};

  const name = otherUser.name || "User";
  const avatar = otherUser.image || "";
  const userId = otherUser.id || "";

  // Last message
  const messages = channel.state?.messages || [];
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const lastMessageText = lastMessage?.text || "";
  const lastMessageTime = lastMessage?.created_at || channel.data?.last_message_at || "";

  // Unread count
  const unreadCount = channel.countUnread?.() || 0;

  // Initials fallback
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "GH";

  const handleAvatarClick = (e) => {
    e.stopPropagation();
    if (userId) {
      navigate(`/profile/${userId}`);
    }
  };

  return (
    <div
      onClick={onClick}
      className={`
        flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors duration-100
        ${
          isActive
            ? "bg-indigo-50 dark:bg-indigo-500/10 border-l-2 border-indigo-500"
            : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50 border-l-2 border-transparent"
        }
      `}
    >
      {/* Avatar — clicks go to profile */}
      <button
        type="button"
        onClick={handleAvatarClick}
        className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 dark:focus:ring-offset-neutral-900"
        title={`View ${name}'s profile`}
      >
        {avatar && !imgError ? (
          <img
            src={avatar.startsWith("http") ? avatar : avatar}
            alt={name}
            onError={() => setImgError(true)}
            className="h-12 w-12 rounded-full object-cover border border-neutral-200 dark:border-neutral-700"
          />
        ) : (
          <div className="grid h-12 w-12 place-items-center rounded-full bg-indigo-100 font-bold text-sm text-indigo-600 border border-neutral-200 dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-neutral-700">
            {initials}
          </div>
        )}
      </button>

      {/* Content — clicks open chat */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-sm truncate ${
              unreadCount > 0
                ? "font-bold text-neutral-900 dark:text-white"
                : "font-semibold text-neutral-800 dark:text-neutral-200"
            }`}
          >
            {name}
          </span>
          <span
            className={`shrink-0 text-[11px] ${
              unreadCount > 0
                ? "font-semibold text-indigo-600 dark:text-indigo-400"
                : "text-neutral-400 dark:text-neutral-500"
            }`}
          >
            {formatTime(lastMessageTime)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p
            className={`text-xs truncate ${
              unreadCount > 0
                ? "font-medium text-neutral-700 dark:text-neutral-300"
                : "text-neutral-500 dark:text-neutral-400"
            }`}
          >
            {lastMessageText || "No messages yet"}
          </p>

          {unreadCount > 0 && (
            <span className="shrink-0 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-500 px-1.5 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ConversationItem;
