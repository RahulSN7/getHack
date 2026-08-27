// ---------------------------------------------------------------------------
// ChatPanel.jsx — Right-Side Chat Panel
// Displays the active conversation with message list and composer.
// Uses Stream Chat SDK directly with custom UI (not stream-chat-react).
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

function formatMessageTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateSeparator(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

function ChatPanel({ channel, currentUserId, onBack }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [imgError, setImgError] = useState(false);

  // Extract other user info
  const members = Object.values(channel?.state?.members || {});
  const otherMember = members.find((m) => m.user_id !== currentUserId && m.user?.id !== currentUserId);
  const otherUser = otherMember?.user || {};
  const name = otherUser.name || "User";
  const avatar = otherUser.image || "";
  const userId = otherUser.id || "";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "GH";

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Load messages and watch channel
  useEffect(() => {
    if (!channel) return;

    let cancelled = false;

    async function init() {
      setLoading(true);
      try {
        // Watch the channel (loads state + subscribes to events)
        await channel.watch();
        if (!cancelled) {
          setMessages([...(channel.state.messages || [])]);
          // Mark messages as read
          channel.markRead().catch(() => {});
        }
      } catch (err) {
        console.error("Failed to load messages:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();

    // Listen for new messages
    const handleNewMessage = (event) => {
      if (event.channel_id === channel.id) {
        setMessages([...(channel.state.messages || [])]);
        channel.markRead().catch(() => {});
      }
    };

    channel.on("message.new", handleNewMessage);
    channel.on("message.updated", handleNewMessage);
    channel.on("message.deleted", handleNewMessage);

    return () => {
      cancelled = true;
      channel.off("message.new", handleNewMessage);
      channel.off("message.updated", handleNewMessage);
      channel.off("message.deleted", handleNewMessage);
    };
  }, [channel?.cid]);

  // Scroll on message changes
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Focus input when channel changes
  useEffect(() => {
    inputRef.current?.focus();
  }, [channel?.cid]);

  // Send message
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending || !channel) return;

    setSending(true);
    try {
      await channel.sendMessage({ text });
      setInputText("");
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // Handle key press
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date
  const groupedMessages = [];
  let lastDate = "";
  messages.forEach((msg) => {
    const msgDate = msg.created_at ? new Date(msg.created_at).toDateString() : "";
    if (msgDate !== lastDate) {
      groupedMessages.push({ type: "separator", date: msg.created_at });
      lastDate = msgDate;
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

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-950">
      {/* ── Right Chat Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 shrink-0">
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
            <div className="min-w-0 text-left">
              <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate group-hover:text-indigo-500 transition-colors">
                {name}
              </p>
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 truncate">
                Available
              </p>
            </div>
          </div>
        </div>

        {/* Right Header Action Icons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 transition-colors"
            title="Search in chat"
          >
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </button>
          <button
            type="button"
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 transition-colors"
            title="Chat options"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.75" />
              <circle cx="12" cy="12" r="1.75" />
              <circle cx="12" cy="19" r="1.75" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Messages Area ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-neutral-50 dark:bg-neutral-950">
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
                No messages yet. Say hello! 👋
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
            const isMine = msg.user?.id === currentUserId;

            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1`}
              >
                <div
                  className={`
                    max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed
                    ${
                      isMine
                        ? "bg-indigo-500 text-white rounded-br-md"
                        : "bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 rounded-bl-md"
                    }
                  `}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                  <p
                    className={`text-[10px] mt-1 text-right ${
                      isMine ? "text-indigo-200" : "text-neutral-400 dark:text-neutral-500"
                    }`}
                  >
                    {formatMessageTime(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Composer ── */}
      <div className="shrink-0 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
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
          <button
            type="button"
            onClick={handleSend}
            disabled={!inputText.trim() || sending}
            className="
              shrink-0 rounded-xl bg-indigo-500 p-2.5 text-white
              transition-all duration-150
              hover:bg-indigo-600 active:scale-95
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigo-500
              dark:bg-indigo-600 dark:hover:bg-indigo-500
            "
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatPanel;
