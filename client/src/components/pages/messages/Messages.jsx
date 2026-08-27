// ---------------------------------------------------------------------------
// Messages.jsx — WhatsApp-Style Two-Panel Messaging Page
// Left: conversation list | Right: active chat
// Uses Stream Chat SDK for real-time messaging.
// ---------------------------------------------------------------------------

import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../context/useAuth";
import { useChatContext } from "../../../context/ChatContext";
import ConversationItem from "./ConversationItem";
import ChatPanel from "./ChatPanel";

function Messages() {
  const { user } = useAuth();
  const { chatClient, ready, error: chatError } = useChatContext();
  const navigate = useNavigate();
  const location = useLocation();

  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [channelError, setChannelError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const currentUserId = user?.id || user?._id || "";

  // Load channels from Stream Chat
  const loadChannels = useCallback(async () => {
    if (!chatClient || !ready) return;

    setLoadingChannels(true);
    setChannelError(null);

    try {
      const filter = {
        type: "messaging",
        members: { $in: [String(currentUserId)] },
      };
      const sort = [{ last_message_at: -1 }];
      const options = { state: true, watch: true, presence: true, limit: 30 };

      const result = await chatClient.queryChannels(filter, sort, options);

      // Only show channels that have at least one message
      const withMessages = result.filter(
        (ch) => ch.state?.messages?.length > 0 || ch.data?.last_message_at
      );

      setChannels(withMessages);
    } catch (err) {
      console.error("Failed to load channels:", err);
      setChannelError(err.message || "Failed to load conversations.");
    } finally {
      setLoadingChannels(false);
    }
  }, [chatClient, ready, currentUserId]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  // Listen for channel updates (new messages in any channel)
  useEffect(() => {
    if (!chatClient) return;

    const handleChannelEvent = () => {
      loadChannels();
    };

    chatClient.on("message.new", handleChannelEvent);
    chatClient.on("channel.updated", handleChannelEvent);
    chatClient.on("notification.message_new", handleChannelEvent);

    return () => {
      chatClient.off("message.new", handleChannelEvent);
      chatClient.off("channel.updated", handleChannelEvent);
      chatClient.off("notification.message_new", handleChannelEvent);
    };
  }, [chatClient, loadChannels]);

  // Auto-open conversation if navigated with state (from Network "Message" button)
  useEffect(() => {
    if (!location.state?.targetUserId || !chatClient || !ready || !currentUserId) return;

    async function openOrCreateChannel() {
      try {
        const targetId = String(location.state.targetUserId);
        const channel = chatClient.channel("messaging", {
          members: [String(currentUserId), targetId],
        });
        await channel.watch();
        setActiveChannel(channel);
        setMobileShowChat(true);

        // Add to channels list if not already there
        setChannels((prev) => {
          const exists = prev.some((ch) => ch.cid === channel.cid);
          if (!exists) return [channel, ...prev];
          return prev;
        });

        // Clear location state to prevent re-opening
        navigate(location.pathname, { replace: true, state: {} });
      } catch (err) {
        console.error("Failed to open conversation:", err);
      }
    }

    openOrCreateChannel();
  }, [location.state?.targetUserId, chatClient, ready, currentUserId, navigate, location.pathname]);

  // Filter conversations by search
  const filteredChannels = useMemo(() => {
    if (!searchQuery.trim()) return channels;
    const q = searchQuery.toLowerCase();
    return channels.filter((ch) => {
      const members = Object.values(ch.state?.members || {});
      const other = members.find((m) => m.user?.id !== currentUserId);
      const otherName = other?.user?.name || "";
      return otherName.toLowerCase().includes(q);
    });
  }, [channels, searchQuery, currentUserId]);

  // Select channel
  const handleSelectChannel = useCallback((channel) => {
    setActiveChannel(channel);
    setMobileShowChat(true);
  }, []);

  // Back from chat (mobile)
  const handleBack = useCallback(() => {
    setMobileShowChat(false);
    setActiveChannel(null);
    loadChannels(); // Refresh to update unread counts
  }, [loadChannels]);

  // ── LOADING STATE ──
  if (!ready && !chatError) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-slate-50 dark:bg-neutral-950">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
          <svg className="h-4 w-4 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10" />
          </svg>
          <span>Connecting to chat...</span>
        </div>
      </div>
    );
  }

  // ── ERROR STATE ──
  if (chatError) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-slate-50 dark:bg-neutral-950">
        <div className="text-center space-y-3 px-8">
          <div className="mx-auto h-14 w-14 rounded-full bg-red-50 dark:bg-red-500/10 grid place-items-center">
            <svg className="h-7 w-7 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Unable to connect to chat
          </h3>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 max-w-sm">
            {chatError}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex bg-slate-50 dark:bg-neutral-950 overflow-hidden">
      {/* ════════════════════════════════════════════════════════════════
          LEFT PANEL — CONVERSATION LIST
         ════════════════════════════════════════════════════════════════ */}
      <div
        className={`
          w-full md:w-80 lg:w-96 shrink-0
          flex flex-col
          border-r border-neutral-200 dark:border-neutral-800
          bg-white dark:bg-neutral-900
          ${mobileShowChat ? "hidden md:flex" : "flex"}
        `}
      >
        {/* ── Left Panel Header — Permanently Visible ── */}
        <div className="shrink-0 border-b border-neutral-200 dark:border-neutral-800/80 bg-white dark:bg-neutral-900 px-4 pt-4 pb-3 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight">
              Chats
            </h1>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 transition-colors"
                title="Options"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="1.75" />
                  <circle cx="12" cy="12" r="1.75" />
                  <circle cx="12" cy="19" r="1.75" />
                </svg>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search or start a new chat"
              className="
                w-full rounded-xl border border-neutral-200 bg-neutral-50
                py-2 pl-9 pr-4 text-xs
                text-neutral-700 placeholder-neutral-400
                focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400
                dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200
                dark:placeholder-neutral-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500
                transition-colors
              "
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loadingChannels ? (
            <div className="space-y-0">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                  <div className="h-12 w-12 rounded-full bg-neutral-200 dark:bg-neutral-700 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 rounded bg-neutral-200 dark:bg-neutral-700" />
                    <div className="h-2.5 w-40 rounded bg-neutral-100 dark:bg-neutral-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : channelError ? (
            <div className="flex flex-col items-center justify-center h-full px-6 text-center">
              <p className="text-xs text-red-400">{channelError}</p>
              <button
                type="button"
                onClick={loadChannels}
                className="mt-2 text-xs font-medium text-indigo-500 hover:underline"
              >
                Retry
              </button>
            </div>
          ) : filteredChannels.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-8 text-center">
              {searchQuery ? (
                <>
                  <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                    No chats found
                  </p>
                  <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                    No conversations match &ldquo;{searchQuery}&rdquo;
                  </p>
                </>
              ) : (
                <>
                  <div className="mx-auto h-16 w-16 rounded-full bg-indigo-50 dark:bg-indigo-500/10 grid place-items-center mb-4">
                    <svg className="h-8 w-8 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                    No chats yet
                  </h3>
                  <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500 max-w-[220px]">
                    Start a conversation with one of your getHack connections.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/network?tab=connections")}
                    className="
                      mt-4 inline-flex items-center gap-1.5 rounded-lg
                      bg-neutral-900 px-4 py-2 text-xs font-semibold text-white
                      hover:bg-neutral-800 transition-colors
                      dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200
                    "
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    View Connections
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
              {filteredChannels.map((ch) => (
                <ConversationItem
                  key={ch.cid}
                  channel={ch}
                  currentUserId={currentUserId}
                  isActive={activeChannel?.cid === ch.cid}
                  onClick={() => handleSelectChannel(ch)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          RIGHT PANEL — CHAT
         ════════════════════════════════════════════════════════════════ */}
      <div
        className={`
          flex-1 flex flex-col min-w-0
          ${mobileShowChat ? "flex" : "hidden md:flex"}
        `}
      >
        <ChatPanel
          channel={activeChannel}
          currentUserId={currentUserId}
          onBack={handleBack}
        />
      </div>
    </div>
  );
}

export default Messages;
