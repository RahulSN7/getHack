// ---------------------------------------------------------------------------
// ChatPanel.jsx — Right-Side Chat Panel with Production Messaging UX
// Includes quick reaction bar (👍 ❤️ 😂 😮 😢 🙏 +), expanded emoji picker,
// replies, edit/delete, copy, typing indicators, search, report user, presence,
// attachments, per-user remove chat, and complete Block/Unblock system.
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { chatService } from "../../../services/chatService";
import TeamInvitationCard from "./TeamInvitationCard";

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
// FloatingMessageMenu Component (WhatsApp-Style Floating Context Menu)
// Rendered via React Portal (document.body) anchored directly to the ⋮ button.
// Guarantees zero layout shift, zero extra card height, and upward/downward placement.
// ---------------------------------------------------------------------------
function FloatingMessageMenu({
  msg,
  btnRef,
  isMine,
  isBlocked,
  onClose,
  onReply,
  onCopy,
  onEdit,
  onDelete,
  onReport,
}) {
  const menuRef = useRef(null);
  const [coords, setCoords] = useState({ top: -9999, left: -9999, opacity: 0 });

  useEffect(() => {
    if (!btnRef?.current) return;
    const btnRect = btnRef.current.getBoundingClientRect();
    const menuWidth = 148;
    const menuHeight = 160;

    const spaceBelow = window.innerHeight - btnRect.bottom;
    const spaceAbove = btnRect.top;

    let top = btnRect.bottom + 4; // default downward
    if (spaceBelow < menuHeight && spaceAbove >= menuHeight) {
      top = btnRect.top - menuHeight - 4; // upward anchor above ⋮ button
    } else if (spaceBelow < menuHeight && spaceAbove < menuHeight) {
      top = spaceAbove > spaceBelow ? Math.max(8, btnRect.top - menuHeight - 4) : btnRect.bottom + 4;
    }

    // Clamp vertical position inside screen bounds
    top = Math.max(8, Math.min(top, window.innerHeight - menuHeight - 8));

    // Horizontal alignment: right edge aligned for sent messages (isMine), left edge for received
    let left = isMine ? btnRect.right - menuWidth : btnRect.left;
    left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));

    setCoords({
      top,
      left,
      opacity: 1,
    });
  }, [btnRef, isMine]);

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

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        opacity: coords.opacity,
        zIndex: 9999,
      }}
      className="
        w-36 rounded-2xl border border-neutral-200 bg-white/95 py-1.5 shadow-2xl backdrop-blur-md
        dark:border-neutral-700/80 dark:bg-neutral-900/95 dark:text-white
        animate-in fade-in zoom-in-95 duration-100 max-h-56 overflow-y-auto
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

