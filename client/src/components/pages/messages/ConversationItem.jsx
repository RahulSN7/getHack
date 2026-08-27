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
  if (isNaN(date.getTime())) return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const msgDate = new Date(date);
  msgDate.setHours(0, 0, 0, 0);

  if (msgDate.getTime() === today.getTime()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (msgDate.getTime() === yesterday.getTime()) {
    return "Yesterday";
  }

  const diffDays = Math.floor((today.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function ConversationItem({ channel, currentUserId, isActive, isFavourite, isClosed, onClick, onReopen }) {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

  // Extract the other user from channel members
  const members = Object.values(channel.state?.members || {});
  const otherMember = members.find(
    (m) => String(m.user_id || m.user?.id) !== String(currentUserId)
  );
  const otherUser = otherMember?.user || {};

  let name = otherUser.name;
  if (!name || name === otherUser.id) {
    name = channel.data?.targetName || "Participant";
  }
  const avatar = otherUser.image || channel.data?.targetAvatar || "";
  const userId = otherUser.id || otherMember?.user_id || "";

  // Last message & attachment preview extraction
  const messages = channel.state?.messages || [];
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  let lastMessageText = "";
  if (lastMessage) {
    if (lastMessage.text && lastMessage.text.trim()) {
      lastMessageText = lastMessage.text.trim();
    } else if (Array.isArray(lastMessage.attachments) && lastMessage.attachments.length > 0) {
      const att = lastMessage.attachments[0];
      const isImg =
        att.type === "image" ||
        !!att.image_url ||
        [".jpg", ".jpeg", ".png", ".gif", ".webp"].some((ext) =>
          (att.title || att.name || att.asset_url || "").toLowerCase().endsWith(ext)
        );
      const title = att.title || att.name || "File";
      lastMessageText = isImg ? "🖼️ Image" : `📎 ${title}`;
    }
  }

  if (!lastMessageText) {
    lastMessageText =
      channel.data?.last_message_preview ||
      (channel.state?.last_message_at || channel.data?.last_message_at ? "Message" : "No messages yet");
  }

  const lastMessageTime =
    lastMessage?.created_at || channel.state?.last_message_at || channel.data?.last_message_at || "";

  // Unread count from Stream Chat SDK
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
        relative flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-all duration-150 group/conv
        ${isActive
          ? "bg-indigo-50/80 dark:bg-indigo-500/10 border-l-[3px] border-indigo-600 dark:border-indigo-500"
          : "hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 border-l-[3px] border-transparent"
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
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`text-sm truncate ${unreadCount > 0
                  ? "font-bold text-neutral-900 dark:text-white"
                  : "font-semibold text-neutral-800 dark:text-neutral-200"
                }`}
            >
              {name}
            </span>
            {isFavourite && (
              <span className="shrink-0 text-red-500 text-xs" title="Favourite conversation">
                ❤️
              </span>
            )}
            {isClosed && (
              <span className="shrink-0 text-[10px] font-semibold text-neutral-400 bg-neutral-200/70 dark:bg-neutral-800 dark:text-neutral-400 px-1.5 py-0.5 rounded">
                Closed
              </span>
            )}
          </div>

          <span
            className={`shrink-0 text-[11px] ${unreadCount > 0
                ? "font-semibold text-indigo-600 dark:text-indigo-400"
                : "text-neutral-400 dark:text-neutral-500"
              }`}
          >
            {formatTime(lastMessageTime)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p
            className={`text-xs truncate ${unreadCount > 0
                ? "font-medium text-neutral-700 dark:text-neutral-300"
                : "text-neutral-500 dark:text-neutral-400"
              }`}
          >
            {lastMessageText || "No messages yet"}
          </p>

          <div className="flex items-center gap-1.5 shrink-0">
            {isClosed && onReopen && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onReopen(channel);
                }}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10"
              >
                Reopen
              </button>
            )}

            {unreadCount > 0 && !isClosed && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-500 px-1.5 text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConversationItem;
