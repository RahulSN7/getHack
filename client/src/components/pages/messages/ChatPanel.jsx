// ---------------------------------------------------------------------------
// ChatPanel.jsx — Right-Side Chat Panel with Production Messaging UX
// Includes quick reaction bar (👍 ❤️ 😂 😮 😢 🙏 +), expanded emoji picker,
// replies, edit/delete, copy, typing indicators, search, report user, presence,
// attachments, per-user remove chat, and complete Block/Unblock system.
// ---------------------------------------------------------------------------

import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { chatService } from "../../../services/chatService";
import TeamInvitationCard from "./TeamInvitationCard";
import MessageStatus, { getMessageStatusDetails } from "./MessageStatus";

function formatMessageTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateSeparator(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const msgDate = new Date(d);
  msgDate.setHours(0, 0, 0, 0);

  if (msgDate.getTime() === today.getTime()) {
    return "Today";
  }
  if (msgDate.getTime() === yesterday.getTime()) {
    return "Yesterday";
  }

  const currentYear = today.getFullYear();
  const msgYear = msgDate.getFullYear();

  if (msgYear === currentYear) {
    return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  }
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

// WhatsApp-style message edit time limit window (15 minutes in milliseconds)
export const MESSAGE_EDIT_WINDOW = 15 * 60 * 1000;

export function canEditMessage(msg) {
  if (!msg) return false;
  // Disallow deleted messages
  if (msg.deleted_at || msg.type === "deleted") return false;
  // Disallow team invitations
  if (msg.custom_type === "team_invitation" || msg.type === "team_invitation" || msg.teamInvitation || msg.invitation_id) return false;
  // Disallow file attachments
  if (Array.isArray(msg.attachments) && msg.attachments.length > 0) return false;

  const createdTime = msg.created_at || msg.created_at_time;
  if (!createdTime) return false;

  const createdTimestamp = new Date(createdTime).getTime();
  if (isNaN(createdTimestamp)) return false;

  const age = Date.now() - createdTimestamp;
  return age >= 0 && age <= MESSAGE_EDIT_WINDOW;
}

function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIconEmoji(filename = "", mimeType = "") {
  const ext = "." + (filename.split(".").pop() || "").toLowerCase();
  if (mimeType.includes("pdf") || ext === ".pdf") return "📄";
  if (mimeType.includes("word") || [".doc", ".docx"].includes(ext)) return "📝";
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet") || [".xls", ".xlsx", ".csv"].includes(ext)) return "📊";
  if (mimeType.includes("presentation") || [".ppt", ".pptx"].includes(ext)) return "📊";
  if (mimeType.includes("zip") || mimeType.includes("compressed") || [".zip", ".rar", ".7z", ".tar", ".gz"].includes(ext)) return "📦";
  return "📁";
}

function getFileTypeLabel(filename = "", mimeType = "") {
  const ext = (filename.split(".").pop() || "").toUpperCase();
  if (ext) return ext;
  if (mimeType.includes("pdf")) return "PDF";
  if (mimeType.includes("word")) return "DOC";
  if (mimeType.includes("excel")) return "XLS";
  if (mimeType.includes("zip")) return "ZIP";
  return "FILE";
}

function getMimeType(filename = "") {
  const ext = "." + (filename.split(".").pop() || "").toLowerCase();
  const mimeMap = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".txt": "text/plain",
    ".zip": "application/zip",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };
  return mimeMap[ext] || "application/octet-stream";
}

// Quick 6 Reactions (matching reference design)
const QUICK_REACTIONS = [
  { key: "like", emoji: "👍" },
  { key: "love", emoji: "❤️" },
  { key: "laugh", emoji: "😂" },
  { key: "wow", emoji: "😮" },
  { key: "sad", emoji: "😢" },
  { key: "pray", emoji: "🙏" }
];

// Expanded Emoji List for '+' picker
const EXPANDED_EMOJI_LIST = [
  "👍", "❤️", "😂", "😮", "😢", "🙏",
  "🎉", "🔥", "😊", "🚀", "💡", "💯",
  "👏", "✨", "😍", "🙌", "🤔", "🥳",
  "😎", "😭", "🤩", "🤯", "💪", "👀",
  "⭐", "✅", "❌", "💩", "😴", "🫡"
];

// Stream Chat alphanumeric reaction key mapping
const EMOJI_TO_KEY_MAP = {
  "👍": "like",
  "❤️": "love",
  "😂": "laugh",
  "😮": "wow",
  "😢": "sad",
  "🙏": "pray",
  "🎉": "party",
  "🔥": "fire",
  "😊": "smile",
  "🚀": "rocket",
  "💡": "idea",
  "💯": "hundred",
  "👏": "clap",
  "✨": "sparkles",
  "😍": "heart_eyes",
  "🙌": "hands",
  "🤔": "thinking",
  "🥳": "celebrate",
  "😎": "cool",
  "😭": "sob",
  "🤩": "star_struck",
  "🤯": "exploding_head",
  "💪": "flex",
  "👀": "eyes",
  "⭐": "star",
  "✅": "check",
  "❌": "cross"
};

const REACTION_KEY_TO_EMOJI_MAP = Object.entries(EMOJI_TO_KEY_MAP).reduce((acc, [emoji, key]) => {
  acc[key] = emoji;
  return acc;
}, {});

function getStreamReactionKey(emoji) {
  if (EMOJI_TO_KEY_MAP[emoji]) return EMOJI_TO_KEY_MAP[emoji];
  return "emoji_" + Array.from(emoji).map((char) => char.codePointAt(0).toString(16)).join("_");
}

function getDisplayEmoji(typeKey) {
  if (REACTION_KEY_TO_EMOJI_MAP[typeKey]) {
    return REACTION_KEY_TO_EMOJI_MAP[typeKey];
  }
  if (typeKey?.startsWith("emoji_")) {
    try {
      const codePoints = typeKey.replace("emoji_", "").split("_").map((hex) => parseInt(hex, 16));
      return String.fromCodePoint(...codePoints);
    } catch {
      return typeKey;
    }
  }
  return typeKey;
}

const EMOJI_PICKER_LIST = ["👍", "❤️", "😂", "🎉", "🔥", "😊", "🙏", "🚀", "💡", "💯", "👏", "✨", "😍", "🙌", "🤔", "😮"];

// ---------------------------------------------------------------------------
// EditHistoryModal Component
// Displays current message and persistent previous edit history versions
// ---------------------------------------------------------------------------
function EditHistoryModal({ msg, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!msg) return null;

  const historyList = Array.isArray(msg.edit_history)
    ? msg.edit_history
    : Array.isArray(msg.extraData?.edit_history)
      ? msg.extraData.edit_history
      : [];

  const formatHistoryTime = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      return (
        d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
        ", " +
        d.toLocaleDateString([], { day: "numeric", month: "short" })
      );
    } catch {
      return "";
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="text-base">✏️</span>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">Message Edit History</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Current Message */}
          <div className="rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/30 p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Current Message
              </span>
              <span className="text-[10px] text-neutral-400 font-medium">{formatMessageTime(msg.created_at)}</span>
            </div>
            <p className="text-sm font-medium text-neutral-900 dark:text-white whitespace-pre-wrap break-words leading-relaxed">
              {msg.text}
            </p>
          </div>

          {/* Previous History List */}
          <div className="space-y-3 pt-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              Previous Versions
            </span>
            {historyList.length > 0 ? (
              <div className="space-y-2.5">
                {[...historyList].reverse().map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
                        Version {historyList.length - idx}
                      </span>
                      {item.edited_at && (
                        <span className="text-[10px] text-neutral-400">{formatHistoryTime(item.edited_at)}</span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap break-words leading-relaxed">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-400 italic">No previous versions stored for this message.</p>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Floating Action Menu Component for Message Options (Reply, Copy, Edit, Message Info, Delete, Report)
// Positioned relative to message button trigger with zero flicker (pre-calculated initialCoords + useLayoutEffect)
// ---------------------------------------------------------------------------
function FloatingMessageMenu({
  msg,
  initialCoords,
  anchorRect,
  btnRef,
  containerRef,
  isMine,
  isBlocked,
  onClose,
  onReply,
  onCopy,
  onEdit,
  onMessageInfo,
  onDelete,
  onReport,
}) {
  const menuRef = useRef(null);
  const [coords, setCoords] = useState(initialCoords || { top: -9999, left: -9999 });
  const [editExpired, setEditExpired] = useState(false);

  // Lightweight real-time timer to hide Edit option automatically when 15-min window elapses while menu is open
  useEffect(() => {
    setEditExpired(false);
    if (!isMine || !msg) return;

    const createdTimeStr = msg.created_at || msg.created_at_time;
    if (!createdTimeStr) return;

    const createdTimestamp = new Date(createdTimeStr).getTime();
    if (isNaN(createdTimestamp)) return;

    const messageAge = Date.now() - createdTimestamp;
    const remainingMs = MESSAGE_EDIT_WINDOW - messageAge;

    if (remainingMs > 0 && remainingMs <= MESSAGE_EDIT_WINDOW) {
      const timer = setTimeout(() => {
        setEditExpired(true);
      }, remainingMs + 50); // slight buffer to ensure time has strictly elapsed
      return () => clearTimeout(timer);
    }
  }, [msg, isMine]);

  const canEdit = isMine && canEditMessage(msg) && !editExpired;

  useLayoutEffect(() => {
    const rect = anchorRect || (btnRef?.current ? btnRef.current.getBoundingClientRect() : null);
    if (!rect) return;

    const menuWidth = 148;
    // Measure actual rendered DOM height of menu container (fallback 156px for mine / 98px for other)
    const menuHeight = menuRef.current?.offsetHeight || (isMine ? 156 : 98);
    const GAP = 6;
    const requiredSpace = menuHeight + GAP;

    // Get bounding rect of the scrollable chat container (messagesContainerRef)
    const containerRect = containerRef?.current
      ? containerRef.current.getBoundingClientRect()
      : { top: 0, bottom: window.innerHeight, left: 0, right: window.innerWidth };

    // Available space inside the scrollable chat viewport
    const spaceBelow = containerRect.bottom - rect.bottom;
    const spaceAbove = rect.top - containerRect.top;

    let top = rect.bottom + GAP; // default downward (tight 6px gap)
    if (spaceBelow < requiredSpace && spaceAbove >= requiredSpace) {
      top = rect.top - menuHeight - GAP; // upward anchor (tight 6px gap above button trigger)
    } else if (spaceBelow < requiredSpace && spaceAbove < requiredSpace) {
      top = spaceAbove > spaceBelow ? Math.max(containerRect.top + 8, rect.top - menuHeight - GAP) : rect.bottom + GAP;
    }

    // Clamp vertical position inside screen & container bounds cleanly
    top = Math.max(8, Math.min(top, window.innerHeight - menuHeight - 8));

    // Horizontal alignment: right edge aligned for sent messages (isMine), left edge for received
    let left = isMine ? rect.right - menuWidth : rect.left;
    left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));

    setCoords({ top, left });
  }, [anchorRect, btnRef, containerRef, isMine]);

  // Handle ESC key press and PointerDown outside to dismiss menu cleanly
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handlePointerDown = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        !btnRef?.current?.contains(e.target)
      ) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [onClose, btnRef]);

  if (!msg || isBlocked) return null;

  const isReady = coords.top !== -9999;

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        visibility: isReady ? "visible" : "hidden",
        zIndex: 9999,
      }}
      className="
        w-36 rounded-2xl border border-neutral-200 bg-white/95 py-1.5 shadow-2xl backdrop-blur-md
        dark:border-neutral-700/80 dark:bg-neutral-900/95 dark:text-white
        max-h-56 overflow-y-auto
      "
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => {
          onClose();
          onReply(msg);
        }}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800/80 transition-colors"
      >
        <span>↩</span> Reply
      </button>

      <button
        type="button"
        onClick={() => {
          onClose();
          onCopy(msg);
        }}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800/80 transition-colors"
      >
        <span>📋</span> Copy
      </button>

      {isMine ? (
        <>
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(msg);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800/80 transition-colors"
            >
              <span>✏️</span> Edit
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onClose();
              onMessageInfo(msg);
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800/80 transition-colors"
          >
            <svg className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>Message Info</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onDelete(msg);
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 transition-colors"
          >
            <span>🗑️</span> Delete
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => {
            onClose();
            onReport();
          }}
          className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-semibold text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10 transition-colors"
        >
          <span>🚩</span> Report
        </button>
      )}
    </div>,
    document.body
  );
}