function ChatPanel({ channel, currentUserId, onBack, onRemoveChannel, isFavourite, onToggleFavourite, onCloseChat }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
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
  const [isBlockedByMe, setIsBlockedByMe] = useState(false);
  const [isBlockedByOther, setIsBlockedByOther] = useState(false);

  // Typing & Presence
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // Message Interaction States
  const [activeMessageMenu, setActiveMessageMenu] = useState(null); // msg.id
  const [menuDirections, setMenuDirections] = useState({}); // { [msgId]: "up" | "down" }
  const [replyingToMessage, setReplyingToMessage] = useState(null); // msg object
  const [editingMessage, setEditingMessage] = useState(null); // msg object
  const [deleteConfirmMsg, setDeleteConfirmMsg] = useState(null); // msg object
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState(null);
  const [showExpandedReactionPickerId, setShowExpandedReactionPickerId] = useState(null);
  const [pendingAttachment, setPendingAttachment] = useState(null); // { file, name, size, mimeType, isImage, uploading, cdnUrl }
  const [lightboxImage, setLightboxImage] = useState(null); // { url, title }

  // Toast Notification
  const [toastText, setToastText] = useState(null);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const menuBtnRefs = useRef({});
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Close active message menu on window resize to ensure responsive positioning
  useEffect(() => {
    const handleResize = () => {
      if (activeMessageMenu) {
        setActiveMessageMenu(null);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeMessageMenu]);

  // Smart toggle handler calculating available space above and below message button
  const handleToggleMessageMenu = (msgId, e) => {
    if (e) e.stopPropagation();

    if (activeMessageMenu === msgId) {
      setActiveMessageMenu(null);
      return;
    }

    const btnEl = menuBtnRefs.current[msgId];
    const containerEl = messagesContainerRef.current;

    let direction = "down";
    if (btnEl && containerEl) {
      const btnRect = btnEl.getBoundingClientRect();
      const containerRect = containerEl.getBoundingClientRect();

      const spaceBelow = containerRect.bottom - btnRect.bottom;
      const spaceAbove = btnRect.top - containerRect.top;
      const estimatedMenuHeight = 150;

      if (spaceBelow < estimatedMenuHeight && spaceAbove >= estimatedMenuHeight) {
        direction = "up";
      } else if (spaceBelow < estimatedMenuHeight && spaceAbove < estimatedMenuHeight) {
        direction = spaceAbove > spaceBelow ? "up" : "down";
      }
    }

    setMenuDirections((prev) => ({ ...prev, [msgId]: direction }));
    setActiveMessageMenu(msgId);
  };

  // Extract other user info
  const members = Object.values(channel?.state?.members || {});
  const otherMember = members.find(
    (m) => String(m.user_id || m.user?.id) !== String(currentUserId)
  );
  const otherUser = otherMember?.user || {};
  let name = otherUser.name;
  if (!name || name === otherUser.id) {
    name = channel?.data?.targetName || "Participant";
  }
  const avatar = otherUser.image || channel?.data?.targetAvatar || "";
  const userId = otherUser.id || otherMember?.user_id || "";
  const isOnline = otherMember?.user?.online || false;

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "GH";

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

  // Load messages and watch channel
  useEffect(() => {
    if (!channel) return;

    let cancelled = false;

    async function init() {
      setLoading(true);
      try {
        await channel.watch();
        if (!cancelled) {
          setMessages([...(channel.state.messages || [])]);
          channel.markRead().catch(() => { });
        }
      } catch (err) {
        console.error("Failed to load messages:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();

    // Listen for events (ignoring events from blocked users)
    const handleNewMessage = (event) => {
      if (event.channel_id === channel.id || event.cid === channel.cid) {
        const senderId = String(event.message?.user?.id || event.user?.id || "");
        if (isBlockedByMe && senderId === String(userId)) {
          return; // Ignore real-time messages from blocked user
        }
        setMessages([...(channel.state.messages || [])]);
        channel.markRead().catch(() => { });
      }
    };

    const handleTypingStart = (event) => {
      if (String(event.user?.id) !== String(currentUserId) && !isBlockedByMe && !isBlockedByOther) {
        setIsTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 4000);
      }
    };

    const handleTypingStop = (event) => {
      if (String(event.user?.id) !== String(currentUserId)) {
        setIsTyping(false);
      }
    };

    channel.on("message.new", handleNewMessage);
    channel.on("message.updated", handleNewMessage);
    channel.on("message.deleted", handleNewMessage);
    channel.on("reaction.new", handleNewMessage);
    channel.on("reaction.deleted", handleNewMessage);
    channel.on("typing.start", handleTypingStart);
    channel.on("typing.stop", handleTypingStop);

    return () => {
      cancelled = true;
      channel.off("message.new", handleNewMessage);
      channel.off("message.updated", handleNewMessage);
      channel.off("message.deleted", handleNewMessage);
      channel.off("reaction.new", handleNewMessage);
      channel.off("reaction.deleted", handleNewMessage);
      channel.off("typing.start", handleTypingStart);
      channel.off("typing.stop", handleTypingStop);
    };
  }, [channel?.cid, currentUserId, isBlockedByMe, isBlockedByOther, userId]);

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
    if ((!text && !pendingAttachment) || sending || !channel) return;

    if (pendingAttachment?.uploading) {
      showToast("Please wait for file upload to complete.");
      return;
    }

    setSending(true);

    try {
      if (editingMessage) {
        // Edit existing message using Stream Chat SDK
        const client = channel.getClient?.() || channel.client;
        if (client && typeof client.updateMessage === "function") {
          await client.updateMessage({ id: editingMessage.id, text });
        } else {
          await channel.sendMessage({ id: editingMessage.id, text });
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

        await channel.sendMessage(payload);
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
      setMessages((prev) => prev.filter((m) => m.id !== deleteConfirmMsg.id));
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

  // Filter messages by search query if active
  const displayedMessages = searchQuery.trim()
    ? messages.filter((m) => m.text?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

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
            onClick={() => userId && navigate(`/profile/${userId}`)}
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
              <span
                className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-neutral-900 ${isOnline && !isBlocked ? "bg-emerald-500" : "bg-neutral-400"
                  }`}
              />
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
                {isBlocked ? (
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
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-2 text-xs font-medium text-neutral-400">
              <svg className="h-4 w-4 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10" />
              </svg>
              Loading messages...
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
            const isMine = String(msg.user?.id || msg.user_id) === String(currentUserId);

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

            return (
              <div
                key={msg.id}
                className={`group/msg relative flex flex-col ${isMine ? "items-end" : "items-start"} mb-1.5`}
              >
                {/* Bubble Container with Hover Action Bar */}
                <div className="relative max-w-[78%] group/bubble">
                  {/* Action Bar (Triggered on hover/touch — disabled when blocked) */}
                  {!isBlocked && (
                    <div
                      className={`
                        absolute -top-3 ${isMine ? "right-2" : "left-2"} z-10
                        hidden group-hover/msg:flex items-center gap-0.5 rounded-full
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
                        onClick={(e) => handleToggleMessageMenu(msg.id, e)}
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
                      btnRef={{ current: menuBtnRefs.current[msg.id] }}
                      isMine={isMine}
                      isBlocked={isBlocked}
                      onClose={() => setActiveMessageMenu(null)}
                      onReply={handleStartReply}
                      onCopy={handleCopyMessage}
                      onEdit={handleStartEdit}
                      onDelete={(m) => {
                        setActiveMessageMenu(null);
                        setDeleteConfirmMsg(m);
                      }}
                      onReport={() => {
                        setActiveMessageMenu(null);
                        setShowReportModal(true);
                      }}
                    />
                  )}

                  {/* Message Bubble Content */}
                  {isInvitation ? (
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
                            {(parentMsg.custom_type === "team_invitation" || parentMsg.type === "team_invitation")
                              ? `🤝 Hackathon Team Invitation: Team ${parentMsg.team_name || parentMsg.teamName || "Team"}`
                              : parentMsg.text}
                          </p>
                        </div>
                      )}
                      <TeamInvitationCard
                        msg={msg}
                        currentUserId={currentUserId}
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
                            {(parentMsg.custom_type === "team_invitation" || parentMsg.type === "team_invitation")
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
                                  ? "bg-indigo-600/60 border-indigo-400/40 text-white"
                                  : "bg-neutral-100 dark:bg-neutral-800/80 border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200"
                                }
                              `}
                            >
                              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-base">
                                {getFileIconEmoji(fileName, att.mime_type)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold truncate text-xs">{fileName}</p>
                                <p className="text-[10px] opacity-75 mt-0.5">
                                  {getFileTypeLabel(fileName, att.mime_type)} {fileSizeStr ? `• ${fileSizeStr}` : ""}
                                </p>
                                {fileUrl && (
                                  <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={fileName}
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold underline hover:opacity-80"
                                  >
                                    Open / Download ↓
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <p
                      className={`text-[10px] mt-1 text-right font-medium ${isMine ? "text-indigo-200" : "text-neutral-400 dark:text-neutral-500"
                        }`}
                    >
                      {formatMessageTime(msg.created_at)}
                    </p>
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
                </div>
              </div>
            );
          })
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

      {/* ── Composer / Blocked Notice Banner ── */}
      {isBlocked ? (
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

          {/* Emoji Picker Popover */}
          {showEmojiPicker && (
            <div
              className="
                absolute bottom-16 left-4 z-40 p-2.5 w-64 rounded-2xl
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
                    setShowEmojiPicker(false);
                    inputRef.current?.focus();
                  }}
                  className="h-8 w-8 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 grid place-items-center text-base transition-colors"
                >
                  {emoji}
                </button>
              ))}
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
                    getFileIconEmoji(pendingAttachment.name, pendingAttachment.mimeType)
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
                    : `${getFileTypeLabel(pendingAttachment.name, pendingAttachment.mimeType)} • ${formatFileSize(pendingAttachment.size)}`}
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
            {/* Emoji Trigger */}
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

            {/* Attachment Trigger */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
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
    </div>
  );
}

export default ChatPanel;
