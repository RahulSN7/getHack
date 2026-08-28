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

function ConversationItem({ channel, currentUserId, isActive, isFavourite, isClosed, clearedAt, onClick, onReopen }) {
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

  // Last message & attachment preview extraction taking per-user clearedAt into account
  const clearTime = clearedAt ? new Date(clearedAt).getTime() : 0;
  const rawMessages = channel.state?.messages || [];
  const visibleMessages = clearTime
    ? rawMessages.filter((m) => {
        const t = new Date(m.created_at || m.createdAt).getTime();
        return !isNaN(t) && t > clearTime;
      })
    : rawMessages;

  const lastMessage = visibleMessages.length > 0 ? visibleMessages[visibleMessages.length - 1] : null;

  const isLastMessageEdited = Boolean(
    lastMessage &&
    !lastMessage.deleted_at &&
    lastMessage.type !== "deleted" &&
    (lastMessage.is_edited ||
      lastMessage.message_text_updated_at ||
      (Array.isArray(lastMessage.edit_history) && lastMessage.edit_history.length > 0) ||
      (Array.isArray(lastMessage.extraData?.edit_history) && lastMessage.extraData.edit_history.length > 0))
  );

  let lastMessageText = "";
  if (lastMessage) {
    if (lastMessage.deleted_at || lastMessage.type === "deleted") {
      lastMessageText = "This message was deleted";
    } else if (lastMessage.custom_type === "team_invitation" || lastMessage.type === "team_invitation") {
      lastMessageText = "🤝 Hackathon Team Invitation";
    } else if (lastMessage.text && lastMessage.text.trim()) {
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

  if (isLastMessageEdited && lastMessageText && !lastMessageText.startsWith("This message was deleted") && !lastMessageText.startsWith("Edited ·")) {
    lastMessageText = `Edited · ${lastMessageText}`;
  }

  if (!lastMessageText) {
    lastMessageText = (clearTime && visibleMessages.length === 0)
      ? "No messages yet"
      : (
        channel.data?.last_message_preview ||
        (channel.state?.last_message_at || channel.data?.last_message_at ? "Message" : "No messages yet")
      );
  }

  const lastMessageTime = lastMessage?.created_at
    ? lastMessage.created_at
    : (clearTime && visibleMessages.length === 0 ? "" : (channel.state?.last_message_at || channel.data?.last_message_at || ""));

function getChannelUnreadCount(channel, currentUserId, isActive, clearedAt) {
  if (!channel) return 0;
  if (isActive) return 0;

  const clearTime = clearedAt ? new Date(clearedAt).getTime() : 0;
  const rawMessages = channel.state?.messages || [];
  const visibleMessages = clearTime
    ? rawMessages.filter((m) => {
        const t = new Date(m.created_at || m.createdAt).getTime();
        return !isNaN(t) && t > clearTime;
      })
    : rawMessages;

  if (clearTime && visibleMessages.length === 0) return 0;

  const userReadState = channel.state?.read?.[String(currentUserId)];
  if (userReadState?.last_read) {
    const lastReadTime = new Date(userReadState.last_read).getTime();
    if (!isNaN(lastReadTime)) {
      const unreadIncoming = visibleMessages.filter((m) => {
        const msgSenderId = String(m.user?.id || m.user_id || "");
        if (msgSenderId === String(currentUserId)) return false;
        const msgTime = new Date(m.created_at || m.createdAt).getTime();
        return !isNaN(msgTime) && msgTime > lastReadTime;
      });
      return unreadIncoming.length;
    }
  }

  if (typeof channel.state?.unreadCount === "number" && channel.state.unreadCount === 0) {
    return 0;
  }

  return channel.countUnread?.() || channel.state?.unreadCount || 0;
}

  const unreadCount = getChannelUnreadCount(channel, currentUserId, isActive, clearedAt);

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
            {unreadCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-500 px-1.5 text-[10px] font-bold text-white shadow-2xs">
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
