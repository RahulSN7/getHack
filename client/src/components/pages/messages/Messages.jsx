// ---------------------------------------------------------------------------
// Messages.jsx — WhatsApp-Style Two-Panel Messaging Page
// Left: conversation list | Right: active chat
// Uses Stream Chat SDK for real-time messaging.
// ---------------------------------------------------------------------------

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useLocation, useSearchParams, useParams } from "react-router-dom";
import { useAuth } from "../../../context/useAuth";
import { useChatContext } from "../../../context/ChatContext";
import { userService } from "../../../services/userService";
import { chatService } from "../../../services/chatService";
import ConversationItem from "./ConversationItem";
import ChatPanel from "./ChatPanel";

function Messages() {
  const { user } = useAuth();
  const { chatClient, ready, error: chatError } = useChatContext();

  const navigate = useNavigate();
  const location = useLocation();
  const { userId: targetUserIdFromUrl } = useParams();
  const [searchParams] = useSearchParams();

  const targetUserIdParam =
    targetUserIdFromUrl || searchParams.get("user") || location.state?.targetUserId;

  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);

  const [loadingChannels, setLoadingChannels] = useState(true);
  const [channelError, setChannelError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // Favourites & Closed Chat states
  const [chatStates, setChatStates] = useState({});
  const [activeFilter, setActiveFilter] = useState("all"); // "all" | "favourites" | "closed"
  const [toastText, setToastText] = useState(null);

  const currentUserId = user?.id || user?._id || "";

  // Helper toast
  const showToast = (text) => {
    setToastText(text);
    setTimeout(() => setToastText(null), 3000);
  };

  // Fetch per-user chat states (favourites & closed) on mount
  useEffect(() => {
    if (!ready || !currentUserId) return;
    let cancelled = false;

    async function fetchStates() {
      try {
        const res = await chatService.getChatStates();
        if (!cancelled && res?.success && res.states) {
          setChatStates(res.states);
        }
      } catch (err) {
         console.error("Failed to load chat states:", err);
      }
    }

    fetchStates();
    return () => {
      cancelled = true;
    };
  }, [ready, currentUserId]);

  // -------------------------------------------------------------------------
  // Load channels and automatically open selected connection.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!chatClient || !ready || !currentUserId) {
      return;
    }

    let isMounted = true;

    async function loadAndSelect() {
      setLoadingChannels(true);
      setChannelError(null);

      try {
        let targetChannel = null;

        // ===================================================================
        // 1. Synchronize target user with Stream BEFORE channel creation.
        // ===================================================================
        if (
          targetUserIdParam &&
          String(targetUserIdParam) !== String(currentUserId)
        ) {
          const targetId = String(targetUserIdParam);

          console.log("----------------------------------------------");
          console.log("PREPARING DIRECT MESSAGE");
          console.log("CURRENT USER ID:", String(currentUserId));
          console.log("TARGET USER ID:", targetId);
          console.log("----------------------------------------------");

          try {
            const syncResult =
              await chatService.ensureTargetUser(targetId);

            console.log("----------------------------------------------");
            console.log("STREAM USER SYNC SUCCESS");
            console.log(syncResult);
            console.log("----------------------------------------------");
          } catch (error) {
            console.error("STREAM USER SYNC FAILED", error);

            throw new Error(
              `Unable to synchronize the selected user with Stream Chat: ${error.message || "Unknown synchronization error"
              }`
            );
          }
        }

        // ===================================================================
        // 2. Query existing messaging channels.
        // ===================================================================
        const filter = {
          type: "messaging",
          members: {
            $in: [String(currentUserId)],
          },
        };

        const sort = [{ last_message_at: -1 }];

        const options = {
          state: true,
          watch: true,
          presence: true,
          limit: 30,
        };

        const queriedChannels = await chatClient.queryChannels(
          filter,
          sort,
          options
        );

        // ===================================================================
        // 3. Find existing channel OR create a new one.
        // ===================================================================
        if (
          targetUserIdParam &&
          String(targetUserIdParam) !== String(currentUserId)
        ) {
          const targetId = String(targetUserIdParam);

          const existing = queriedChannels.find((channel) => {
            const memberIds = Object.keys(
              channel.state?.members || {}
            );

            return memberIds.includes(targetId);
          });

          if (existing) {
            console.log("EXISTING CHAT FOUND:", existing.cid);
            targetChannel = existing;
            await targetChannel.watch();
          } else {
            console.log("CREATING NEW DIRECT CHAT");

            targetChannel = chatClient.channel("messaging", {
              members: [
                String(currentUserId),
                targetId,
              ],
            });

            await targetChannel.watch();
          }

          try {
            const members = Object.values(
              targetChannel.state?.members || {}
            );

            const otherMember = members.find(
              (member) =>
                String(member.user_id || member.user?.id) !==
                String(currentUserId)
            );

            const otherUser = otherMember?.user || {};

            if (!otherUser.name || otherUser.name === targetId) {
              const profileRes =
                await userService.getParticipantProfile(targetId);

              if (profileRes?.user) {
                const u = profileRes.user;

                targetChannel.data = {
                  ...(targetChannel.data || {}),
                  targetName: u.name,
                  targetAvatar:
                    u.avatar ||
                    u.profile?.avatar ||
                    "",
                };
              }
            }
          } catch (profileError) {
            console.warn(
              "Could not load target getHack profile:",
              profileError
            );
          }
        }

        if (!isMounted) {
          return;
        }

        // ===================================================================
        // 5. Build final left-side chat list.
        // ===================================================================
        const combinedList = [];
        const addedCids = new Set();

        // Selected conversation always appears first.
        if (targetChannel) {
          combinedList.push(targetChannel);
          addedCids.add(targetChannel.cid);
        }

        // Add existing conversations with messages.
        queriedChannels.forEach((channel) => {
          const hasMessages =
            channel.state?.messages?.length > 0 ||
            channel.data?.last_message_at;

          if (
            hasMessages &&
            !addedCids.has(channel.cid)
          ) {
            combinedList.push(channel);
            addedCids.add(channel.cid);
          }
        });

        setChannels(combinedList);

        // ===================================================================
        // 6. Automatically open selected conversation on the right.
        // ===================================================================
        if (targetChannel) {
          setActiveChannel(targetChannel);
          setMobileShowChat(true);
        }
      } catch (error) {
        console.error(
          "FAILED TO LOAD/SELECT CHAT:",
          error
        );

        if (isMounted) {
          setChannelError(
            error.message ||
            "Failed to load conversations."
          );
        }
      } finally {
        if (isMounted) {
          setLoadingChannels(false);
        }
      }
    }

    loadAndSelect();

    return () => {
      isMounted = false;
    };
  }, [
    chatClient,
    ready,
    currentUserId,
    targetUserIdParam,
  ]);

  const activeChannelRef = useRef(activeChannel);
  useEffect(() => {
    activeChannelRef.current = activeChannel;
    if (activeChannel && typeof activeChannel.markRead === "function") {
      activeChannel
        .markRead()
        .then(() => {
          setChannels((prev) => [...prev]);
        })
        .catch(() => {});
    }
  }, [activeChannel]);

  const chatStatesRef = useRef(chatStates);
  useEffect(() => {
    chatStatesRef.current = chatStates;
  }, [chatStates]);

  // -------------------------------------------------------------------------
  // Listen for channel updates, incoming messages, and read events.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!chatClient) {
      return;
    }

    const handleChannelEvent = (event) => {
      const cid = event.cid || event.channel_id;

      // Auto-mark as read if incoming message is for currently open active channel
      if (
        (event.type === "message.new" || event.type === "notification.message_new") &&
        activeChannelRef.current?.cid === cid
      ) {
        const chan = event.channel || activeChannelRef.current;
        if (chan && typeof chan.markRead === "function") {
          chan.markRead().catch(() => {});
        }
      }

      // Auto-reopen if channel was closed and receives a new message
      if (cid && chatStatesRef.current[cid]?.isClosed) {
        chatService.reopenChat(cid).catch(() => {});
        if (event.channel && typeof event.channel.show === "function") {
          event.channel.show().catch(() => {});
        }
        setChatStates((prev) => ({
          ...prev,
          [cid]: {
            ...(prev[cid] || {}),
            isClosed: false,
          },
        }));
      }

      setChannels((previousChannels) => {
        const exists = previousChannels.some((ch) => ch.cid === cid);
        if (!exists && event.channel) {
          return [event.channel, ...previousChannels];
        }
        return [...previousChannels];
      });
    };

    chatClient.on("message.new", handleChannelEvent);
    chatClient.on("notification.message_new", handleChannelEvent);
    chatClient.on("message.read", handleChannelEvent);
    chatClient.on("notification.mark_read", handleChannelEvent);
    chatClient.on("channel.updated", handleChannelEvent);

    return () => {
      chatClient.off("message.new", handleChannelEvent);
      chatClient.off("notification.message_new", handleChannelEvent);
      chatClient.off("message.read", handleChannelEvent);
      chatClient.off("notification.mark_read", handleChannelEvent);
      chatClient.off("channel.updated", handleChannelEvent);
    };
  }, [chatClient]);

  // -------------------------------------------------------------------------
  // Handlers for Favourites, Close, and Reopen.
  // -------------------------------------------------------------------------
  const handleToggleFavourite = useCallback(
    async (targetChan) => {
      const chan = targetChan || activeChannel;
      if (!chan) return;
      const cid = chan.cid;

      const members = Object.values(chan.state?.members || {});
      const other = members.find(
        (m) => String(m.user_id || m.user?.id) !== String(currentUserId)
      );
      const targetUserId = other?.user_id || other?.user?.id || "";

      const currentFav = !!chatStates[cid]?.isFavourite;
      const newFav = !currentFav;

      setChatStates((prev) => ({
        ...prev,
        [cid]: {
          ...(prev[cid] || {}),
          isFavourite: newFav,
        },
      }));

      showToast(newFav ? "Chat added to favourites" : "Chat removed from favourites");

      try {
        await chatService.toggleFavourite(cid, newFav, targetUserId);
      } catch (err) {
        console.error("Failed to toggle favourite:", err);
        setChatStates((prev) => ({
          ...prev,
          [cid]: {
            ...(prev[cid] || {}),
            isFavourite: currentFav,
          },
        }));
        showToast("Failed to update favourite status");
      }
    },
    [activeChannel, chatStates, currentUserId]
  );

  const handleCloseChat = useCallback(
    async (targetChan) => {
      const chan = targetChan || activeChannel;
      if (!chan) return;
      const cid = chan.cid;

      const members = Object.values(chan.state?.members || {});
      const other = members.find(
        (m) => String(m.user_id || m.user?.id) !== String(currentUserId)
      );
      const targetUserId = other?.user_id || other?.user?.id || "";

      setChatStates((prev) => ({
        ...prev,
        [cid]: {
          ...(prev[cid] || {}),
          isClosed: true,
        },
      }));

      showToast("Chat closed");

      try {
        await chan.hide();
        await chatService.closeChat(cid, targetUserId);
      } catch (err) {
        console.error("Failed to close chat:", err);
      }

      if (activeChannel?.cid === cid) {
        setActiveChannel(null);
        setMobileShowChat(false);
        navigate("/messages", { replace: true });
      }
    },
    [activeChannel, currentUserId, navigate]
  );

  const handleReopenChannel = useCallback(
    async (chan) => {
      if (!chan) return;
      const cid = chan.cid;

      setChatStates((prev) => ({
        ...prev,
        [cid]: {
          ...(prev[cid] || {}),
          isClosed: false,
        },
      }));

      showToast("Chat reopened");

      try {
        await chan.show();
        await chatService.reopenChat(cid);
      } catch (err) {
        console.error("Failed to reopen chat:", err);
      }

      setActiveChannel(chan);
      setMobileShowChat(true);
    },
    []
  );

  const handleSelectChannel = useCallback((chan) => {
    if (!chan) return;
    setActiveChannel(chan);
    setMobileShowChat(true);
    if (typeof chan.markRead === "function") {
      chan
        .markRead()
        .then(() => {
          setChannels((prev) => [...prev]);
        })
        .catch(() => {});
    }
  }, []);

  // -------------------------------------------------------------------------
  // Search & Filter conversations.
  // -------------------------------------------------------------------------
  const filteredChannels = useMemo(() => {
    let list = channels;

    // Filter by active tab (All, Favourites, Closed)
    if (activeFilter === "favourites") {
      list = list.filter((ch) => !!chatStates[ch.cid]?.isFavourite);
    } else if (activeFilter === "closed") {
      list = list.filter((ch) => !!chatStates[ch.cid]?.isClosed);
    } else {
      // "all" tab: show active non-closed channels
      list = list.filter((ch) => !chatStates[ch.cid]?.isClosed);
    }

    if (!searchQuery.trim()) {
      return list;
    }

    const query = searchQuery.toLowerCase();

    return list.filter((channel) => {
      const members = Object.values(
        channel.state?.members || {}
      );

      const other = members.find(
        (member) =>
          String(
            member.user_id || member.user?.id
          ) !== String(currentUserId)
      );

      const otherName =
        other?.user?.name ||
        channel.data?.targetName ||
        "";

      return otherName
        .toLowerCase()
        .includes(query);
    });
  }, [
    channels,
    searchQuery,
    activeFilter,
    chatStates,
    currentUserId,
  ]);



  // -------------------------------------------------------------------------
  // Remove / Hide channel for current user.
  // -------------------------------------------------------------------------
  const handleRemoveChannel = useCallback(
    async (channelToRemove) => {
      if (!channelToRemove) {
        return;
      }

      try {
        // Hide channel in Stream Chat for current authenticated user
        await channelToRemove.hide();

        // Filter channel out of local state
        setChannels((previousChannels) =>
          previousChannels.filter(
            (channel) => channel.cid !== channelToRemove.cid
          )
        );

        // If active channel was removed, reset active state & navigate to /messages
        if (activeChannel?.cid === channelToRemove.cid) {
          setActiveChannel(null);
          setMobileShowChat(false);
          navigate("/messages", { replace: true });
        }
      } catch (error) {
        console.error("Failed to hide channel:", error);
      }
    },
    [activeChannel, navigate]
  );

  // -------------------------------------------------------------------------
  // Mobile back.
  // -------------------------------------------------------------------------
  const handleBack = useCallback(() => {
    setMobileShowChat(false);
    setActiveChannel(null);
  }, []);

  // -------------------------------------------------------------------------
  // Loading.
  // -------------------------------------------------------------------------
  if (!ready && !chatError) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-slate-50 dark:bg-neutral-950">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
          <svg
            className="h-4 w-4 animate-spin text-indigo-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              strokeDasharray="32"
              strokeDashoffset="10"
            />
          </svg>

          <span>
            Connecting to chat...
          </span>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Chat connection error.
  // -------------------------------------------------------------------------
  if (chatError) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-slate-50 dark:bg-neutral-950">
        <div className="text-center space-y-3 px-8">
          <div className="mx-auto h-14 w-14 rounded-full bg-red-50 dark:bg-red-500/10 grid place-items-center">
            <svg
              className="h-7 w-7 text-red-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
              />

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
            onClick={() =>
              window.location.reload()
            }
            className="
              inline-flex items-center gap-1.5
              rounded-lg bg-neutral-900
              px-4 py-2 text-xs font-semibold text-white
              hover:bg-neutral-800
              dark:bg-white dark:text-neutral-900
              dark:hover:bg-neutral-200
              transition-colors
            "
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Main Messages UI.
  // -------------------------------------------------------------------------
  return (
    <div className="relative h-[calc(100vh-64px)] flex bg-slate-50 dark:bg-neutral-950 overflow-hidden">
      {/* ── Toast Notification ── */}
      {toastText && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="rounded-full bg-neutral-900/90 dark:bg-white/90 px-4 py-1.5 text-xs font-semibold text-white dark:text-neutral-900 shadow-lg backdrop-blur-xs">
            {toastText}
          </div>
        </div>
      )}

      {/* ================================================================
          LEFT PANEL — CHAT LIST
         ================================================================ */}
      <div
        className={`
          w-full md:w-80 lg:w-96 shrink-0
          flex flex-col
          border-r border-neutral-200 dark:border-neutral-800
          bg-white dark:bg-neutral-900
          ${mobileShowChat
            ? "hidden md:flex"
            : "flex"
          }
        `}
      >

        {/* Header */}
        <div className="
          shrink-0
          border-b border-neutral-200
          dark:border-neutral-800/80
          bg-white dark:bg-neutral-900
          px-4 pt-4 pb-3
          space-y-3
        ">
          <div className="flex items-center justify-between">

            <h1 className="
              text-xl font-bold
              text-neutral-900 dark:text-white
              tracking-tight
            ">
              Chats
            </h1>
          </div>

          {/* Search */}
          <div className="relative">
            <svg
              className="
                absolute left-3 top-1/2
                -translate-y-1/2
                h-4 w-4
                text-neutral-400
              "
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle
                cx="11"
                cy="11"
                r="8"
              />

              <path d="M21 21l-4.35-4.35" />
            </svg>

            <input
              type="text"
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(
                  event.target.value
                )
              }
              placeholder="Search or start a new chat"
              className="
                w-full rounded-xl
                border border-neutral-200
                bg-neutral-50
                py-2 pl-9 pr-4
                text-xs text-neutral-700
                placeholder-neutral-400
                focus:border-indigo-400
                focus:outline-none
                focus:ring-1 focus:ring-indigo-400
                dark:border-neutral-700
                dark:bg-neutral-800
                dark:text-neutral-200
                dark:placeholder-neutral-500
                dark:focus:border-indigo-500
                dark:focus:ring-indigo-500
                transition-colors
              "
            />
          </div>

          {/* Filter Tabs: All | Favourites | Closed */}
          <div className="flex items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                activeFilter === "all"
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-2xs"
                  : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("favourites")}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                activeFilter === "favourites"
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-2xs"
                  : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              <span>❤️ Favourites</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("closed")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                activeFilter === "closed"
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-2xs"
                  : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              Closed
            </button>
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">

          {loadingChannels ? (
            <div>
              {[1, 2, 3, 4, 5].map(
                (item) => (
                  <div
                    key={item}
                    className="
                      flex items-center gap-3
                      px-4 py-3
                      animate-pulse
                    "
                  >
                    <div className="
                      h-12 w-12
                      rounded-full
                      bg-neutral-200
                      dark:bg-neutral-700
                      shrink-0
                    " />

                    <div className="
                      flex-1 space-y-2
                    ">
                      <div className="
                        h-3 w-24
                        rounded
                        bg-neutral-200
                        dark:bg-neutral-700
                      " />

                      <div className="
                        h-2.5 w-40
                        rounded
                        bg-neutral-100
                        dark:bg-neutral-800
                      " />
                    </div>
                  </div>
                )
              )}
            </div>
          ) : channelError ? (
            <div className="
              flex flex-col
              items-center justify-center
              h-full px-6
              text-center
            ">
              <p className="
                text-xs text-red-400
              ">
                {channelError}
              </p>

              <button
                type="button"
                onClick={() =>
                  window.location.reload()
                }
                className="
                  mt-2
                  text-xs font-medium
                  text-indigo-500
                  hover:underline
                "
              >
                Retry
              </button>
            </div>
          ) : filteredChannels.length === 0 ? (
            <div className="
              flex flex-col
              items-center justify-center
              h-full px-8
              text-center
            ">

              {searchQuery ? (
                <>
                  <p className="
                    text-sm font-semibold
                    text-neutral-600
                    dark:text-neutral-400
                  ">
                    No chats found
                  </p>

                  <p className="
                    mt-1 text-xs
                    text-neutral-400
                    dark:text-neutral-500
                  ">
                    No conversations match
                    &ldquo;{searchQuery}&rdquo;
                  </p>
                </>
              ) : activeFilter === "favourites" ? (
                <>
                  <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                    No favourite chats
                  </p>
                  <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500 max-w-[220px]">
                    Click option menu (⋮) in any chat and select &quot;Add to favourites&quot;.
                  </p>
                </>
              ) : activeFilter === "closed" ? (
                <>
                  <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                    No closed chats
                  </p>
                  <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500 max-w-[220px]">
                    Closed conversations will appear here.
                  </p>
                </>
              ) : (
                <>
                  <div className="
                    mx-auto h-16 w-16
                    rounded-full
                    bg-indigo-50
                    dark:bg-indigo-500/10
                    grid place-items-center
                    mb-4
                  ">
                    <svg
                      className="
                        h-8 w-8
                        text-indigo-400
                      "
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="
                        M21 15a2 2 0 0 1-2 2H7
                        l-4 4V5a2 2 0 0 1 2-2h14
                        a2 2 0 0 1 2 2z
                      " />
                    </svg>
                  </div>

                  <h3 className="
                    text-sm font-semibold
                    text-neutral-700
                    dark:text-neutral-300
                  ">
                    No chats yet
                  </h3>

                  <p className="
                    mt-1 text-xs
                    text-neutral-400
                    dark:text-neutral-500
                    max-w-[220px]
                  ">
                    Start a conversation with
                    one of your getHack
                    connections.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        "/network?tab=connections"
                      )
                    }
                    className="
                      mt-4
                      inline-flex
                      items-center gap-1.5
                      rounded-lg
                      bg-neutral-900
                      px-4 py-2
                      text-xs font-semibold
                      text-white
                      hover:bg-neutral-800
                      transition-colors
                      dark:bg-white
                      dark:text-neutral-900
                      dark:hover:bg-neutral-200
                    "
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="
                        M17 21v-2a4 4 0 0 0-4-4H5
                        a4 4 0 0 0-4 4v2
                      " />

                      <circle
                        cx="9"
                        cy="7"
                        r="4"
                      />

                      <path d="
                        M23 21v-2
                        a4 4 0 0 0-3-3.87
                      " />

                      <path d="
                        M16 3.13a4 4 0 0 1 0 7.75
                      " />
                    </svg>

                    View Connections
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="py-1">
              {filteredChannels.map(
                (channel) => (
                  <ConversationItem
                    key={channel.cid}
                    channel={channel}
                    currentUserId={
                      currentUserId
                    }
                    isActive={
                      activeChannel?.cid ===
                      channel.cid
                    }
                    isFavourite={
                      !!chatStates[channel.cid]?.isFavourite
                    }
                    isClosed={
                      !!chatStates[channel.cid]?.isClosed
                    }
                    onClick={() =>
                      handleSelectChannel(
                        channel
                      )
                    }
                    onReopen={
                      handleReopenChannel
                    }
                  />
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================================================================
          RIGHT PANEL — CHAT
         ================================================================ */}
      <div
        className={`
          flex-1 flex flex-col
          min-w-0
          ${mobileShowChat
            ? "flex"
            : "hidden md:flex"
          }
        `}
      >
        <ChatPanel
          channel={activeChannel}
          currentUserId={currentUserId}
          onBack={handleBack}
          onRemoveChannel={handleRemoveChannel}
          isFavourite={!!chatStates[activeChannel?.cid]?.isFavourite}
          onToggleFavourite={handleToggleFavourite}
          onCloseChat={handleCloseChat}
        />
      </div>
    </div>
  );
}

export default Messages;