function ChatPanel({ channel, currentUserId, onBack, onRemoveChannel, isFavourite, clearedAt, onToggleFavourite, onCloseChat, onChannelRead, onClearChatStateUpdate, onGroupDeleted }) {
  const navigate = useNavigate();
  const conversationLoadCounterRef = useRef(0);
  const [messages, setMessages] = useState(() => {
    return Array.isArray(channel?.state?.messages) && channel.state.messages.length > 0
      ? [...channel.state.messages]
      : [];
  });
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [isConversationLoading, setIsConversationLoading] = useState(() => {
    return !(Array.isArray(channel?.state?.messages) && channel.state.messages.length > 0);
  });
  const [conversationError, setConversationError] = useState(null);
  const [imgError, setImgError] = useState(false);

  // Header & Menu States
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("Spam");
  const [reportNotes, setReportNotes] = useState("");

  // Block User States
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [showExitGroupModal, setShowExitGroupModal] = useState(false);
  const [exitingGroup, setExitingGroup] = useState(false);
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [isBlockedByMe, setIsBlockedByMe] = useState(false);
  const [isBlockedByOther, setIsBlockedByOther] = useState(false);

  // Typing & Presence
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // Message Interaction States
  const [activeMessageMenu, setActiveMessageMenu] = useState(null); // msg.id
  const [menuAnchorRect, setMenuAnchorRect] = useState(null); // { top, bottom, left, right, width, height }
  const [initialMenuCoords, setInitialMenuCoords] = useState(null); // { top, left }
  const [menuDirections, setMenuDirections] = useState({}); // { [msgId]: "up" | "down" }
  const [replyingToMessage, setReplyingToMessage] = useState(null); // msg object
  const [editingMessage, setEditingMessage] = useState(null); // msg object
  const [deleteConfirmMsg, setDeleteConfirmMsg] = useState(null); // msg object
  const [activeMessageInfoMsgId, setActiveMessageInfoMsgId] = useState(null); // msg.id
  const [selectedHistoryMsg, setSelectedHistoryMsg] = useState(null); // msg object
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState(null);
  const [showExpandedReactionPickerId, setShowExpandedReactionPickerId] = useState(null);
  const [pendingAttachment, setPendingAttachment] = useState(null); // { file, name, size, mimeType, isImage, uploading, cdnUrl }
  const [lightboxImage, setLightboxImage] = useState(null); // { url, title }
  const [showClearChatModal, setShowClearChatModal] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);

  // Toast Notification
  const [toastText, setToastText] = useState(null);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const menuBtnRefs = useRef({});
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const composerEmojiContainerRef = useRef(null);
  const attachmentButtonRef = useRef(null);

  // Close composer emoji picker on click-outside or ESC key
  useEffect(() => {
    if (!showEmojiPicker) return;

    const handleClickOutside = (e) => {
      if (
        attachmentButtonRef.current &&
        attachmentButtonRef.current.contains(e.target)
      ) {
        return;
      }

      if (
        composerEmojiContainerRef.current &&
        !composerEmojiContainerRef.current.contains(e.target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showEmojiPicker]);

  // Close active message menu on window resize to ensure responsive positioning
  useEffect(() => {
    const handleResize = () => {
      if (activeMessageMenu) {
        setActiveMessageMenu(null);
        setMenuAnchorRect(null);
        setInitialMenuCoords(null);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeMessageMenu]);

  // Close active message menu on chat container scroll
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (activeMessageMenu) {
        setActiveMessageMenu(null);
        setMenuAnchorRect(null);
        setInitialMenuCoords(null);
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [activeMessageMenu]);

  // Smart toggle handler pre-calculating final coordinates synchronously before mount
  const handleToggleMessageMenu = (msgParam, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    const msgId = typeof msgParam === "object" ? msgParam.id : msgParam;

    if (activeMessageMenu === msgId) {
      setActiveMessageMenu(null);
      setMenuAnchorRect(null);
      setInitialMenuCoords(null);
      return;
    }

    let rect = null;
    if (e && e.currentTarget && typeof e.currentTarget.getBoundingClientRect === "function") {
      const r = e.currentTarget.getBoundingClientRect();
      if (r.width > 0 || r.height > 0 || r.top > 0) {
        rect = { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
      }
    }
    if (!rect && menuBtnRefs.current[msgId]) {
      const r = menuBtnRefs.current[msgId].getBoundingClientRect();
      rect = { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
    }

    // Synchronous Phase 1 Coordinate Pre-Calculation
    let computedCoords = null;
    if (rect) {
      const isMine = typeof msgParam === "object"
        ? String(msgParam.user_id || msgParam.user?.id) === String(currentUserId)
        : false;
      const menuWidth = 148;
      const menuHeight = isMine ? 128 : 98;
      const GAP = 6;
      const requiredSpace = menuHeight + GAP;

      const containerRect = messagesContainerRef.current
        ? messagesContainerRef.current.getBoundingClientRect()
        : { top: 0, bottom: window.innerHeight, left: 0, right: window.innerWidth };

      const spaceBelow = containerRect.bottom - rect.bottom;
      const spaceAbove = rect.top - containerRect.top;

      let top = rect.bottom + GAP;
      if (spaceBelow < requiredSpace && spaceAbove >= requiredSpace) {
        top = rect.top - menuHeight - GAP;
      } else if (spaceBelow < requiredSpace && spaceAbove < requiredSpace) {
        top = spaceAbove > spaceBelow ? Math.max(containerRect.top + 8, rect.top - menuHeight - GAP) : rect.bottom + GAP;
      }

      top = Math.max(8, Math.min(top, window.innerHeight - menuHeight - 8));
      let left = isMine ? rect.right - menuWidth : rect.left;
      left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));

      computedCoords = { top, left };
    }

    setMenuAnchorRect(rect);
    setInitialMenuCoords(computedCoords);
    setActiveMessageMenu(msgId);
  };

  // Extract user / group info
  const members = Object.values(channel?.state?.members || {});
  const otherMember = members.find(
    (m) => String(m.user_id || m.user?.id) !== String(currentUserId)
  );
  const otherUser = otherMember?.user || {};

  const isGroup = Boolean(
    channel?.data?.isGroup ||
    channel?.data?.name ||
    members.length > 2 ||
    channel?.type === "team"
  );

  const isGroupMember = !isGroup || Boolean(channel?.state?.members?.[String(currentUserId)]);
  const isRemovedFromGroup = isGroup && !isGroupMember;

  let name = isGroup
    ? (channel?.data?.name || "Group Chat")
    : (otherUser.name || channel?.data?.targetName || "Participant");

  const avatar = isGroup
    ? (channel?.data?.image || channel?.data?.avatar || "")
    : (otherUser.image || channel?.data?.targetAvatar || "");

  const userId = isGroup ? "" : (otherUser.id || otherMember?.user_id || "");
  const isOnline = isGroup ? false : (otherMember?.user?.online || false);

  const initials = isGroup
    ? (name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "GP")
    : (name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "GH");

  const [mongoGroup, setMongoGroup] = useState(null);
  const [isGroupInfoLoading, setIsGroupInfoLoading] = useState(false);

  // Fetch MongoDB group details when viewing a group to maintain authoritative member count & memberHistory
  useEffect(() => {
    if (!channel || !isGroup) {
      setMongoGroup(null);
      setIsGroupInfoLoading(false);
      return;
    }

    let cancelled = false;
    const targetGroupId =
      channel?.data?.mongoGroupId ||
      channel?.id ||
      channel?.cid?.replace(/^messaging:/, "");

    if (!targetGroupId) return;

    setIsGroupInfoLoading(true);

    async function fetchGroup() {
      try {
        const res = await chatService.getGroupById(targetGroupId);
        if (!cancelled && res?.success && res.group) {
          setMongoGroup(res.group);
        }
      } catch (_err) {
        // Quietly ignore access errors
      } finally {
        if (!cancelled) {
          setIsGroupInfoLoading(false);
        }
      }
    }

    fetchGroup();
    return () => {
      cancelled = true;
    };
  }, [channel?.cid, isGroup, channel?.data?.mongoGroupId]);

  const streamMembersCount = members.length;
  const mongoMembersCount = Array.isArray(mongoGroup?.members) ? mongoGroup.members.length : 0;
  const channelDataCount = typeof channel?.data?.memberCount === "number" ? channel.data.memberCount : 0;

  const displayMemberCount =
    mongoMembersCount > 0
      ? mongoMembersCount
      : channelDataCount > 0
        ? channelDataCount
        : streamMembersCount;

  // Helper toast notification
  const showToast = (text) => {
    setToastText(text);
    setTimeout(() => setToastText(null), 3000);
  };

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Fetch block status for current user & target user
  useEffect(() => {
    if (!channel || !userId) return;
    let cancelled = false;

    async function checkBlock() {
      try {
        const res = await chatService.getBlockStatus(userId);
        if (!cancelled && res.success) {
          setIsBlockedByMe(!!res.isBlockedByMe);
          setIsBlockedByOther(!!res.isBlockedByOther);
        }
      } catch (err) {
        console.error("Failed to check block status:", err);
      }
    }

    checkBlock();
    return () => {
      cancelled = true;
    };
  }, [channel?.cid, userId]);

  // Retry callback bound strictly to current channel & generation counter
  const handleRetry = useCallback(() => {
    if (!channel) return;
    const requestId = ++conversationLoadCounterRef.current;
    const currentCid = channel.cid;

    setIsConversationLoading(true);
    setConversationError(null);

    async function retryFetch() {
      console.log("[CHAT RETRY START]", { conversationId: currentCid, requestId });
      try {
        let loadedMsgs = [];
        if (typeof channel.query === "function") {
          const queryRes = await channel.query({ messages: { limit: 100 } });
          loadedMsgs = queryRes?.messages || channel.state?.messages || [];
        } else {
          await channel.watch();
          loadedMsgs = channel.state?.messages || [];
        }

        if (requestId === conversationLoadCounterRef.current && channel.cid === currentCid) {
          console.log("[CHAT RETRY SUCCESS]", { conversationId: currentCid, requestId, messageCount: loadedMsgs.length });
          setMessages([...loadedMsgs]);
          setIsConversationLoading(false);
          setConversationError(null);
        } else {
          console.log("[CHAT LOAD IGNORED - STALE]", { conversationId: currentCid, requestId, activeRequestId: conversationLoadCounterRef.current });
        }
      } catch (retryErr) {
        console.error("[CHAT RETRY ERROR]", { conversationId: currentCid, requestId, error: retryErr.message });
        if (requestId === conversationLoadCounterRef.current && channel.cid === currentCid) {
          const cached = Array.isArray(channel.state?.messages) ? [...channel.state.messages] : [];
          if (cached.length > 0) {
            setMessages(cached);
            setIsConversationLoading(false);
            setConversationError(null);
          } else {
            setConversationError("Unable to load conversation. Please check your network.");
            setIsConversationLoading(false);
          }
        }
      }
    }

    retryFetch();
  }, [channel]);

  // Load messages and watch channel
  useEffect(() => {
    if (!channel) return;

    let isEffectActive = true;
    const requestId = ++conversationLoadCounterRef.current;
    const currentCid = channel.cid;

    async function init() {
      console.log("[CHAT LOAD START]", { conversationId: currentCid, requestId });
      const hasCached = Array.isArray(channel.state?.messages) && channel.state.messages.length > 0;
      if (!hasCached) {
        setIsConversationLoading(true);
      }
      setConversationError(null);

      try {
        let loadedMsgs = [];
        if (typeof channel.query === "function") {
          const queryRes = await channel.query({ messages: { limit: 100 } });
          loadedMsgs = queryRes?.messages || channel.state?.messages || [];
        } else {
          await channel.watch();
          loadedMsgs = channel.state?.messages || [];
        }

        if (isEffectActive && requestId === conversationLoadCounterRef.current && channel.cid === currentCid) {
          console.log("[CHAT LOAD SUCCESS]", { conversationId: currentCid, requestId, messageCount: loadedMsgs.length });
          const finalMsgs = Array.isArray(loadedMsgs) ? [...loadedMsgs] : [];
          setMessages(finalMsgs);
          setIsConversationLoading(false);
          setConversationError(null);

          const nowIso = new Date().toISOString();
          if (channel.state) {
            channel.state.unreadCount = 0;
            if (!channel.state.read) channel.state.read = {};
            if (userId) {
              channel.state.read[String(userId)] = {
                last_read: nowIso,
                user: { id: String(userId) },
              };
            }
          }
          if (typeof channel.markRead === "function") {
            channel.markRead().then(() => {
              if (onChannelRead) onChannelRead(channel.cid);
            }).catch(() => { });
          }
        } else {
          console.log("[CHAT LOAD IGNORED - STALE]", { conversationId: currentCid, requestId, activeRequestId: conversationLoadCounterRef.current });
        }
      } catch (err) {
        console.warn("[CHAT LOAD ERROR]", { conversationId: currentCid, requestId, error: err?.message });
        if (isEffectActive && requestId === conversationLoadCounterRef.current && channel.cid === currentCid) {
          const cached = Array.isArray(channel.state?.messages) ? [...channel.state.messages] : [];
          if (cached.length > 0) {
            setMessages(cached);
            setIsConversationLoading(false);
            setConversationError(null);
          } else {
            setConversationError("Unable to load conversation. Please check your network.");
            setIsConversationLoading(false);
          }
        }
      }
    }

    init();

    return () => {
      isEffectActive = false;
    };
  }, [channel?.cid, userId]);

  // Listen for events (ignoring events from blocked users)
  useEffect(() => {
    if (!channel) return;

    let isListenerActive = true;

    const handleNewMessage = (event) => {
      if (!isListenerActive) return;
      const isEventForThisChannel =
        !event.cid ||
        !channel.cid ||
        event.cid === channel.cid ||
        event.channel_id === channel.id ||
        event.cid === `messaging:${channel.id}` ||
        `messaging:${event.channel_id}` === channel.cid;

      if (!isEventForThisChannel) return;

      const senderId = String(event.message?.user?.id || event.user?.id || "");
      if (isBlockedByMe && senderId === String(userId)) {
        return; // Ignore real-time messages from blocked user
      }

      // Populate channel.state.read explicitly on read events
      if ((event.type === "message.read" || event.type === "notification.mark_read") && event.user?.id) {
        if (!channel.state.read) channel.state.read = {};
        channel.state.read[event.user.id] = {
          last_read: event.created_at || new Date().toISOString(),
          user: event.user,
        };
        if (String(event.user.id) === String(userId)) {
          channel.state.unreadCount = 0;
        }
      }

      // Realtime State Sync: If event contains a message, update React state incrementally using functional update
      if (event.message && event.message.id) {
        const incomingMsg = event.message;
        setMessages((prevMessages) => {
          const index = prevMessages.findIndex((m) => String(m.id) === String(incomingMsg.id));
          if (index !== -1) {
            const updated = [...prevMessages];
            updated[index] = { ...updated[index], ...incomingMsg };
            return updated;
          }
          return [...prevMessages, incomingMsg];
        });
      } else {
        // Fallback for non-message events (reaction, presence, etc.): merge channel.state.messages
        setMessages((prevMessages) => {
          const streamMsgs = channel.state?.messages || [];
          if (streamMsgs.length === 0) return prevMessages;

          const msgMap = new Map();
          for (const m of prevMessages) {
            if (m.id) msgMap.set(String(m.id), m);
          }
          for (const m of streamMsgs) {
            if (m.id) {
              const existing = msgMap.get(String(m.id)) || {};
              msgMap.set(String(m.id), { ...existing, ...m });
            }
          }
          return Array.from(msgMap.values());
        });
      }

      if (typeof channel.markRead === "function") {
        channel.markRead().then(() => {
          const readTime = new Date().toISOString();
          if (channel.state) {
            channel.state.unreadCount = 0;
            if (!channel.state.read) channel.state.read = {};
            if (userId) {
              channel.state.read[String(userId)] = {
                last_read: readTime,
                user: { id: String(userId) },
              };
            }
          }
          if (onChannelRead) onChannelRead(channel.cid);
        }).catch(() => { });
      }
    };

    const handleTypingStart = (event) => {
      if (!isListenerActive) return;
      if (String(event.user?.id) !== String(currentUserId) && !isBlockedByMe && !isBlockedByOther) {
        setIsTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 4000);
      }
    };

    const handleTypingStop = (event) => {
      if (!isListenerActive) return;
      if (String(event.user?.id) !== String(currentUserId)) {
        setIsTyping(false);
      }
    };

    const handleChannelTruncated = (event) => {
      if (!isListenerActive) return;
      if (event.channel_id === channel.id || event.cid === channel.cid) {
        setMessages([]);
        if (channel.state) {
          channel.state.messages = [];
          channel.state.unreadCount = 0;
        }
        if (onChannelRead) onChannelRead(channel.cid);
      }
    };

    channel.on("message.new", handleNewMessage);
    channel.on("message.updated", handleNewMessage);
    channel.on("message.deleted", handleNewMessage);
    channel.on("message.read", handleNewMessage);
    channel.on("notification.mark_read", handleNewMessage);
    channel.on("user.presence.changed", handleNewMessage);
    channel.on("reaction.new", handleNewMessage);
    channel.on("reaction.deleted", handleNewMessage);
    channel.on("channel.truncated", handleChannelTruncated);
    channel.on("channel.updated", handleNewMessage);
    channel.on("typing.start", handleTypingStart);
    channel.on("typing.stop", handleTypingStop);

    return () => {
      isListenerActive = false;
      channel.off("message.new", handleNewMessage);
      channel.off("message.updated", handleNewMessage);
      channel.off("message.deleted", handleNewMessage);
      channel.off("message.read", handleNewMessage);
      channel.off("notification.mark_read", handleNewMessage);
      channel.off("user.presence.changed", handleNewMessage);
      channel.off("reaction.new", handleNewMessage);
      channel.off("reaction.deleted", handleNewMessage);
      channel.off("channel.truncated", handleChannelTruncated);
      channel.off("channel.updated", handleNewMessage);
      channel.off("typing.start", handleTypingStart);
      channel.off("typing.stop", handleTypingStop);
    };
  }, [channel?.cid, currentUserId, isBlockedByMe, isBlockedByOther, userId]);

  // Handle Per-User Clear Chat
  const handleConfirmClearChat = async () => {
    if (!channel?.cid || clearingChat) return;

    setClearingChat(true);
    try {
      const res = await chatService.clearChat(channel.cid);
      if (res?.success) {
        if (onClearChatStateUpdate) {
          onClearChatStateUpdate(channel.cid, res.clearedAt);
        }
        if (onChannelRead) onChannelRead(channel.cid);
        showToast("Chat history cleared");
        setShowClearChatModal(false);
      } else {
        showToast(res?.message || "Unable to clear chat. Please try again.");
      }
    } catch (err) {
      console.error("Clear chat error:", err);
      showToast("Unable to clear chat. Please try again.");
    } finally {
      setClearingChat(false);
    }
  };

  // Scroll on message changes
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Focus input when channel changes
  useEffect(() => {
    inputRef.current?.focus();
  }, [channel?.cid]);

  // Handle Keystroke Typing Indicator
  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputText(text);
    if (channel && text.length > 0 && !isBlockedByMe && !isBlockedByOther) {
      channel.keystroke().catch(() => { });
    }
  };

  // Handle File Selection & Asynchronous Upload
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so selecting the same file again fires onChange
    if (fileInputRef.current) fileInputRef.current.value = "";

    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    const disallowedExts = [".exe", ".bat", ".cmd", ".msi", ".scr", ".com", ".sh", ".vbs", ".app", ".jar"];
    if (disallowedExts.includes(ext)) {
      showToast("Executable files (.exe, .bat, .cmd, etc.) are not allowed for security.");
      return;
    }

    const maxBytes = 20 * 1024 * 1024; // 20MB
    if (file.size > maxBytes) {
      showToast(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum limit is 20MB.`);
      return;
    }

    const isImage = file.type.startsWith("image/") || [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext);

    // Set pending attachment state with local blob preview while uploading
    const localUrl = isImage ? URL.createObjectURL(file) : null;
    const item = {
      file,
      name: file.name,
      size: file.size,
      mimeType: file.type || getMimeType(file.name),
      isImage,
      uploading: true,
      url: localUrl,
      cdnUrl: null,
      error: null,
    };
    setPendingAttachment(item);

    try {
      let uploadedUrl = null;
      // Try Stream Chat native SDK upload
      if (isImage && typeof channel?.sendImage === "function") {
        const res = await channel.sendImage(file);
        uploadedUrl = res?.file || res?.url;
      } else if (!isImage && typeof channel?.sendFile === "function") {
        const res = await channel.sendFile(file);
        uploadedUrl = res?.file || res?.url;
      }

      // If Stream Chat upload returns no URL, fallback to getHack server upload endpoint
      if (!uploadedUrl) {
        const formData = new FormData();
        formData.append("file", file);
        const serverRes = await fetch("/api/chat/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        const serverData = await serverRes.json();
        if (serverData.success && serverData.url) {
          uploadedUrl = serverData.url;
        } else {
          throw new Error(serverData.message || "Upload failed");
        }
      }

      setPendingAttachment((prev) => {
        if (!prev || prev.file !== file) return prev;
        return {
          ...prev,
          uploading: false,
          cdnUrl: uploadedUrl,
        };
      });
    } catch (err) {
      console.error("File upload failed, trying server fallback:", err);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const serverRes = await fetch("/api/chat/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        const serverData = await serverRes.json();
        if (serverData.success && serverData.url) {
          setPendingAttachment((prev) => {
            if (!prev || prev.file !== file) return prev;
            return {
              ...prev,
              uploading: false,
              cdnUrl: serverData.url,
            };
          });
          return;
        }
      } catch (fallbackErr) {
        console.error("Server fallback upload failed:", fallbackErr);
      }

      showToast("Failed to upload file. Please try again.");
      setPendingAttachment(null);
    }
  };

  // Send or Save Message
  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (isBlockedByMe || isBlockedByOther) {
      showToast("Cannot send messages while user is blocked");
      return;
    }

    const text = inputText.trim();
    if ((!text && !pendingAttachment) || sending || !channel || isBlocked || isRemovedFromGroup) return;

    if (pendingAttachment?.uploading) {
      showToast("Please wait for file upload to complete.");
      return;
    }

    setSending(true);

    try {
      if (editingMessage) {
        if (!canEditMessage(editingMessage)) {
          showToast("Edit time window has expired (15 minutes).");
          setEditingMessage(null);
          setInputText("");
          return;
        }

        if (text !== editingMessage.text) {
          const existingHistory = Array.isArray(editingMessage.edit_history)
            ? editingMessage.edit_history
            : Array.isArray(editingMessage.extraData?.edit_history)
              ? editingMessage.extraData.edit_history
              : [];

          const updatedHistory = [
            ...existingHistory,
            {
              text: editingMessage.text,
              edited_at: new Date().toISOString(),
              edited_by: currentUserId,
            },
          ];

          const client = channel.getClient?.() || channel.client;
          const updatePayload = {
            id: editingMessage.id,
            text,
            is_edited: true,
            edit_history: updatedHistory,
          };

          if (client && typeof client.updateMessage === "function") {
            await client.updateMessage(updatePayload);
          } else if (typeof channel.updateMessage === "function") {
            await channel.updateMessage(updatePayload);
          } else {
            await channel.sendMessage(updatePayload);
          }
        }
        setEditingMessage(null);
        showToast("Message updated");
      } else {
        // Send new message (with parent_id and show_in_channel for thread replies)
        const payload = {};
        if (text) payload.text = text;

        if (pendingAttachment && pendingAttachment.cdnUrl) {
          payload.attachments = [
            {
              type: pendingAttachment.isImage ? "image" : "file",
              asset_url: pendingAttachment.cdnUrl,
              image_url: pendingAttachment.isImage ? pendingAttachment.cdnUrl : undefined,
              thumb_url: pendingAttachment.isImage ? pendingAttachment.cdnUrl : undefined,
              title: pendingAttachment.name,
              file_size: pendingAttachment.size,
              mime_type: pendingAttachment.mimeType,
            },
          ];
        }

        if (replyingToMessage) {
          payload.parent_id = replyingToMessage.id;
          payload.show_in_channel = true;
        }

        const sendRes = await channel.sendMessage(payload);
        if (sendRes?.message && sendRes.message.id) {
          const sentMsg = sendRes.message;
          setMessages((prevMessages) => {
            const index = prevMessages.findIndex((m) => String(m.id) === String(sentMsg.id));
            if (index !== -1) {
              const updated = [...prevMessages];
              updated[index] = { ...updated[index], ...sentMsg };
              return updated;
            }
            return [...prevMessages, sentMsg];
          });
        }
        setReplyingToMessage(null);
        setPendingAttachment(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
      setInputText("");
      setShowEmojiPicker(false);
    } catch (err) {
      console.error("Failed to send/edit message:", err);
      showToast("Failed to send message");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Message Copy
  const handleCopyMessage = (msgOrText) => {
    let copyText = typeof msgOrText === "string" ? msgOrText : msgOrText?.text;
    if (typeof msgOrText === "object" && msgOrText !== null) {
      if (msgOrText.custom_type === "team_invitation" || msgOrText.type === "team_invitation") {
        copyText = `🤝 Hackathon Team Invitation: ${msgOrText.sender_name || "A connection"} invited you to join Team ${msgOrText.team_name || "Team"} for ${msgOrText.hackathon_name || "Hackathon"}`;
      }
    }
    if (navigator.clipboard && copyText) {
      navigator.clipboard.writeText(copyText);
      showToast("Copied to clipboard");
    }
    setActiveMessageMenu(null);
  };

  // Start Edit Message
  const handleStartEdit = (msg) => {
    if (isBlockedByMe || isBlockedByOther) return;
    if (!canEditMessage(msg)) {
      showToast("Messages can only be edited within 15 minutes of sending.");
      return;
    }
    setEditingMessage(msg);
    setInputText(msg.text || "");
    setReplyingToMessage(null);
    setActiveMessageMenu(null);
    inputRef.current?.focus();
  };

  // Cancel Edit
  const handleCancelEdit = () => {
    setEditingMessage(null);
    setInputText("");
  };

  // Start Reply Message
  const handleStartReply = (msg) => {
    if (isBlockedByMe || isBlockedByOther) return;
    setReplyingToMessage(msg);
    setEditingMessage(null);
    setActiveMessageMenu(null);
    inputRef.current?.focus();
  };

  // Delete Message Confirmation
  const handleConfirmDeleteMessage = async () => {
    if (!deleteConfirmMsg || !channel) return;
    try {
      const client = channel.getClient?.() || channel.client;
      if (client && typeof client.deleteMessage === "function") {
        await client.deleteMessage(deleteConfirmMsg.id);
      }
      setMessages([...(channel.state.messages || [])]);
      showToast("Message deleted");
    } catch (err) {
      console.error("Failed to delete message:", err);
      showToast("Could not delete message");
    } finally {
      setDeleteConfirmMsg(null);
      setActiveMessageMenu(null);
    }
  };

  // Send Reaction
  const handleToggleReaction = async (msgId, reactionKey) => {
    if (!channel || isBlockedByMe || isBlockedByOther) return;
    try {
      const msg = messages.find((m) => m.id === msgId);
      const ownReactions = msg?.own_reactions || [];
      const latestReactions = msg?.latest_reactions || [];
      const hasReacted =
        ownReactions.some((r) => r.type === reactionKey) ||
        latestReactions.some(
          (r) => r.type === reactionKey && String(r.user_id || r.user?.id) === String(currentUserId)
        );

      if (hasReacted) {
        await channel.deleteReaction(msgId, reactionKey);
      } else {
        await channel.sendReaction(msgId, { type: reactionKey });
      }
      setMessages([...(channel.state.messages || [])]);
    } catch (err) {
      console.error("Failed to toggle reaction:", err);
      showToast("Failed to update reaction");
    } finally {
      setActiveReactionMsgId(null);
      setShowExpandedReactionPickerId(null);
      setActiveMessageMenu(null);
    }
  };

  // Confirm Close Chat (per-user hide)
  const handleConfirmRemoveChat = async () => {
    if (!channel) return;
    setShowRemoveModal(false);
    try {
      if (onCloseChat) {
        await onCloseChat(channel);
      } else {
        await channel.hide();
        if (onRemoveChannel) {
          onRemoveChannel(channel);
        } else {
          navigate("/messages", { replace: true });
        }
      }
    } catch (err) {
      console.error("Failed to close channel:", err);
      showToast("Failed to close chat");
    }
  };

  // Confirm Block User
  const handleConfirmBlockUser = async () => {
    if (!userId || !channel) return;
    setShowBlockModal(false);
    try {
      const client = channel.getClient?.() || channel.client;
      if (client && typeof client.blockUser === "function") {
        await client.blockUser(userId);
      }
      await chatService.blockUser(userId);
      setIsBlockedByMe(true);
      showToast("User blocked");
    } catch (err) {
      console.error("Failed to block user:", err);
      showToast("Failed to block user");
    }
  };

  // Confirm Unblock User
  const handleConfirmUnblockUser = async () => {
    if (!userId || !channel) return;
    setShowUnblockModal(false);
    try {
      const client = channel.getClient?.() || channel.client;
      if (client && typeof client.unBlockUser === "function") {
        await client.unBlockUser(userId);
      } else if (client && typeof client.unblockUser === "function") {
        await client.unblockUser(userId);
      }
      await chatService.unblockUser(userId);
      setIsBlockedByMe(false);
      showToast("User unblocked");
    } catch (err) {
      console.error("Failed to unblock user:", err);
      showToast("Failed to unblock user");
    }
  };

  // Submit User Report
  const handleSubmitReport = (e) => {
    e.preventDefault();
    setShowReportModal(false);
    showToast("Report submitted for review. Thank you.");
    setReportNotes("");
  };

  // Handle Exit Group
  const handleConfirmExitGroup = async () => {
    const targetGroupId = channel?.data?.mongoGroupId || channel?.id || channel?.cid?.replace(/^messaging:/, "");
    if (!targetGroupId || exitingGroup) return;

    setExitingGroup(true);
    try {
      const res = await chatService.exitGroup(targetGroupId);
      if (res?.success) {
        if (res.group) {
          setMongoGroup(res.group);
        }
        showToast("You left the group");
        setShowExitGroupModal(false);
      } else {
        showToast(res?.message || "Unable to exit group. Please try again.");
      }
    } catch (err) {
      console.error("Exit group error:", err);
      showToast(err?.message || "Unable to exit group. Please try again.");
    } finally {
      setExitingGroup(false);
    }
  };

  // Handle Delete Group (for current user only)
  const handleConfirmDeleteGroup = async () => {
    const targetGroupId = channel?.data?.mongoGroupId || channel?.id || channel?.cid?.replace(/^messaging:/, "");
    if (!targetGroupId || deletingGroup) return;

    setDeletingGroup(true);
    try {
      const res = await chatService.deleteGroupForMe(targetGroupId);
      if (res?.success) {
        showToast("Group chat deleted");
        setShowDeleteGroupModal(false);
        if (typeof onGroupDeleted === "function") {
          onGroupDeleted(targetGroupId);
        }
      } else {
        showToast(res?.message || "Unable to delete this group. Please try again.");
      }
    } catch (err) {
      console.error("Delete group error:", err);
      showToast(err?.message || "Unable to delete this group. Please try again.");
    } finally {
      setDeletingGroup(false);
    }
  };

  // WhatsApp-style membership history filtering + clearedAt filtering
  const visibleMessages = useMemo(() => {
    let filtered = messages;

    // 1. Per-user clearedAt filtering
    if (clearedAt) {
      const clearTime = new Date(clearedAt).getTime();
      if (!isNaN(clearTime)) {
        filtered = filtered.filter((msg) => {
          const msgTime = new Date(msg.created_at || msg.createdAt || Date.now()).getTime();
          return !isNaN(msgTime) && msgTime > clearTime;
        });
      }
    }

    // 2. WhatsApp-style group member history filtering (only applies to group chats with memberHistory)
    if (isGroup && Array.isArray(mongoGroup?.memberHistory) && mongoGroup.memberHistory.length > 0 && currentUserId) {
      const userPeriods = mongoGroup.memberHistory
        .filter((h) => {
          const uId = String(h.user?._id || h.user?.id || h.user || "");
          return uId === String(currentUserId);
        })
        .map((p) => ({
          joinedAt: new Date(p.joinedAt).getTime(),
          removedAt: p.removedAt ? new Date(p.removedAt).getTime() : null,
        }))
        .filter((p) => !isNaN(p.joinedAt));

      // Only filter if user has defined membership periods
      if (userPeriods.length > 0) {
        // Evaluate user's latest (current) membership session
        const currentSession = userPeriods[userPeriods.length - 1];
        const currentSessionStart = currentSession.joinedAt - 5000; // 5s clock skew buffer

        filtered = filtered.filter((msg) => {
          const msgTime = new Date(msg.created_at || msg.createdAt || Date.now()).getTime();
          if (isNaN(msgTime)) return true;

          // For users with multiple membership sessions (previously exited/removed and re-added):
          // Only display messages on or after the START of their CURRENT membership session.
          if (userPeriods.length > 1) {
            return msgTime >= currentSessionStart;
          }

          // For users with single continuous session (never left):
          const afterJoin = msgTime >= currentSession.joinedAt - 5000;
          const beforeRemove = !currentSession.removedAt || msgTime <= currentSession.removedAt + 5000;
          return afterJoin && beforeRemove;
        });
      }
    }

    return filtered;
  }, [messages, clearedAt, isGroup, mongoGroup?.memberHistory, currentUserId, name]);

  // Filter messages by search query if active & deduplicate by unique message ID
  const displayedMessages = useMemo(() => {
    let source = visibleMessages;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      source = source.filter((m) => m.text?.toLowerCase().includes(q));
    }
    const seen = new Set();
    const result = [];
    for (const msg of source) {
      const isSys =
        msg.type === "system" ||
        msg.custom_type?.startsWith("member_") ||
        msg.event?.startsWith("member_") ||
        Boolean(msg.is_system_message);

      // Deduplicate system messages with exact same text within 3 seconds window
      const timeWindow = Math.floor(new Date(msg.created_at || msg.createdAt || Date.now()).getTime() / 3000);
      const key = isSys
        ? `sys_${msg.text}_${timeWindow}`
        : String(msg.id || `${msg.created_at || ""}_${msg.text || ""}`);

      if (!seen.has(key)) {
        seen.add(key);
        result.push(msg);
      }
    }
    return result;
  }, [visibleMessages, searchQuery]);

  // Group messages by date (strictly one separator per calendar day)
  const groupedMessages = [];
  let lastDateKey = "";
  displayedMessages.forEach((msg) => {
    if (!msg.created_at) {
      groupedMessages.push({ type: "message", data: msg });
      return;
    }

    const d = new Date(msg.created_at);
    if (isNaN(d.getTime())) {
      groupedMessages.push({ type: "message", data: msg });
      return;
    }

    // Key by local calendar YYYY-MM-DD
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    if (dateKey !== lastDateKey) {
      groupedMessages.push({ type: "separator", date: msg.created_at, dateKey });
      lastDateKey = dateKey;
    }
    groupedMessages.push({ type: "message", data: msg });
  });

  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-neutral-950">
        <div className="text-center space-y-3 px-8">
          <div className="mx-auto h-16 w-16 rounded-full bg-indigo-50 dark:bg-indigo-500/10 grid place-items-center">
            <svg className="h-8 w-8 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Select a conversation
          </h3>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 max-w-xs">
            Choose a chat from the left panel to start messaging.
          </p>
        </div>
      </div>
    );
  }

  const isBlocked = isBlockedByMe || isBlockedByOther;
  const isChatLoading = isConversationLoading || (isGroup && isGroupInfoLoading && !mongoGroup);

  return (
    <div className="relative flex flex-col h-full bg-white dark:bg-neutral-950 overflow-hidden">
      {/* ── Toast Notification ── */}
      {toastText && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="rounded-full bg-neutral-900/90 dark:bg-white/90 px-4 py-1.5 text-xs font-semibold text-white dark:text-neutral-900 shadow-lg backdrop-blur-xs">
            {toastText}
          </div>
        </div>
      )}

      {/* ── Chat Header ── */}
      <div className="relative flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button (mobile) */}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="shrink-0 md:hidden rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 transition-colors"
              title="Back to chats"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* User info — clickable to profile */}
          <div
            onClick={() => {
              if (isGroup) {
                const targetGroupId = channel?.data?.mongoGroupId || channel?.id || channel?.cid?.replace(/^messaging:/, "");
                if (targetGroupId) navigate(`/group/${targetGroupId}`);
              } else if (userId) {
                navigate(`/profile/${userId}`);
              }
            }}
            className="flex items-center gap-3 min-w-0 cursor-pointer group"
          >
            <div className="relative shrink-0">
              {avatar && !imgError ? (
                <img
                  src={avatar}
                  alt={name}
                  onError={() => setImgError(true)}
                  className="h-10 w-10 rounded-full object-cover border border-neutral-200 dark:border-neutral-700 group-hover:opacity-90 transition-opacity"
                />
              ) : (
                <div className="grid h-10 w-10 place-items-center rounded-full bg-indigo-100 font-bold text-sm text-indigo-600 border border-neutral-200 dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-neutral-700 group-hover:opacity-90 transition-opacity">
                  {initials}
                </div>
              )}
              {/* Online/Offline status indicator — ONLY for 1-to-1 chats */}
              {!isGroup && (
                <span
                  className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-neutral-900 ${isOnline && !isBlocked ? "bg-emerald-500" : "bg-neutral-400"
                    }`}
                />
              )}
            </div>

            <div className="min-w-0 text-left">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-neutral-900 dark:text-white truncate group-hover:text-indigo-500 transition-colors">
                  {name}
                </p>
                {isFavourite && (
                  <span className="text-red-500 text-xs shrink-0" title="Favourite conversation">
                    ❤️
                  </span>
                )}
              </div>
              <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 truncate">
                {isGroup ? (
                  `${displayMemberCount} member${displayMemberCount === 1 ? "" : "s"}`
                ) : isBlocked ? (
                  <span className="text-red-500 dark:text-red-400 font-semibold">
                    {isBlockedByMe ? "Blocked" : "Unavailable"}
                  </span>
                ) : (
                  <span className={isOnline ? "text-emerald-600 dark:text-emerald-400 font-semibold" : ""}>
                    {isOnline ? "Online" : "Offline"}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setSearchOpen((prev) => !prev)}
            className={`rounded-lg p-2 transition-colors ${searchOpen
              ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
              : "text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              }`}
            title="Search in conversation"
          >
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => setShowHeaderMenu((prev) => !prev)}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 transition-colors"
            title="Options"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.75" />
              <circle cx="12" cy="12" r="1.75" />
              <circle cx="12" cy="19" r="1.75" />
            </svg>
          </button>
        </div>

        {/* ── Header Dropdown Menu ── */}
        {showHeaderMenu && (
          <div
            className="
              absolute right-4 top-14 z-50 w-56 rounded-xl
              border border-neutral-200 bg-white py-1 shadow-xl
              dark:border-neutral-700 dark:bg-neutral-800
              animate-in fade-in zoom-in-95 duration-100
            "
            onClick={(e) => e.stopPropagation()}
          >
            {isGroup ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setShowHeaderMenu(false);
                    const targetGroupId = channel?.data?.mongoGroupId || channel?.id || channel?.cid?.replace(/^messaging:/, "");
                    if (targetGroupId) navigate(`/group/${targetGroupId}`);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-700/60 transition-colors text-left"
                >
                  <svg className="h-4 w-4 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span>Group info</span>
                </button>
                {/* Exit Group Option for Active Group Members / Delete Group for Exited Users */}
                {isGroupMember && !isRemovedFromGroup ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowHeaderMenu(false);
                      setShowExitGroupModal(true);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 transition-colors text-left"
                  >
                    <svg className="h-4 w-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>Exit group</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setShowHeaderMenu(false);
                      setShowDeleteGroupModal(true);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 transition-colors text-left"
                  >
                    <svg className="h-4 w-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    <span>Delete group</span>
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowHeaderMenu(false);
                  if (userId) navigate(`/profile/${userId}`);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-700/60 transition-colors text-left"
              >
                <svg className="h-4 w-4 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>View Profile</span>
              </button>
            )}

            {/* Add/Remove Favourite */}
            <button
              type="button"
              onClick={() => {
                setShowHeaderMenu(false);
                if (onToggleFavourite) onToggleFavourite(channel);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-700/60 transition-colors text-left"
            >
              <span className="text-sm leading-none">❤️</span>
              <span>{isFavourite ? "Remove from favourites" : "Add to favourites"}</span>
            </button>

            {/* Clear Chat */}
            <button
              type="button"
              onClick={() => {
                setShowHeaderMenu(false);
                setShowClearChatModal(true);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 transition-colors text-left"
            >
              <svg className="h-4 w-4 text-red-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <span>Clear Chat</span>
            </button>

            {/* Close Chat */}
            <button
              type="button"
              onClick={() => {
                setShowHeaderMenu(false);
                setShowRemoveModal(true);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-700/60 transition-colors text-left"
            >
              <span className="text-sm leading-none font-bold text-neutral-400">✕</span>
              <span>Close chat</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowHeaderMenu(false);
                setShowReportModal(true);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10 transition-colors text-left"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" />
              </svg>
              <span>Report User</span>
            </button>

            {/* Block / Unblock Option */}
            {isBlockedByMe ? (
              <button
                type="button"
                onClick={() => {
                  setShowHeaderMenu(false);
                  setShowUnblockModal(true);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10 transition-colors text-left"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
                <span>Unblock</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowHeaderMenu(false);
                  setShowBlockModal(true);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 transition-colors text-left"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M4.93 4.93l14.14 14.14" />
                </svg>
                <span>Block</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Search Bar (Conditional Header) ── */}
      {searchOpen && (
        <div className="shrink-0 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 py-2 flex items-center gap-2">
          <svg className="h-4 w-4 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in conversation..."
            className="flex-1 bg-transparent text-xs text-neutral-900 dark:text-white focus:outline-none"
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setSearchOpen(false);
              setSearchQuery("");
            }}
            className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Messages Area ── */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-neutral-50 dark:bg-neutral-950"
        onScroll={() => {
          if (activeMessageMenu) setActiveMessageMenu(null);
        }}
        onClick={() => {
          setActiveMessageMenu(null);
          setActiveReactionMsgId(null);
          setShowExpandedReactionPickerId(null);
          setShowHeaderMenu(false);
        }}
      >
        {isChatLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-2 text-xs font-medium text-neutral-400">
              <svg className="h-4 w-4 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10" />
              </svg>
              Loading messages...
            </div>
          </div>
        ) : conversationError ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2 px-4">
              <p className="text-xs font-semibold text-red-500 dark:text-red-400">{conversationError}</p>
              <button
                type="button"
                onClick={handleRetry}
                className="px-3 py-1 rounded-md bg-neutral-200 dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : groupedMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                {searchQuery ? `No messages match "${searchQuery}"` : "No messages yet. Say hello! 👋"}
              </p>
            </div>
          </div>
        ) : (
          groupedMessages.map((item, idx) => {
            if (item.type === "separator") {
              return (
                <div key={`sep-${idx}`} className="flex items-center justify-center py-3">
                  <span className="rounded-md bg-neutral-200/70 dark:bg-neutral-800 px-3 py-1 text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
                    {formatDateSeparator(item.date)}
                  </span>
                </div>
              );
            }

            const msg = item.data;

            // Check for System Message (e.g. Member Added / Member Removed / Member Left)
            const isSystemMessage =
              msg.type === "system" ||
              msg.custom_type === "member_added" ||
              msg.custom_type === "member_removed" ||
              msg.custom_type === "member_left" ||
              msg.event === "member_added" ||
              msg.event === "member_removed" ||
              msg.event === "member_left" ||
              Boolean(msg.is_system_message);

            if (isSystemMessage) {
              return (
                <div key={msg.id || idx} className="my-3 flex justify-center w-full px-4">
                  <div className="rounded-full bg-neutral-100/90 dark:bg-neutral-800/90 border border-neutral-200/80 dark:border-neutral-700/80 px-4 py-1.5 text-center text-xs font-medium text-neutral-600 dark:text-neutral-400 shadow-2xs max-w-md">
                    {msg.text}
                  </div>
                </div>
              );
            }

            const isMine = String(msg.user?.id || msg.user_id) === String(currentUserId);
            const isDeleted = Boolean(msg.deleted_at || msg.type === "deleted");
            const isEdited = !isDeleted && Boolean(
              msg.is_edited ||
              msg.message_text_updated_at ||
              (Array.isArray(msg.edit_history) && msg.edit_history.length > 0) ||
              (Array.isArray(msg.extraData?.edit_history) && msg.extraData.edit_history.length > 0)
            );

            // Flag for Team Invitation Messages
            const isInvitation =
              msg.custom_type === "team_invitation" ||
              msg.type === "team_invitation" ||
              Boolean(msg.invitation_id || msg.invitationId);

            // Compute reaction entries cleanly
            const reactions = msg.reaction_counts || {};
            let reactionEntries = Object.entries(reactions).filter(([, count]) => count > 0);
            if (reactionEntries.length === 0 && Array.isArray(msg.latest_reactions) && msg.latest_reactions.length > 0) {
              const counts = {};
              msg.latest_reactions.forEach((r) => {
                if (r.type) counts[r.type] = (counts[r.type] || 0) + 1;
              });
              reactionEntries = Object.entries(counts);
            }

            // Parent reply message details if present
            const parentMsg = msg.parent_id
              ? (msg.parent || messages.find((m) => m.id === msg.parent_id))
              : null;
            const parentIsDeleted = Boolean(parentMsg?.deleted_at || parentMsg?.type === "deleted");

            // Sender identification for Group Chat
            const prevItem = idx > 0 ? groupedMessages[idx - 1] : null;
            const prevMsg = prevItem?.type === "message" ? prevItem.data : null;
            const senderId = String(msg.user?.id || msg.user_id || "");
            const prevSenderId = prevMsg ? String(prevMsg.user?.id || prevMsg.user_id || "") : null;

            // Group messages consecutive sequence detection
            const isFirstInSequence = !prevMsg || prevSenderId !== senderId;
            const senderName = msg.user?.name || msg.user?.username || msg.user_name || "Participant";
            const msgUserAvatar = msg.user?.image || msg.user?.avatar || msg.user?.profile?.avatar || "";
            const userInitials = (senderName || "Participant")
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2) || "P";

            const isGroupIncoming = isGroup && !isMine;

            const renderBubbleContent = () => (
              <>
                {/* Action Bar (Triggered on hover/touch — disabled when blocked or deleted) */}
                {!isBlocked && !isDeleted && (
                  <div
                    className={`
                      absolute -top-3 ${isMine ? "right-2" : "left-2"} z-10
                      ${activeMessageMenu === msg.id || activeReactionMsgId === msg.id ? "flex" : "hidden group-hover/msg:flex"}
                      items-center gap-0.5 rounded-full
                      bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700
                      px-1 py-0.5 shadow-md animate-in fade-in duration-100
                    `}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Reaction trigger */}
                    <button
                      type="button"
                      onClick={() => setActiveReactionMsgId((prev) => (prev === msg.id ? null : msg.id))}
                      className="
                        p-1 text-neutral-500 hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400
                        hover:bg-neutral-100 dark:hover:bg-neutral-700/60 rounded-full
                        transition-all duration-150 active:scale-95 group/react
                      "
                      title="Add reaction"
                    >
                      <svg
                        className="h-3.5 w-3.5 transition-transform duration-150 group-hover/react:scale-110"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="9.5" />
                        <path d="M8.5 14.25c.8 1.4 2.1 2.25 3.5 2.25s2.7-.85 3.5-2.25" />
                        <circle cx="9" cy="9.5" r="1.2" fill="currentColor" stroke="none" />
                        <circle cx="15" cy="9.5" r="1.2" fill="currentColor" stroke="none" />
                      </svg>
                    </button>

                    {/* Reply trigger */}
                    <button
                      type="button"
                      onClick={() => handleStartReply(msg)}
                      className="p-1 text-neutral-500 hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400 transition-colors"
                      title="Reply"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 10h10a5 5 0 0 1 5 5v2M3 10l6-6M3 10l6 6" />
                      </svg>
                    </button>

                    {/* Options Menu Trigger */}
                    <button
                      type="button"
                      ref={(el) => {
                        if (el) menuBtnRefs.current[msg.id] = el;
                      }}
                      onClick={(e) => handleToggleMessageMenu(msg, e)}
                      className="p-1 text-neutral-500 hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400 transition-colors"
                      title="More actions"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="1.5" />
                        <circle cx="12" cy="12" r="1.5" />
                        <circle cx="12" cy="19" r="1.5" />
                      </svg>
                    </button>
                  </div>
                )}

                {/* Compact Quick Reaction Bar (Matching Reference Image: 👍 ❤️ 😂 😮 😢 🙏 +) */}
                {activeReactionMsgId === msg.id && !isBlocked && (
                  <div
                    className={`
                      absolute -top-12 ${isMine ? "right-0" : "left-0"} z-40
                      flex items-center gap-2 rounded-full
                      bg-neutral-900/95 dark:bg-neutral-900/95 text-white
                      border border-neutral-700/80
                      px-3.5 py-1.5 shadow-2xl backdrop-blur-md
                      animate-in fade-in zoom-in-95 duration-100
                    `}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {QUICK_REACTIONS.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleToggleReaction(msg.id, item.key)}
                        className="hover:scale-125 active:scale-90 transition-transform text-lg cursor-pointer leading-none"
                        title={item.key}
                      >
                        {item.emoji}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        setShowExpandedReactionPickerId((prev) => (prev === msg.id ? null : msg.id));
                      }}
                      className="
                        flex items-center justify-center h-6 w-6 rounded-full
                        bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white
                        transition-colors text-xs font-bold shrink-0 ml-0.5
                      "
                      title="More emojis"
                    >
                      +
                    </button>
                  </div>
                )}

                {/* Expanded Emoji Grid Popover when '+' is clicked */}
                {showExpandedReactionPickerId === msg.id && !isBlocked && (
                  <div
                    className={`
                      absolute -top-52 ${isMine ? "right-0" : "left-0"} z-50 p-2.5 w-64 rounded-2xl
                      border border-neutral-700 bg-neutral-900/95 text-white shadow-2xl backdrop-blur-md
                      animate-in fade-in zoom-in-95 duration-100 grid grid-cols-6 gap-1.5
                    `}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {EXPANDED_EMOJI_LIST.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          const reactionKey = getStreamReactionKey(emoji);
                          handleToggleReaction(msg.id, reactionKey);
                          setShowExpandedReactionPickerId(null);
                        }}
                        className="h-8 w-8 rounded-lg hover:bg-neutral-800 grid place-items-center text-base transition-transform hover:scale-125"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* WhatsApp-Style Floating Portal Action Menu */}
                {activeMessageMenu === msg.id && !isBlocked && (
                  <FloatingMessageMenu
                    msg={msg}
                    initialCoords={initialMenuCoords}
                    anchorRect={menuAnchorRect}
                    btnRef={{ current: menuBtnRefs.current[msg.id] }}
                    containerRef={messagesContainerRef}
                    isMine={isMine}
                    isBlocked={isBlocked}
                    onClose={() => {
                      setActiveMessageMenu(null);
                      setMenuAnchorRect(null);
                      setInitialMenuCoords(null);
                    }}
                    onReply={handleStartReply}
                    onCopy={handleCopyMessage}
                    onEdit={handleStartEdit}
                    onMessageInfo={(m) => {
                      setActiveMessageMenu(null);
                      setMenuAnchorRect(null);
                      setInitialMenuCoords(null);
                      setActiveMessageInfoMsgId(m.id);
                    }}
                    onDelete={(m) => {
                      setActiveMessageMenu(null);
                      setMenuAnchorRect(null);
                      setInitialMenuCoords(null);
                      setDeleteConfirmMsg(m);
                    }}
                    onReport={() => {
                      setActiveMessageMenu(null);
                      setMenuAnchorRect(null);
                      setInitialMenuCoords(null);
                      setShowReportModal(true);
                    }}
                  />
                )}

                {/* Message Bubble Content */}
                {isDeleted ? (
                  <div
                    className={`
                      rounded-2xl px-4 py-2.5 text-xs italic shadow-2xs
                      ${isMine
                        ? "bg-indigo-500/20 text-indigo-300 dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-500/30 rounded-br-md"
                        : "bg-neutral-100 dark:bg-neutral-800/60 text-neutral-400 dark:text-neutral-500 border border-neutral-200/80 dark:border-neutral-700/80 rounded-bl-md"
                      }
                    `}
                  >
                    <div className="flex items-center gap-1.5">
                      <svg className="h-3.5 w-3.5 shrink-0 opacity-75" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                      </svg>
                      <span>This message was deleted</span>
                    </div>
                  </div>
                ) : isInvitation ? (
                  <div className="space-y-1.5">
                    {parentMsg && (
                      <div
                        className={`
                          rounded-lg px-2.5 py-1.5 text-xs border-l-2
                          ${isMine
                            ? "bg-indigo-600/50 border-indigo-200 text-indigo-100"
                            : "bg-neutral-100 dark:bg-neutral-700/50 border-indigo-500 text-neutral-600 dark:text-neutral-300"
                          }
                        `}
                      >
                        <p className="font-bold text-[10px] opacity-80">
                          {parentMsg.sender_name || parentMsg.user?.name || "Participant"}
                        </p>
                        <p className="truncate text-[11px]">
                          {parentIsDeleted
                            ? "This message was deleted"
                            : (parentMsg.custom_type === "team_invitation" || parentMsg.type === "team_invitation")
                              ? `🤝 Hackathon Team Invitation: Team ${parentMsg.team_name || parentMsg.teamName || "Team"}`
                              : parentMsg.text}
                        </p>
                      </div>
                    )}
                    <TeamInvitationCard
                      msg={msg}
                      channel={channel}
                      currentUserId={currentUserId}
                      forceOpen={activeMessageInfoMsgId === msg.id}
                      onClosePopover={() => setActiveMessageInfoMsgId(null)}
                      onInvitationUpdated={() => {
                        if (channel && channel.state) {
                          setMessages([...(channel.state.messages || [])]);
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div
                    className={`
                      rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-2xs
                      ${isMine
                        ? "bg-indigo-500 text-white rounded-br-md"
                        : "bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200/80 dark:border-neutral-700/80 rounded-bl-md"
                      }
                    `}
                  >
                    {/* Quoted parent message preview if reply */}
                    {parentMsg && (
                      <div
                        className={`
                          mb-2 rounded-lg px-2.5 py-1.5 text-xs border-l-2
                          ${isMine
                            ? "bg-indigo-600/50 border-indigo-200 text-indigo-100"
                            : "bg-neutral-100 dark:bg-neutral-700/50 border-indigo-500 text-neutral-600 dark:text-neutral-300"
                          }
                        `}
                      >
                        <p className="font-bold text-[10px] opacity-80">
                          {parentMsg.sender_name || parentMsg.user?.name || "Participant"}
                        </p>
                        <p className="truncate text-[11px]">
                          {parentIsDeleted
                            ? "This message was deleted"
                            : (parentMsg.custom_type === "team_invitation" || parentMsg.type === "team_invitation")
                              ? `🤝 Hackathon Team Invitation: Team ${parentMsg.team_name || parentMsg.teamName || "Team"}`
                              : parentMsg.text}
                        </p>
                      </div>
                    )}

                    {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}

                    {/* Message Attachments */}
                    {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {msg.attachments.map((att, attIdx) => {
                          const isImg =
                            att.type === "image" ||
                            !!att.image_url ||
                            [".jpg", ".jpeg", ".png", ".gif", ".webp"].some((ext) =>
                              (att.title || att.name || att.asset_url || "").toLowerCase().endsWith(ext)
                            );

                          const fileUrl = att.asset_url || att.image_url || att.url;
                          const fileName = att.title || att.name || "Attachment";
                          const fileSizeStr = formatFileSize(att.file_size);

                          if (isImg && fileUrl) {
                            return (
                              <div key={`att-${attIdx}`} className="overflow-hidden rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 max-w-sm my-1">
                                <img
                                  src={fileUrl}
                                  alt={fileName}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLightboxImage({ url: fileUrl, title: fileName });
                                  }}
                                  className="max-h-64 w-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                                  loading="lazy"
                                />
                              </div>
                            );
                          }

                          return (
                            <div
                              key={`att-${attIdx}`}
                              className={`
                                flex items-center gap-3 rounded-xl p-2.5 border text-xs max-w-xs transition-colors my-1
                                ${isMine
                                  ? "bg-indigo-600/40 border-indigo-400/40 text-indigo-50"
                                  : "bg-neutral-100 dark:bg-neutral-700/60 border-neutral-200 dark:border-neutral-600 text-neutral-800 dark:text-neutral-200"
                                }
                              `}
                            >
                              <span className="text-base">{getFileIconEmoji(fileName, att.mime_type || att.type)}</span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold">{fileName}</p>
                                {fileSizeStr && <p className="text-[10px] opacity-75">{fileSizeStr}</p>}
                              </div>
                              {fileUrl && (
                                <a
                                  href={fileUrl}
                                  download={fileName}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 hover:bg-black/10 rounded transition-colors text-current"
                                  title="Download"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                                  </svg>
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Timestamp & Edit Indicator */}
                    <div
                      className={`
                        mt-1 flex items-center gap-1 text-[10px] opacity-75
                        ${isMine ? "justify-end text-indigo-100" : "justify-start text-neutral-400 dark:text-neutral-500"}
                      `}
                    >
                      <span>{formatMessageTime(msg.created_at)}</span>
                      {isEdited && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMsgForEditHistory(msg);
                          }}
                          className="hover:underline italic text-[10px] focus:outline-none cursor-pointer"
                          title="View edit history"
                        >
                          (edited)
                        </button>
                      )}
                      {isMine && (
                        <span className="ml-0.5 inline-flex items-center">
                          <MessageStatus
                            msg={msg}
                            channel={channel}
                            currentUserId={currentUserId}
                            forceOpen={activeMessageInfoMsgId === msg.id}
                            onClosePopover={() => setActiveMessageInfoMsgId(null)}
                            onRetry={() => {
                              if (channel && typeof channel.sendMessage === "function") {
                                channel.sendMessage({ text: msg.text, attachments: msg.attachments }).catch(() => { });
                              }
                            }}
                          />
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Reaction Count Badges */}
                {reactionEntries.length > 0 && (
                  <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                    {reactionEntries.map(([typeKey, count]) => {
                      const displayEmoji = getDisplayEmoji(typeKey);
                      return (
                        <button
                          key={typeKey}
                          type="button"
                          onClick={() => !isBlocked && handleToggleReaction(msg.id, typeKey)}
                          disabled={isBlocked}
                          className="
                            inline-flex items-center gap-1 rounded-full border border-neutral-200/80
                            bg-white dark:bg-neutral-800 dark:border-neutral-700 px-2 py-0.5
                            text-[11px] font-medium text-neutral-700 dark:text-neutral-300 shadow-2xs
                            hover:scale-105 transition-transform disabled:hover:scale-100 disabled:opacity-75
                          "
                        >
                          <span>{displayEmoji}</span>
                          {count > 1 && <span className="text-[10px] text-neutral-400">{count}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            );

            return (
              <div
                key={msg.id}
                className={`group/msg relative flex flex-col ${isMine ? "items-end" : "items-start"} mb-1.5`}
              >
                {isGroupIncoming ? (
                  <div className="flex items-start gap-2.5 max-w-[85%]">
                    {/* Sender Avatar: Shown for first message in sequence, or spacer for alignment */}
                    {isFirstInSequence ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (senderId) navigate(`/profile/${senderId}`);
                        }}
                        className="shrink-0 mt-0.5 cursor-pointer hover:opacity-80 transition-opacity text-left focus:outline-none"
                        title={`View ${senderName}'s profile`}
                      >
                        {msgUserAvatar ? (
                          <img
                            src={msgUserAvatar}
                            alt={senderName}
                            className="h-8 w-8 rounded-full object-cover border border-neutral-200 dark:border-neutral-700 shadow-2xs"
                          />
                        ) : (
                          <div className="grid h-8 w-8 place-items-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-xs border border-neutral-200 dark:border-neutral-700 shadow-2xs">
                            {userInitials}
                          </div>
                        )}
                      </button>
                    ) : (
                      <div className="w-8 shrink-0" />
                    )}

                    <div className="flex flex-col min-w-0 flex-1">
                      {/* Sender Display Name: Shown above message for first message in sequence */}
                      {isFirstInSequence && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (senderId) navigate(`/profile/${senderId}`);
                          }}
                          className="text-left text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mb-1 ml-1 truncate hover:underline cursor-pointer focus:outline-none"
                          title={`View ${senderName}'s profile`}
                        >
                          {senderName}
                        </button>
                      )}

                      <div className="relative max-w-full group/bubble">
                        {renderBubbleContent()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative max-w-[78%] group/bubble">
                    {renderBubbleContent()}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* WhatsApp-style removal notice — shown at the bottom of message list for removed users */}
        {isRemovedFromGroup && (
          <div className="my-4 flex justify-center w-full px-4">
            <div className="rounded-2xl bg-neutral-100/90 dark:bg-neutral-800/90 border border-neutral-200/80 dark:border-neutral-700/80 px-5 py-3 text-center shadow-2xs max-w-sm space-y-1">
              <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                You were removed from this group.
              </p>
              <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                You can no longer send messages in this group.
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Typing Indicator ── */}
      {isTyping && !isBlocked && (
        <div className="shrink-0 px-4 py-1.5 bg-neutral-50 dark:bg-neutral-950 flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 animate-pulse">
          <span className="flex gap-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "300ms" }} />
          </span>
          <span>{name} is typing...</span>
        </div>
      )}

      {/* ── Composer / Blocked / Removed Notice Banner ── */}
      {isRemovedFromGroup ? (
        <div className="shrink-0 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900/90 px-4 py-4 text-center">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
            <span>You can no longer send messages in this group.</span>
          </div>
        </div>
      ) : isBlocked ? (
        <div className="shrink-0 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900/90 px-4 py-4 text-center">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
            <svg className="h-4 w-4 text-red-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M4.93 4.93l14.14 14.14" />
            </svg>
            <span>
              {isBlockedByMe
                ? "🚫 You blocked this user. You won't receive messages from this user."
                : "🚫 You cannot message this user."}
            </span>
          </div>
        </div>
      ) : (
        <div className="shrink-0 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/90 px-4 py-3 relative z-20">
          {/* Reply Indicator Bar */}
          {replyingToMessage && (
            <div className="mb-2 flex items-center justify-between rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-3 py-1.5 text-xs">
              <div className="min-w-0 flex-1 pr-2">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  Replying to {replyingToMessage.user?.name || name}
                </span>
                <p className="truncate text-neutral-600 dark:text-neutral-300 text-[11px]">
                  {replyingToMessage.text}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReplyingToMessage(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Edit Indicator Bar */}
          {editingMessage && (
            <div className="mb-2 flex items-center justify-between rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-3 py-1.5 text-xs">
              <span className="font-bold text-amber-700 dark:text-amber-400">
                Editing message
              </span>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Pending Attachment Composer Preview */}
          {pendingAttachment && (
            <div className="mb-2 flex items-center gap-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-2.5">
              {pendingAttachment.isImage ? (
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-200 dark:bg-neutral-800">
                  <img
                    src={pendingAttachment.url || pendingAttachment.cdnUrl}
                    alt={pendingAttachment.name}
                    className="h-full w-full object-cover"
                  />
                  {pendingAttachment.uploading && (
                    <div className="absolute inset-0 grid place-items-center bg-black/40">
                      <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10" />
                      </svg>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-xl">
                  {pendingAttachment.uploading ? (
                    <svg className="h-5 w-5 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10" />
                    </svg>
                  ) : (
                    "📎"
                  )}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                  {pendingAttachment.name}
                </p>
                <p className="text-[11px] text-neutral-400">
                  {pendingAttachment.uploading
                    ? "Uploading file..."
                    : `${(pendingAttachment.size / 1024).toFixed(1)} KB`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPendingAttachment(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="shrink-0 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                title="Remove attachment"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
            className="hidden"
            onChange={handleFileSelect}
          />

          <div className="flex items-end gap-2">
            {/* Emoji Trigger & Popover Wrapper */}
            <div ref={composerEmojiContainerRef} className="relative inline-flex items-center">
              <button
                type="button"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                className="
                  shrink-0 rounded-xl p-2.5 text-neutral-500 hover:text-indigo-600 hover:bg-neutral-100
                  dark:text-neutral-400 dark:hover:text-indigo-400 dark:hover:bg-neutral-800 transition-all duration-150 active:scale-95 group/emoji
                "
                title="Add emoji"
              >
                <svg
                  className="h-5 w-5 transition-transform duration-150 group-hover/emoji:scale-110"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9.5" />
                  <path d="M8.5 14.25c.8 1.4 2.1 2.25 3.5 2.25s2.7-.85 3.5-2.25" />
                  <circle cx="9" cy="9.5" r="1.2" fill="currentColor" stroke="none" />
                  <circle cx="15" cy="9.5" r="1.2" fill="currentColor" stroke="none" />
                </svg>
              </button>

              {/* Emoji Picker Popover */}
              {showEmojiPicker && (
                <div
                  className="
                    absolute bottom-12 left-0 z-40 p-2.5 w-64 rounded-2xl
                    border border-neutral-200 bg-white shadow-2xl
                    dark:border-neutral-700 dark:bg-neutral-800
                    animate-in fade-in zoom-in-95 duration-100 grid grid-cols-6 gap-1.5
                  "
                >
                  {EMOJI_PICKER_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setInputText((prev) => prev + emoji);
                        inputRef.current?.focus();
                      }}
                      className="h-8 w-8 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 grid place-items-center text-base transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Attachment Trigger */}
            <button
              ref={attachmentButtonRef}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                fileInputRef.current?.click();
                setShowEmojiPicker(false);
              }}
              className="
                shrink-0 rounded-xl p-2.5 text-neutral-500 hover:bg-neutral-100
                dark:text-neutral-400 dark:hover:bg-neutral-800 transition-colors
              "
              title="Attach file"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>

            {/* Text Area */}
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={editingMessage ? "Edit message..." : "Type a message..."}
              rows={1}
              className="
                flex-1 resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5
                text-sm text-neutral-900 placeholder-neutral-400
                focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400
                dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:placeholder-neutral-500
                dark:focus:border-indigo-500 dark:focus:ring-indigo-500
                max-h-32 overflow-y-auto
              "
              style={{ minHeight: "42px" }}
            />

            {/* Send / Save Button */}
            <button
              type="button"
              onClick={handleSend}
              disabled={(!inputText.trim() && !pendingAttachment) || sending || pendingAttachment?.uploading}
              className="
                shrink-0 rounded-xl bg-indigo-500 p-2.5 text-white
                transition-all duration-150
                hover:bg-indigo-600 active:scale-95
                disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigo-500
                dark:bg-indigo-600 dark:hover:bg-indigo-500
              "
              title={editingMessage ? "Save changes" : "Send message"}
            >
              {editingMessage ? (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Confirm Block User Modal ── */}
      {showBlockModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setShowBlockModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Block this user?
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
              You will no longer receive messages from this user.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBlockUser}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors shadow-xs"
              >
                Block
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Unblock User Modal ── */}
      {showUnblockModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setShowUnblockModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Unblock this user?
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
              You will be able to send and receive messages with this user again.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowUnblockModal(false)}
                className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUnblockUser}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs"
              >
                Unblock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete Message Modal ── */}
      {deleteConfirmMsg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setDeleteConfirmMsg(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Delete message?
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
              Are you sure you want to delete this message? This action cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmMsg(null)}
                className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteMessage}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors shadow-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Close Chat Modal ── */}
      {showRemoveModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setShowRemoveModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Close this chat?
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
              This will remove the chat from your active chat list. Your conversation will not be deleted.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRemoveModal(false)}
                className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveChat}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors shadow-xs"
              >
                Close Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Report User Modal ── */}
      {showReportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setShowReportModal(false)}
        >
          <form
            onSubmit={handleSubmitReport}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 animate-in fade-in zoom-in-95 duration-150 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Report User
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Report {name} for violating community guidelines.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Reason:
              </label>
              {["Spam", "Harassment", "Inappropriate behavior", "Fake account", "Other"].map((reason) => (
                <label key={reason} className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
                  <input
                    type="radio"
                    name="reportReason"
                    value={reason}
                    checked={reportReason === reason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="accent-indigo-500"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            <div>
              <textarea
                value={reportNotes}
                onChange={(e) => setReportNotes(e.target.value)}
                placeholder="Additional details (optional)..."
                rows={2}
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 p-2.5 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-xs"
              >
                Submit Report
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lightbox Image Preview Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-neutral-900 border border-neutral-800 p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2 text-white">
              <span className="text-sm font-semibold truncate max-w-md">{lightboxImage.title}</span>
              <div className="flex items-center gap-3">
                <a
                  href={lightboxImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={lightboxImage.title}
                  className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                >
                  Download Original
                </a>
                <button
                  onClick={() => setLightboxImage(null)}
                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="grid place-items-center p-2">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.title}
                className="max-h-[75vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
      {/* Edit History Modal */}
      {selectedHistoryMsg && (
        <EditHistoryModal
          msg={selectedHistoryMsg}
          onClose={() => setSelectedHistoryMsg(null)}
        />
      )}
      {/* Clear Chat Confirmation Modal */}
      {showClearChatModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => !clearingChat && setShowClearChatModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-red-500 mb-2">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 shrink-0">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Clear Chat?
              </h3>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed mt-1">
              Are you sure you want to clear this chat from your message history? Messages will remain available to the other participant.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowClearChatModal(false)}
                disabled={clearingChat}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearChat}
                disabled={clearingChat}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50"
              >
                {clearingChat ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10" />
                    </svg>
                    <span>Clearing...</span>
                  </>
                ) : (
                  <span>Clear Chat</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Group Confirmation Modal */}
      {showExitGroupModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => !exitingGroup && setShowExitGroupModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-2">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 shrink-0">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Exit group?
              </h3>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed mt-1">
              Are you sure you want to exit this group? You will no longer be able to send messages in this group.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowExitGroupModal(false)}
                disabled={exitingGroup}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmExitGroup}
                disabled={exitingGroup}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {exitingGroup ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10" />
                    </svg>
                    <span>Exiting...</span>
                  </>
                ) : (
                  <span>Exit group</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Group Confirmation Modal */}
      {showDeleteGroupModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => !deletingGroup && setShowDeleteGroupModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-2">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 shrink-0">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Delete group?
              </h3>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed mt-1">
              This will remove the group from your chat list. Other group members will still have access to the group.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteGroupModal(false)}
                disabled={deletingGroup}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteGroup}
                disabled={deletingGroup}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {deletingGroup ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10" />
                    </svg>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete group</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatPanel;
