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
import StartNewChatModal from "./StartNewChatModal";
import CreateGroupModal from "./CreateGroupModal";

function getChannelLatestTimestamp(channel, clearedAt) {
  if (!channel) return 0;
  const clearTime = clearedAt ? new Date(clearedAt).getTime() : 0;
  const rawMessages = channel.state?.messages || [];
  const visibleMessages = clearTime
    ? rawMessages.filter((m) => {
        const t = new Date(m.created_at || m.createdAt).getTime();
        return !isNaN(t) && t > clearTime;
      })
    : rawMessages;

  if (visibleMessages.length > 0) {
    const lastMsg = visibleMessages[visibleMessages.length - 1];
    const t = new Date(lastMsg.created_at || lastMsg.createdAt).getTime();
    if (!isNaN(t)) return t;
  }

  const lastAt = channel.state?.last_message_at || channel.data?.last_message_at || channel.created_at;
  const t = lastAt ? new Date(lastAt).getTime() : 0;
  return isNaN(t) ? 0 : t;
}

function sortChannelsByLatest(channelsList, chatStatesMap = {}) {
  return [...channelsList].sort((a, b) => {
    const timeA = getChannelLatestTimestamp(a, chatStatesMap[a.cid]?.clearedAt);
    const timeB = getChannelLatestTimestamp(b, chatStatesMap[b.cid]?.clearedAt);
    return timeB - timeA;
  });
}

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

  // Favourites & Chat states
  const [chatStates, setChatStates] = useState({});
  const [activeFilter, setActiveFilter] = useState("all"); // "all" | "unread" | "favourites" | "groups"
  const [toastText, setToastText] = useState(null);

  // More menu, modals & select mode states
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [startChatModalOpen, setStartChatModalOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const moreMenuRef = useRef(null);

  const currentUserId = user?._id || user?.id || "";

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

        // Fetch accepted connections from getHack database to enforce connection authorization
        let acceptedConnIdsSet = new Set();
        try {
          const netRes = await userService.getNetworkRequests();
          if (netRes && Array.isArray(netRes.connections)) {
            netRes.connections.forEach((conn) => {
              const partnerId = conn.userId || conn.id || conn._id;
              if (partnerId) acceptedConnIdsSet.add(String(partnerId));
            });
          }
        } catch (netErr) {
          console.warn("Failed to fetch accepted connections for chat filtering:", netErr);
        }

        // ===================================================================
        // 1. Synchronize target user with Stream BEFORE channel creation.
        // ===================================================================
        if (
          targetUserIdParam &&
          String(targetUserIdParam) !== String(currentUserId)
        ) {
          const targetId = String(targetUserIdParam);

          // Verify target user is in accepted connections for 1-to-1 chats
          if (acceptedConnIdsSet.size > 0 && !acceptedConnIdsSet.has(targetId)) {
            console.warn("Target user is not connected. Aborting 1-to-1 channel creation.");
            showToast("You are no longer connected with this user.");
            if (isMounted) {
              setActiveChannel(null);
              setMobileShowChat(false);
              navigate("/messages", { replace: true });
            }
          } else {
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
              showToast(error.message || "You are no longer connected with this user.");
              if (isMounted) {
                setActiveChannel(null);
                setMobileShowChat(false);
                navigate("/messages", { replace: true });
              }
            }
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
        // 2b. Fetch persistent groups from MongoDB backend.
        // ===================================================================
        let dbGroups = [];
        try {
          const groupRes = await chatService.getGroups();
          if (groupRes?.success && Array.isArray(groupRes.groups)) {
            dbGroups = groupRes.groups;
          }
        } catch (dbGroupErr) {
          console.error("Failed to load MongoDB groups:", dbGroupErr);
        }

        const dbGroupChannels = [];
        for (const g of dbGroups) {
          if (!g.streamChannelId) continue;
          try {
            const memberIds = Array.isArray(g.members)
              ? g.members.map((m) => String(m._id || m.id || m))
              : [String(currentUserId)];

            const groupChan = chatClient.channel("messaging", g.streamChannelId, {
              name: g.name,
              image: g.avatar || undefined,
              avatar: g.avatar || undefined,
              isGroup: true,
              members: memberIds,
              created_by_id: String(g.creator?._id || g.creator?.id || g.creator || currentUserId),
            });
            await groupChan.watch();
            groupChan.data = {
              ...(groupChan.data || {}),
              name: g.name,
              image: g.avatar || undefined,
              avatar: g.avatar || undefined,
              isGroup: true,
              isRemovedFromGroup: false,
              memberCount: Array.isArray(g.members) ? g.members.length : memberIds.length,
              mongoGroupId: g._id?.toString() || g.id || g.streamChannelId,
            };
            dbGroupChannels.push(groupChan);
          } catch (watchErr) {
            console.error("Error watching persistent group channel:", g.streamChannelId, watchErr);
          }
        }

        // ===================================================================
        // 2c. Fetch groups from which the user was removed (read-only access).
        // ===================================================================
        let removedDbGroups = [];
        try {
          const removedRes = await chatService.getRemovedGroups();
          if (removedRes?.success && Array.isArray(removedRes.groups)) {
            removedDbGroups = removedRes.groups;
          }
        } catch (removedErr) {
          console.error("Failed to load removed groups:", removedErr);
        }

        const removedGroupChannels = [];
        for (const rg of removedDbGroups) {
          if (!rg.streamChannelId) continue;
          if (dbGroupChannels.some((c) => c.id === rg.streamChannelId)) continue;

          try {
            const groupChan = chatClient.channel("messaging", rg.streamChannelId, {
              name: rg.name,
              image: rg.avatar || undefined,
              avatar: rg.avatar || undefined,
              isGroup: true,
            });

            try {
              await groupChan.watch();
            } catch (_watchErr) {
              // Expected
            }

            groupChan.data = {
              ...(groupChan.data || {}),
              name: rg.name,
              image: rg.avatar || undefined,
              avatar: rg.avatar || undefined,
              isGroup: true,
              isRemovedFromGroup: true,
              memberCount: Array.isArray(rg.members) ? rg.members.length : 0,
              mongoGroupId: rg._id?.toString() || rg.id || rg.streamChannelId,
            };
            removedGroupChannels.push(groupChan);
          } catch (chanErr) {
            console.error("Error creating removed group channel ref:", rg.streamChannelId, chanErr);
          }
        }

        // ===================================================================
        // 3. Find existing channel OR create a new one.
        // ===================================================================
        if (
          targetUserIdParam &&
          String(targetUserIdParam) !== String(currentUserId)
        ) {
          const targetId = String(targetUserIdParam);
          if (acceptedConnIdsSet.size === 0 || acceptedConnIdsSet.has(targetId)) {
            const existing = queriedChannels.find((channel) => {
              const memberIds = Object.keys(channel.state?.members || {});
              return memberIds.includes(targetId) && !channel.data?.isGroup;
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
        }

        if (!isMounted) {
          return;
        }

        // ===================================================================
        // 5. Build final left-side chat list with Connection Enforcement.
        // ===================================================================
        const combinedList = [];
        const addedCids = new Set();

        // Selected conversation always appears first if valid.
        if (targetChannel) {
          combinedList.push(targetChannel);
          addedCids.add(targetChannel.cid);
        }

        // Add persistent MongoDB groups first (always preserved).
        dbGroupChannels.forEach((groupChan) => {
          if (!addedCids.has(groupChan.cid)) {
            combinedList.push(groupChan);
            addedCids.add(groupChan.cid);
          }
        });

        // Add queried channels (Group chats ALWAYS preserved, 1-to-1 direct chats filtered by accepted connections).
        queriedChannels.forEach((channel) => {
          const memberIds = Object.keys(channel.state?.members || {});
          const isGroup = Boolean(
            channel.data?.isGroup ||
            channel.data?.name ||
            channel.type === "team" ||
            channel.type === "group" ||
            channel.data?.teamId ||
            memberIds.length > 2
          );
          const hasMessages =
            channel.state?.messages?.length > 0 ||
            channel.data?.last_message_at;

          if ((hasMessages || isGroup) && !addedCids.has(channel.cid)) {
            if (isGroup) {
              // Group/team chats are ALWAYS kept
              combinedList.push(channel);
              addedCids.add(channel.cid);
            } else {
              // 1-to-1 direct chats: keep ONLY if recipient is in accepted connections
              const otherId = memberIds.find((id) => String(id) !== String(currentUserId));
              if (otherId && acceptedConnIdsSet.has(String(otherId))) {
                combinedList.push(channel);
                addedCids.add(channel.cid);
              }
            }
          }
        });

        // Add removed groups (read-only).
        removedGroupChannels.forEach((groupChan) => {
          if (!addedCids.has(groupChan.cid)) {
            combinedList.push(groupChan);
            addedCids.add(groupChan.cid);
          }
        });

        setChannels(sortChannelsByLatest(combinedList, chatStatesRef.current));

        // ===================================================================
        // 6. Automatically open selected conversation on the right if authorized.
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
    if (activeChannel && currentUserId) {
      const nowIso = new Date().toISOString();
      if (activeChannel.state) {
        activeChannel.state.unreadCount = 0;
        if (!activeChannel.state.read) activeChannel.state.read = {};
        activeChannel.state.read[String(currentUserId)] = {
          last_read: nowIso,
          user: { id: String(currentUserId) },
        };
      }

      if (typeof activeChannel.markRead === "function") {
        activeChannel
          .markRead()
          .then(() => {
            const readTime = new Date().toISOString();
            if (activeChannel.state) {
              activeChannel.state.unreadCount = 0;
              if (!activeChannel.state.read) activeChannel.state.read = {};
              activeChannel.state.read[String(currentUserId)] = {
                last_read: readTime,
                user: { id: String(currentUserId) },
              };
            }
            setChannels((prev) =>
              prev.map((c) =>
                c.cid === activeChannel.cid
                  ? Object.assign(Object.create(Object.getPrototypeOf(c)), c, {
                      state: {
                        ...c.state,
                        unreadCount: 0,
                        read: {
                          ...(c.state?.read || {}),
                          [String(currentUserId)]: {
                            last_read: readTime,
                            user: { id: String(currentUserId) },
                          },
                        },
                      },
                    })
                  : c
              )
            );
          })
          .catch(() => {});
      }
    }
  }, [activeChannel, currentUserId]);

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
        let updatedList = [...previousChannels];
        let targetChan = updatedList.find((ch) => ch.cid === cid);

        if (!targetChan && event.channel) {
          targetChan = event.channel;
          updatedList.push(targetChan);
        }

        if (targetChan) {
          if (!targetChan.state) targetChan.state = { messages: [], unreadCount: 0 };
          if (!targetChan.state.messages) targetChan.state.messages = [];

          if ((event.type === "message.read" || event.type === "notification.mark_read") && event.user?.id) {
            console.log("[CHAT DEBUG] message.read event:", cid, event.user.id);
            if (!targetChan.state.read) targetChan.state.read = {};
            targetChan.state.read[String(event.user.id)] = {
              last_read: event.created_at || new Date().toISOString(),
              user: event.user,
            };
            if (String(event.user.id) === String(currentUserId)) {
              targetChan.state.unreadCount = 0;
            }
          }

          if (event.message) {
            const msg = event.message;
            const idx = targetChan.state.messages.findIndex((m) => m.id === msg.id);

            if (event.type === "message.deleted" || msg.type === "deleted" || msg.deleted_at) {
              if (idx !== -1) {
                targetChan.state.messages[idx] = {
                  ...targetChan.state.messages[idx],
                  ...msg,
                  deleted_at: msg.deleted_at || new Date().toISOString(),
                  type: "deleted",
                };
              }
            } else if (idx !== -1) {
              targetChan.state.messages[idx] = {
                ...targetChan.state.messages[idx],
                ...msg,
              };
            } else if (event.type === "message.new" || event.type === "notification.message_new") {
              targetChan.state.messages.push(msg);
            }

            targetChan.state.last_message_at = msg.created_at || new Date().toISOString();
          }

          if (activeChannelRef.current?.cid === cid && targetChan.state) {
            targetChan.state.unreadCount = 0;
            if (!targetChan.state.read) targetChan.state.read = {};
            targetChan.state.read[String(currentUserId)] = {
              last_read: new Date().toISOString(),
              user: { id: String(currentUserId) },
            };
          }

          const clonedChan = Object.assign(Object.create(Object.getPrototypeOf(targetChan)), targetChan, {
            state: {
              ...targetChan.state,
              messages: [...targetChan.state.messages],
              read: { ...(targetChan.state.read || {}) },
            },
          });

          const listIdx = updatedList.findIndex((ch) => ch.cid === cid);
          if (listIdx !== -1) {
            updatedList[listIdx] = clonedChan;
          } else {
            updatedList.push(clonedChan);
          }
        }

        console.log("[CHAT DEBUG] chat list rebuilt:", cid, targetChan?.state?.unreadCount);
        return sortChannelsByLatest(updatedList, chatStatesRef.current);
      });
    };

    const handleChannelDeletedEvent = (event) => {
      const cid = event.cid || event.channel?.cid;
      if (!cid) return;

      console.log("[Stream Chat] Channel deleted event received:", cid);

      setChannels((prev) => prev.filter((ch) => ch.cid !== cid));

      if (activeChannelRef.current?.cid === cid) {
        setActiveChannel(null);
        setMobileShowChat(false);
      }
    };

    chatClient.on("message.new", handleChannelEvent);
    chatClient.on("notification.message_new", handleChannelEvent);
    chatClient.on("message.updated", handleChannelEvent);
    chatClient.on("message.deleted", handleChannelEvent);
    chatClient.on("message.read", handleChannelEvent);
    chatClient.on("notification.mark_read", handleChannelEvent);
    chatClient.on("channel.updated", handleChannelEvent);
    chatClient.on("channel.truncated", handleChannelEvent);
    chatClient.on("channel.deleted", handleChannelDeletedEvent);
    chatClient.on("notification.channel_deleted", handleChannelDeletedEvent);

    return () => {
      chatClient.off("message.new", handleChannelEvent);
      chatClient.off("notification.message_new", handleChannelEvent);
      chatClient.off("message.updated", handleChannelEvent);
      chatClient.off("message.deleted", handleChannelEvent);
      chatClient.off("message.read", handleChannelEvent);
      chatClient.off("notification.mark_read", handleChannelEvent);
      chatClient.off("channel.updated", handleChannelEvent);
      chatClient.off("channel.truncated", handleChannelEvent);
      chatClient.off("channel.deleted", handleChannelDeletedEvent);
      chatClient.off("notification.channel_deleted", handleChannelDeletedEvent);
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

  const handleChannelRead = useCallback((cid) => {
    setChannels((prev) =>
      prev.map((c) => {
        if (c.cid === cid) {
          const nowIso = new Date().toISOString();
          if (c.state) {
            c.state.unreadCount = 0;
            if (!c.state.read) c.state.read = {};
            c.state.read[String(currentUserId)] = {
              last_read: nowIso,
              user: { id: String(currentUserId) },
            };
          }
          return Object.assign(Object.create(Object.getPrototypeOf(c)), c, {
            state: {
              ...c.state,
              unreadCount: 0,
              read: {
                ...(c.state?.read || {}),
                [String(currentUserId)]: {
                  last_read: nowIso,
                  user: { id: String(currentUserId) },
                },
              },
            },
          });
        }
        return c;
      })
    );
  }, [currentUserId]);

  const handleSelectChannel = useCallback((chan) => {
    if (!chan) return;
    console.log("[CHAT DEBUG] Opening conversation:", chan.cid);
    console.log("[CHAT DEBUG] Before markRead:", chan.cid, chan.state?.unreadCount);

    const prevChanCid = activeChannelRef.current?.cid;
    if (prevChanCid && prevChanCid !== chan.cid) {
      console.log("[CHAT DEBUG] selectedUser changed:", prevChanCid, "->", chan.cid);
    }

    setActiveChannel(chan);
    setMobileShowChat(true);

    const nowIso = new Date().toISOString();
    if (chan.state) {
      chan.state.unreadCount = 0;
      if (!chan.state.read) chan.state.read = {};
      chan.state.read[String(currentUserId)] = {
        last_read: nowIso,
        user: { id: String(currentUserId) },
      };
    }

    if (typeof chan.markRead === "function") {
      chan
        .markRead()
        .then(() => {
          console.log("[CHAT DEBUG] markRead completed:", chan.cid, chan.state?.unreadCount);
          const readTime = new Date().toISOString();
          if (chan.state) {
            chan.state.unreadCount = 0;
            if (!chan.state.read) chan.state.read = {};
            chan.state.read[String(currentUserId)] = {
              last_read: readTime,
              user: { id: String(currentUserId) },
            };
          }
          setChannels((prev) =>
            prev.map((c) =>
              c.cid === chan.cid
                ? Object.assign(Object.create(Object.getPrototypeOf(c)), c, {
                    state: {
                      ...c.state,
                      unreadCount: 0,
                      read: {
                        ...(c.state?.read || {}),
                        [String(currentUserId)]: {
                          last_read: readTime,
                          user: { id: String(currentUserId) },
                        },
                      },
                    },
                  })
                : c
            )
          );
        })
        .catch(() => {});
    }
  }, [currentUserId]);

  // Close options menu when clicking outside
  useEffect(() => {
    if (!moreMenuOpen) return;

    const handleClickOutside = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setMoreMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [moreMenuOpen]);

  // Mark all unread channels as read
  const handleMarkAllAsRead = useCallback(() => {
    channels.forEach((ch) => {
      const unread = getChannelUnreadCount(ch, currentUserId, false, chatStates[ch.cid]?.clearedAt);
      if (unread > 0 && typeof ch.markRead === "function") {
        ch.markRead().catch(() => {});
        if (ch.state) {
          ch.state.unreadCount = 0;
          if (!ch.state.read) ch.state.read = {};
          ch.state.read[String(currentUserId)] = {
            last_read: new Date().toISOString(),
            user: { id: String(currentUserId) },
          };
        }
      }
    });

    setChannels((prev) =>
      prev.map((c) => {
        if (c.state) {
          const nowIso = new Date().toISOString();
          c.state.unreadCount = 0;
          if (!c.state.read) c.state.read = {};
          c.state.read[String(currentUserId)] = {
            last_read: nowIso,
            user: { id: String(currentUserId) },
          };
        }
        return Object.assign(Object.create(Object.getPrototypeOf(c)), c, {
          state: {
            ...c.state,
            unreadCount: 0,
          },
        });
      })
    );

    showToast("All chats marked as read");
  }, [channels, currentUserId, chatStates]);

  // Handle starting a 1-to-1 chat with selected connection
  const handleSelectConnection = useCallback(
    async (conn) => {
      if (!conn) return;
      const targetUserId = conn.userId || conn.id;
      if (!targetUserId) return;

      setStartChatModalOpen(false);

      try {
        // Check if direct channel already exists in local channels state
        const existing = channels.find((channel) => {
          const memberIds = Object.keys(channel.state?.members || {});
          return memberIds.includes(String(targetUserId)) && memberIds.length === 2 && !channel.data?.isGroup;
        });

        if (existing) {
          handleSelectChannel(existing);
          return;
        }

        // Synchronize target user with Stream Chat
        await chatService.ensureTargetUser(targetUserId);

        // Create or watch direct messaging channel in Stream Chat
        const newChannel = chatClient.channel("messaging", {
          members: [String(currentUserId), String(targetUserId)],
        });

        await newChannel.watch();

        newChannel.data = {
          ...(newChannel.data || {}),
          targetName: conn.name,
          targetAvatar: conn.avatar || "",
        };

        setChannels((prev) => {
          const exists = prev.some((c) => c.cid === newChannel.cid);
          if (exists) return prev;
          return sortChannelsByLatest([newChannel, ...prev], chatStatesRef.current);
        });

        setActiveChannel(newChannel);
        setMobileShowChat(true);
        showToast(`Chat started with ${conn.name}`);
      } catch (err) {
        console.error("Failed to start chat with connection:", err);
        showToast(err.message || "Unable to start conversation.");
      }
    },
    [chatClient, currentUserId, channels, handleSelectChannel]
  );

  // Handle creating a new group chat
  const handleCreateGroup = useCallback(
    async ({ name, memberUserIds, avatarUrl }) => {
      if (!name || !Array.isArray(memberUserIds) || memberUserIds.length === 0) return;

      try {
        // 1. Create persistent group in MongoDB & Stream Chat backend
        const res = await chatService.createGroup({ name, memberUserIds, avatarUrl });
        const createdGroup = res?.group;
        const streamChannelId = createdGroup?.streamChannelId;

        if (!streamChannelId) {
          throw new Error("Backend failed to return persistent group channel ID.");
        }

        const allMembers = Array.from(
          new Set([String(currentUserId), ...memberUserIds.map(String)])
        );

        // 2. Initialize and watch GetStream channel client-side
        const groupChannel = chatClient.channel("messaging", streamChannelId, {
          name: name,
          image: avatarUrl || undefined,
          avatar: avatarUrl || undefined,
          members: allMembers,
          isGroup: true,
          created_by_id: String(currentUserId),
        });

        await groupChannel.watch();

        groupChannel.data = {
          ...(groupChannel.data || {}),
          name: name,
          image: avatarUrl || undefined,
          avatar: avatarUrl || undefined,
          isGroup: true,
          mongoGroupId: createdGroup?._id?.toString() || createdGroup?.id || streamChannelId,
        };

        setChannels((prev) => {
          const exists = prev.some((c) => c.cid === groupChannel.cid);
          if (exists) return prev;
          return [groupChannel, ...prev];
        });

        setActiveChannel(groupChannel);
        setMobileShowChat(true);
        showToast(`Group "${name}" created`);
      } catch (err) {
        console.error("Failed to create group channel:", err);
        throw new Error(err.message || "Failed to create group channel.");
      }
    },
    [chatClient, currentUserId]
  );



  // -------------------------------------------------------------------------
  // Search & Filter conversations.
  // -------------------------------------------------------------------------
  const filteredChannels = useMemo(() => {
    let list = sortChannelsByLatest(channels, chatStates);

    // Filter by active tab (All, Unread, Favourites, Groups)
    if (activeFilter === "favourites") {
      list = list.filter((ch) => !!chatStates[ch.cid]?.isFavourite);
    } else if (activeFilter === "unread") {
      list = list.filter((ch) => getChannelUnreadCount(ch, currentUserId, activeChannel?.cid === ch.cid, chatStates[ch.cid]?.clearedAt) > 0);
    } else if (activeFilter === "groups") {
      list = list.filter((ch) => {
        const members = Object.values(ch.state?.members || {});
        return Boolean(
          ch.data?.isGroup ||
          ch.data?.name ||
          members.length > 2 ||
          ch.type === "team"
        );
      });
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
        channel.data?.name ||
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
    activeChannel,
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
  // Handle Group Deleted (for current user only).
  // -------------------------------------------------------------------------
  const handleGroupDeleted = useCallback(
    (groupId) => {
      setChannels((prevChannels) =>
        prevChannels.filter((c) => {
          const cGroupId = c.data?.mongoGroupId || c.id || c.cid?.replace(/^messaging:/, "");
          return cGroupId !== groupId && c.id !== groupId && c.cid !== `messaging:${groupId}`;
        })
      );
      setActiveChannel(null);
      setMobileShowChat(false);
      navigate("/messages", { replace: true });
    },
    [navigate]
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

            <div className="flex items-center gap-1">
              {/* More Actions Menu Dropdown (⋮) */}
              <div ref={moreMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMoreMenuOpen((prev) => !prev)}
                  aria-label="More options"
                  title="More options"
                  className="p-1.5 rounded-lg text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="1.75" />
                    <circle cx="12" cy="12" r="1.75" />
                    <circle cx="12" cy="19" r="1.75" />
                  </svg>
                </button>

                {moreMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl bg-white dark:bg-neutral-900 shadow-xl border border-neutral-100 dark:border-neutral-800 py-1.5 z-40 text-xs animate-in fade-in duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        setCreateGroupOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-neutral-700 dark:text-neutral-200 hover:bg-indigo-50/60 dark:hover:bg-neutral-800/60 transition-colors cursor-pointer"
                    >
                      <span className="text-sm">👥</span>
                      <span className="font-medium">New group</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        handleMarkAllAsRead();
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-neutral-700 dark:text-neutral-200 hover:bg-indigo-50/60 dark:hover:bg-neutral-800/60 transition-colors cursor-pointer"
                    >
                      <span className="text-sm">✓</span>
                      <span className="font-medium">Mark all as read</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Start New Chat Button (+) */}
              <button
                type="button"
                onClick={() => setStartChatModalOpen(true)}
                aria-label="Start a new chat"
                title="Start a new chat"
                className="p-1.5 rounded-lg text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
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

          {/* Filter Tabs: All | Unread | Favourites | Groups */}
          <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                activeFilter === "all"
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-2xs"
                  : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("unread")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                activeFilter === "unread"
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-2xs"
                  : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              Unread
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("favourites")}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                activeFilter === "favourites"
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-2xs"
                  : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              Favourites
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("groups")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                activeFilter === "groups"
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-2xs"
                  : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              Groups
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
              ) : activeFilter === "unread" ? (
                <>
                  <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                    No unread messages
                  </p>
                  <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500 max-w-[220px]">
                    Conversations with new messages will appear here.
                  </p>
                </>
              ) : activeFilter === "groups" ? (
                <>
                  <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                    No group chats
                  </p>
                  <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500 max-w-[220px]">
                    Create a group by clicking option menu (⋮) and selecting &quot;New group&quot;.
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
                    clearedAt={
                      chatStates[channel.cid]?.clearedAt
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
          key={activeChannel?.cid || "no-active-channel"}
          channel={activeChannel}
          currentUserId={currentUserId}
          onBack={handleBack}
          onRemoveChannel={handleRemoveChannel}
          isFavourite={!!chatStates[activeChannel?.cid]?.isFavourite}
          clearedAt={chatStates[activeChannel?.cid]?.clearedAt}
          onToggleFavourite={handleToggleFavourite}
          onCloseChat={handleCloseChat}
          onChannelRead={handleChannelRead}
          onClearChatStateUpdate={(cid, clearedAt) => {
            setChatStates((prev) => ({
              ...prev,
              [cid]: {
                ...(prev[cid] || {}),
                clearedAt,
              },
            }));
          }}
          onGroupDeleted={handleGroupDeleted}
        />
      </div>

      {/* Modals */}
      <StartNewChatModal
        isOpen={startChatModalOpen}
        onClose={() => setStartChatModalOpen(false)}
        onSelectConnection={handleSelectConnection}
      />

      <CreateGroupModal
        isOpen={createGroupOpen}
        onClose={() => setCreateGroupOpen(false)}
        onCreateGroup={handleCreateGroup}
      />
    </div>
  );
}

export default Messages;