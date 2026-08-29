// ---------------------------------------------------------------------------
// client/src/context/NotificationContext.jsx — Global Notification State & Real-time Provider
// Manages notification state, unread counts, Socket.IO listeners, deduplication, and read actions
// ---------------------------------------------------------------------------

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./useAuth";
import { notificationService } from "../services/notificationService";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  const socketRef = useRef(null);

  // ---------------------------------------------------------------------------
  // Fetch initial unread count from API
  // ---------------------------------------------------------------------------
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await notificationService.getUnreadNotificationCount();
      if (res && res.success) {
        setUnreadCount(res.count || 0);
      }
    } catch (err) {
      // Ignore background count fetch error
    }
  }, [isAuthenticated]);

  // ---------------------------------------------------------------------------
  // Fetch initial paginated notifications from API (with deduplication merge)
  // ---------------------------------------------------------------------------
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const res = await notificationService.getNotifications({ page: 1, limit: 20 });
      if (res && res.success) {
        const fetched = res.notifications || [];
        setNotifications((prev) => {
          const map = new Map();
          fetched.forEach((item) => map.set(String(item._id), item));
          prev.forEach((item) => {
            if (!map.has(String(item._id))) {
              map.set(String(item._id), item);
            }
          });
          const merged = Array.from(map.values());
          return merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        });
      }
    } catch (err) {
      setError(err.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // ---------------------------------------------------------------------------
  // Initialize initial unread count on authentication
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, fetchUnreadCount]);

  // ---------------------------------------------------------------------------
  // Socket.IO Real-Time Connection Lifecycle & Event Listener
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isAuthenticated) {
      if (socketRef.current) {
        console.log("[NOTIFICATION REALTIME] Disconnecting socket due to logout...");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    console.log("[NOTIFICATION REALTIME] Initializing Socket.IO connection...");

    const socket = io({
      path: "/socket.io/",
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log(`[NOTIFICATION REALTIME] Connected to Socket.IO server (id: ${socket.id})`);
    });

    socket.on("reconnect", (attempt) => {
      console.log(`[NOTIFICATION REALTIME] Reconnected after ${attempt} attempts. Syncing unread count...`);
      fetchUnreadCount();
    });

    socket.on("disconnect", (reason) => {
      console.log(`[NOTIFICATION REALTIME] Disconnected from Socket.IO server (reason: ${reason})`);
    });

    const handleNotificationCreated = (data) => {
      if (!data || !data.notification) return;

      const newNotif = data.notification;
      const notifIdStr = String(newNotif._id);
      console.log(`[NOTIFICATION RT] Received: ${notifIdStr} (type: ${newNotif.type})`);

      let isNewItem = false;

      setNotifications((prev) => {
        if (prev.some((item) => String(item._id) === notifIdStr)) {
          console.log(`[NOTIFICATION RT] Duplicate notification ignored: ${notifIdStr}`);
          return prev;
        }
        isNewItem = true;
        const updated = [newNotif, ...prev];
        return updated.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      });

      if (isNewItem && !newNotif.isRead) {
        setUnreadCount((prevCount) => prevCount + 1);
      }
    };

    socket.on("notification:created", handleNotificationCreated);

    return () => {
      console.log("[NOTIFICATION RT] Cleaning up Socket.IO listener...");
      socket.off("notification:created", handleNotificationCreated);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, fetchUnreadCount]);

  // ---------------------------------------------------------------------------
  // Mark single notification read
  // ---------------------------------------------------------------------------
  const markNotificationAsRead = useCallback(async (notificationId) => {
    let wasUnread = false;
    setNotifications((prev) =>
      prev.map((item) => {
        if (String(item._id) === String(notificationId)) {
          if (!item.isRead) wasUnread = true;
          return { ...item, isRead: true };
        }
        return item;
      })
    );

    if (wasUnread) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    try {
      await notificationService.markNotificationAsRead(notificationId);
    } catch (err) {
      console.error("Failed to mark notification read on backend:", err);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Mark all notifications read
  // ---------------------------------------------------------------------------
  const markAllNotificationsAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);

    try {
      await notificationService.markAllNotificationsAsRead();
    } catch (err) {
      console.error("Failed to mark all notifications read on backend:", err);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Delete single notification
  // ---------------------------------------------------------------------------
  const deleteNotification = useCallback(async (notificationId) => {
    if (!notificationId) return;

    let targetItem = null;
    setNotifications((prev) => {
      targetItem = prev.find((item) => String(item._id) === String(notificationId));
      return prev.filter((item) => String(item._id) !== String(notificationId));
    });

    if (targetItem && !targetItem.isRead) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    try {
      await notificationService.deleteNotification(notificationId);
    } catch (err) {
      console.error("Failed to delete notification on backend:", err);
      if (targetItem) {
        setNotifications((prev) => [targetItem, ...prev]);
        if (!targetItem.isRead) {
          setUnreadCount((prev) => prev + 1);
        }
      }
      throw err;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Clear all notifications
  // ---------------------------------------------------------------------------
  const clearAllNotifications = useCallback(async () => {
    let previousList = [];
    let previousUnreadCount = 0;

    setNotifications((prev) => {
      previousList = prev;
      return [];
    });
    setUnreadCount((prev) => {
      previousUnreadCount = prev;
      return 0;
    });

    try {
      await notificationService.clearAllNotifications();
    } catch (err) {
      console.error("Failed to clear all notifications on backend:", err);
      setNotifications(previousList);
      setUnreadCount(previousUnreadCount);
      throw err;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Centralized Notification Navigation Handler
  // ---------------------------------------------------------------------------
  const handleNotificationClick = useCallback(
    async (n, navigate, closeDropdown) => {
      if (!n) return;

      if (!n.isRead) {
        markNotificationAsRead(n._id);
      }

      if (typeof closeDropdown === "function") {
        closeDropdown();
      }

      if (typeof navigate !== "function") return;

      const type = n.type || "";
      const entityType = n.entityType || "";
      const metadata = n.metadata || {};
      const teamId = metadata.teamId || (entityType === "Team" ? n.entityId : null);

      if (type.startsWith("CONNECTION") || type === "NEW_CONNECTION" || entityType === "Connection") {
        if (type === "CONNECTION_REQUEST") {
          navigate("/network?tab=requests");
        } else if (type === "CONNECTION_ACCEPTED") {
          navigate("/network?tab=connections");
        } else {
          navigate("/network");
        }
      } else if (type.startsWith("TEAM") || entityType === "Team") {
        if (type === "TEAM_MEMBER_REMOVED") {
          navigate("/teammates");
        } else if (type === "TEAM_INVITATION_REJECTED") {
          navigate("/teammates");
        } else if (teamId && typeof teamId === "string") {
          navigate(`/team/${teamId}`);
        } else {
          navigate("/teammates");
        }
      } else if (type.includes("HACKATHON") || entityType === "Hackathon") {
        if (n.entityId && typeof n.entityId === "string") {
          navigate(`/hackathons/${n.entityId}`);
        } else {
          navigate("/hackathons");
        }
      } else {
        navigate("/network");
      }
    },
    [markNotificationAsRead]
  );

  // ---------------------------------------------------------------------------
  // Centralized Accept / Reject Action Handler for Notifications (Helper)
  // ---------------------------------------------------------------------------
  const respondToNotificationAction = useCallback(
    async (n, action) => {
      if (!n || !n._id || !action) return;

      const notifId = String(n._id);
      if (actionLoading[notifId]) return;

      setActionLoading((prev) => ({ ...prev, [notifId]: action }));

      try {
        const metadata = n.metadata || {};
        const invitationId = metadata.invitationId || (n.entityType === "TeamInvitation" ? n.entityId : null);
        const connectionId = metadata.connectionId || (n.entityType === "Connection" ? n.entityId : null);

        if (n.type === "TEAM_INVITATION" && invitationId) {
          const invitationService = (await import("../services/invitationService")).default;
          await invitationService.respondToInvitation(invitationId, action);
          setNotifications((prev) =>
            prev.map((item) =>
              String(item._id) === notifId
                ? {
                    ...item,
                    isRead: true,
                    actionHandled: true,
                    actionStatus: action,
                    message: action === "accept" ? "Team invitation accepted" : "Team invitation declined",
                  }
                : item
            )
          );
        } else if (n.type === "CONNECTION_REQUEST" && connectionId) {
          const userService = (await import("../services/userService")).userService;
          await userService.respondToConnectionRequest(connectionId, action);
          setNotifications((prev) =>
            prev.map((item) =>
              String(item._id) === notifId
                ? {
                    ...item,
                    isRead: true,
                    actionHandled: true,
                    actionStatus: action,
                    message: action === "accept" ? "Connection request accepted" : "Connection request declined",
                  }
                : item
            )
          );
        }

        if (!n.isRead) {
          markNotificationAsRead(n._id);
        }
      } catch (err) {
        console.error(`Failed to execute ${action} on notification:`, err);
        throw err;
      } finally {
        setActionLoading((prev) => {
          const next = { ...prev };
          delete next[notifId];
          return next;
        });
      }
    },
    [actionLoading, markNotificationAsRead]
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        error,
        actionLoading,
        fetchNotifications,
        fetchUnreadCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
        clearAllNotifications,
        handleNotificationClick,
        respondToNotificationAction,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
