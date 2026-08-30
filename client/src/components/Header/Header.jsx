import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/useAuth";
import { useNotifications } from "../../context/NotificationContext";

function formatRelativeTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function groupNotificationsByDate(notifications) {
  if (!Array.isArray(notifications) || notifications.length === 0) return [];

  const today = [];
  const yesterday = [];
  const older = [];

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

  notifications.forEach((n) => {
    const d = new Date(n.createdAt);
    if (d >= startOfToday) {
      today.push(n);
    } else if (d >= startOfYesterday) {
      yesterday.push(n);
    } else {
      older.push(n);
    }
  });

  const groups = [];
  if (today.length > 0) groups.push({ title: "TODAY", items: today });
  if (yesterday.length > 0) groups.push({ title: "YESTERDAY", items: yesterday });
  if (older.length > 0) groups.push({ title: "OLDER", items: older });

  return groups;
}

function getNotificationIconConfig(type) {
  if (!type) {
    return {
      color: "bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
    };
  }

  if (type === "CONNECTION_ACCEPTED") {
    return {
      color: "bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-400",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <polyline points="16 11 18 13 22 9" />
        </svg>
      ),
    };
  }

  if (type === "CONNECTION_REJECTED") {
    return {
      color: "bg-rose-500/10 text-rose-500 dark:bg-rose-500/20 dark:text-rose-400",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="17" y1="10" x2="22" y2="15" />
          <line x1="22" y1="10" x2="17" y2="15" />
        </svg>
      ),
    };
  }

  if (type.startsWith("CONNECTION") || type === "NEW_CONNECTION") {
    return {
      color: "bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" y1="8" x2="19" y2="14" />
          <line x1="22" y1="11" x2="16" y2="11" />
        </svg>
      ),
    };
  }

  if (type === "TEAM_INVITATION_ACCEPTED" || type === "TEAM_MEMBER_ADDED") {
    return {
      color: "bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-400",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <polyline points="16 11 18 13 22 9" />
        </svg>
      ),
    };
  }

  if (type === "TEAM_INVITATION_REJECTED" || type === "TEAM_MEMBER_REMOVED") {
    return {
      color: "bg-rose-500/10 text-rose-500 dark:bg-rose-500/20 dark:text-rose-400",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="17" y1="10" x2="22" y2="15" />
          <line x1="22" y1="10" x2="17" y2="15" />
        </svg>
      ),
    };
  }

  if (type.startsWith("TEAM")) {
    return {
      color: "bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-400",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    };
  }

  if (type.startsWith("MESSAGE") || type.startsWith("NEW_MESSAGE")) {
    return {
      color: "bg-sky-500/10 text-sky-500 dark:bg-sky-500/20 dark:text-sky-400",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    };
  }

  if (type.includes("HACKATHON")) {
    return {
      color: "bg-amber-500/10 text-amber-500 dark:bg-amber-500/20 dark:text-amber-400",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      ),
    };
  }

  return {
    color: "bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  };
}

function Header() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  // --------------------------------------------------
  // DARK / LIGHT MODE (from global context)
  // --------------------------------------------------

  const { theme, toggleTheme } = useTheme();
  const darkMode = theme === "dark";

  // --------------------------------------------------
  // SCROLL STATE & DETECTION FOR GLASSMORPHISM NAVBAR
  // --------------------------------------------------

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // --------------------------------------------------
  // NOTIFICATION & OTHER STATES (from global context)
  // --------------------------------------------------

  const [notificationOpen, setNotificationOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const {
    notifications,
    unreadCount,
    loading: loadingNotifs,
    error: notifError,
    fetchNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllNotifications,
    handleNotificationClick: contextHandleNotificationClick,
  } = useNotifications();

  const [confirmClear, setConfirmClear] = useState(false);
  const notificationRef = useRef(null);

  // Fetch notifications list when dropdown opens
  useEffect(() => {
    if (notificationOpen) {
      fetchNotifications();
    }
  }, [notificationOpen, fetchNotifications]);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    if (!notificationOpen) return;

    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [notificationOpen]);

  // 11. READ NOTIFICATION & NAVIGATE (Centralized entity-based navigation)
  const handleNotificationClick = (n) => {
    contextHandleNotificationClick(n, navigate, () => setNotificationOpen(false));
  };

  // 13. MARK ALL AS READ
  const handleMarkAllRead = () => {
    markAllNotificationsAsRead();
  };

  // --------------------------------------------------
  // FUNCTIONS
  // --------------------------------------------------


  const toggleNotifications = () => {
    setNotificationOpen((previous) => !previous);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen((previous) => !previous);
  };

  // --------------------------------------------------
  // NAV LINK STYLES (reusable)
  // --------------------------------------------------

  const navLinkClass = `
    rounded-lg
    px-3
    py-1.5

    text-sm
    font-medium

    text-neutral-600

    transition-colors
    duration-150

    hover:text-neutral-950

    dark:text-neutral-400
    dark:hover:text-white
  `;

  const iconBtnClass = `
    grid
    h-9
    w-9
    place-items-center
    rounded-lg

    text-neutral-500

    transition-colors
    duration-150

    hover:text-neutral-900

    dark:text-neutral-400
    dark:hover:text-white
  `;

  return (
    <>
      {/* ==================================================
          HEADER
          ================================================== */}

      <header
        className={`
          fixed
          top-0
          left-0
          z-50
          w-full

          transition-all
          duration-300
          ease-out

          ${
            scrolled
              ? `
                bg-white/80
                backdrop-blur-md
                border-b
                border-neutral-200/60
                shadow-xs

                dark:bg-neutral-950/80
                dark:border-neutral-800/60
                dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]
              `
              : `
                bg-transparent
                border-b
                border-transparent
                shadow-none
                backdrop-blur-none
              `
          }
        `}
      >
        <div
          className="
            mx-auto
            flex
            h-14
            max-w-7xl
            items-center
            px-5
            sm:px-6
            lg:px-8
          "
        >
          {/* ==================================================
              LOGO
              ================================================== */}

          <Link
            to="/"
            className="
              group
              flex
              shrink-0
              items-center
              gap-2
            "
          >
            {/* Logo mark */}

            <span
              className="
                grid
                h-8
                w-8
                place-items-center
                rounded-lg

                bg-neutral-950

                text-base
                font-bold
                leading-none
                text-white

                transition-transform
                duration-200

                group-hover:scale-105

                dark:bg-white
                dark:text-neutral-950
              "
            >
              g
            </span>

            {/* Logo text */}

            <span
              className="
                text-lg
                font-bold
                tracking-tight

                text-neutral-900

                dark:text-white
              "
            >
              get<span className="text-indigo-500">Hack</span>
            </span>
          </Link>

          {/* ==================================================
              DESKTOP NAVIGATION
              ================================================== */}

          <nav
            className="
              ml-8
              hidden
              items-center
              gap-0.5

              md:flex
            "
          >
            <NavLink
              to="/hackathons"
              className={({ isActive }) =>
                `${navLinkClass} ${
                  isActive
                    ? "font-semibold text-neutral-950 dark:text-white"
                    : ""
                }`
              }
            >
              Hackathons
            </NavLink>

            <NavLink
              to="/teammates"
              className={({ isActive }) =>
                `${navLinkClass} ${
                  isActive
                    ? "font-semibold text-neutral-950 dark:text-white"
                    : ""
                }`
              }
            >
              Find Teammates
            </NavLink>

            <NavLink
              to="/network"
              className={({ isActive }) =>
                `${navLinkClass} ${
                  isActive
                    ? "font-semibold text-neutral-950 dark:text-white"
                    : ""
                }`
              }
            >
              My Network
            </NavLink>

            <NavLink
              to="/messages"
              className={({ isActive }) =>
                `${navLinkClass} ${
                  isActive
                    ? "font-semibold text-neutral-950 dark:text-white"
                    : ""
                }`
              }
            >
              Messages
            </NavLink>
          </nav>

          {/* ==================================================
              RIGHT SIDE
              ================================================== */}

          <div
            className="
              ml-auto
              flex
              items-center
              gap-0.5
            "
          >
            {/* ==================================================
                NOTIFICATIONS
                ================================================== */}

            <div
              ref={notificationRef}
              className="relative"
            >
              <button
                type="button"
                onClick={toggleNotifications}
                aria-label="Notifications"
                className={iconBtnClass}
              >
                {/* Bell icon */}

                <svg
                  className="h-[18px] w-[18px]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>

                {/* 9. UNREAD COUNT BADGE (Connected to real backend count) */}
                {isAuthenticated && unreadCount > 0 && (
                  <span
                    className={`
                      absolute
                      right-0.5
                      top-0.5

                      grid
                      h-4
                      min-w-4
                      place-items-center

                      rounded-full

                      bg-indigo-500

                      px-1

                      text-[9px]
                      font-bold
                      text-white

                      ring-2
                      ${scrolled
                        ? "ring-white/80 dark:ring-neutral-950/75"
                        : "ring-slate-50 dark:ring-neutral-950"
                      }

                      transition-[box-shadow]
                      duration-300
                    `}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {/* ==================================================
                  NOTIFICATION DROPDOWN
                  ================================================== */}

              {notificationOpen && (
                <div
                  className="
                    absolute
                    right-0
                    top-[calc(100%+8px)]

                    w-80
                    max-h-[480px]
                    flex
                    flex-col

                    overflow-hidden
                    rounded-xl

                    bg-white

                    shadow-lg
                    shadow-neutral-950/8

                    dark:bg-neutral-900
                    dark:shadow-neutral-950/40
                    z-50
                  "
                >
                  {/* Header */}

                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      px-4
                      py-3
                      border-b
                      border-neutral-100
                      dark:border-neutral-800/80
                    "
                  >
                    <div>
                      <h3
                        className="
                          text-sm
                          font-semibold
                          text-neutral-900

                          dark:text-white
                        "
                      >
                        Notifications
                      </h3>

                      <p
                        className="
                          mt-0.5
                          text-xs
                          text-neutral-500

                          dark:text-neutral-400
                        "
                      >
                        {unreadCount} unread update{unreadCount === 1 ? "" : "s"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="
                            text-xs
                            font-medium
                            text-indigo-500
                            hover:text-indigo-600
                            transition-colors
                          "
                        >
                          Mark all read
                        </button>
                      )}

                      {notifications.length > 0 && (
                        !confirmClear ? (
                          <button
                            type="button"
                            onClick={() => setConfirmClear(true)}
                            className="
                              text-xs
                              font-medium
                              text-neutral-400
                              hover:text-rose-500
                              transition-colors
                            "
                          >
                            Clear all
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await clearAllNotifications();
                                } catch (err) {
                                  console.error("Clear all failed:", err);
                                } finally {
                                  setConfirmClear(false);
                                }
                              }}
                              className="text-xs font-semibold text-rose-500 hover:underline"
                            >
                              Clear
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmClear(false)}
                              className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                            >
                              Cancel
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                    {/* Notification Items Container */}

                    <div className="flex-1 overflow-y-auto max-h-[420px] divide-y divide-neutral-100 dark:divide-neutral-800/60">
                      {/* 7. SKELETON LOADING STATE */}
                      {loadingNotifs && (
                        <div className="p-4 space-y-3">
                          {[1, 2, 3].map((idx) => (
                            <div key={idx} className="flex items-start gap-3 animate-pulse">
                              <div className="h-8 w-8 rounded-lg bg-neutral-200 dark:bg-neutral-800 shrink-0" />
                              <div className="flex-1 space-y-1.5">
                                <div className="h-3 w-2/3 rounded bg-neutral-200 dark:bg-neutral-800" />
                                <div className="h-2.5 w-full rounded bg-neutral-100 dark:bg-neutral-800/60" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 8. ERROR STATE */}
                      {notifError && !loadingNotifs && (
                        <div className="p-6 text-center">
                          <p className="text-xs text-rose-500 mb-2">{notifError}</p>
                          <button
                            type="button"
                            onClick={fetchNotifications}
                            className="text-xs font-semibold text-indigo-500 hover:underline cursor-pointer"
                          >
                            Try again
                          </button>
                        </div>
                      )}

                      {/* 6. EMPTY STATE */}
                      {!loadingNotifs && !notifError && notifications.length === 0 && (
                        <div className="p-8 text-center">
                          <div className="mx-auto mb-2.5 grid h-10 w-10 place-items-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                          </div>
                          <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                            No notifications yet
                          </p>
                          <p className="mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-500">
                            We'll let you know when something needs your attention.
                          </p>
                        </div>
                      )}

                      {/* 5. DISPLAY REAL BACKEND DATA WITH DATE GROUPING */}
                      {!loadingNotifs && !notifError && notifications.length > 0 && (
                        groupNotificationsByDate(notifications).map((group) => (
                          <div key={group.title} className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                            <div className="sticky top-0 z-10 bg-neutral-50/95 dark:bg-neutral-900/95 px-4 py-1.5 backdrop-blur-xs border-b border-t border-neutral-100 dark:border-neutral-800/60">
                              <span className="text-[10px] font-bold tracking-wider text-neutral-400 dark:text-neutral-500 uppercase">
                                {group.title}
                              </span>
                            </div>

                            {group.items.map((n) => {
                              const iconConfig = getNotificationIconConfig(n.type);
                              const senderAvatar = n.sender?.avatar || n.sender?.profile?.avatar;
                              const senderName = n.sender?.name;
                              const initials = senderName
                                ? senderName
                                    .split(" ")
                                    .map((name) => name[0])
                                    .join("")
                                    .toUpperCase()
                                    .slice(0, 2)
                                : null;

                              return (
                                <button
                                  key={n._id}
                                  type="button"
                                  tabIndex={0}
                                  onClick={() => handleNotificationClick(n)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      handleNotificationClick(n);
                                    }
                                  }}
                                  className={`
                                    group
                                    relative
                                    flex
                                    w-full
                                    items-start
                                    gap-3
                                    px-4
                                    py-3.5
                                    text-left
                                    transition-colors
                                    duration-150
                                    cursor-pointer
                                    outline-hidden
                                    focus-visible:ring-2
                                    focus-visible:ring-indigo-500
                                    ${!n.isRead
                                      ? "bg-indigo-50/60 dark:bg-indigo-950/30 hover:bg-indigo-50/90 dark:hover:bg-indigo-950/50"
                                      : "hover:bg-neutral-50 dark:hover:bg-white/5"
                                    }
                                  `}
                                >
                                  {/* Icon / Avatar */}
                                  <div className="relative shrink-0 mt-0.5">
                                    {senderAvatar ? (
                                      <img
                                        src={senderAvatar}
                                        alt={senderName || "User"}
                                        className="h-8 w-8 rounded-full object-cover ring-1 ring-neutral-200 dark:ring-neutral-700"
                                      />
                                    ) : initials ? (
                                      <div className="grid h-8 w-8 place-items-center rounded-full bg-indigo-500/10 text-xs font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 ring-1 ring-neutral-200 dark:ring-neutral-800">
                                        {initials}
                                      </div>
                                    ) : (
                                      <div
                                        className={`
                                          grid
                                          h-8
                                          w-8
                                          place-items-center
                                          rounded-lg
                                          ${iconConfig.color}
                                        `}
                                      >
                                        {iconConfig.icon}
                                      </div>
                                    )}

                                    {!n.isRead && (
                                      <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-neutral-900" />
                                    )}
                                  </div>

                                  {/* Content */}
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <p
                                        className={`
                                          text-xs
                                          font-semibold
                                          truncate
                                          ${!n.isRead
                                            ? "text-indigo-950 dark:text-indigo-200"
                                            : "text-neutral-900 dark:text-white"
                                          }
                                        `}
                                      >
                                        {n.title}
                                      </p>

                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500">
                                          {formatRelativeTime(n.createdAt)}
                                        </span>

                                        <button
                                          type="button"
                                          aria-label="Delete notification"
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            try {
                                              await deleteNotification(n._id);
                                            } catch (err) {
                                              console.error("Failed to delete notification:", err);
                                            }
                                          }}
                                          className="opacity-0 group-hover:opacity-100 p-0.5 text-neutral-400 hover:text-rose-500 rounded transition-opacity cursor-pointer"
                                        >
                                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6" />
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                          </svg>
                                        </button>
                                      </div>
                                    </div>

                                    <p
                                      className="
                                        mt-0.5
                                        text-xs
                                        leading-relaxed
                                        text-neutral-600
                                        dark:text-neutral-300
                                        line-clamp-2
                                        break-words
                                      "
                                    >
                                      {n.message}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

            {/* ==================================================
                THEME BUTTON
                ================================================== */}

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                darkMode
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              className={iconBtnClass}
            >
              {darkMode ? (
                /* SUN */

                <svg
                  className="h-[18px] w-[18px]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="4" />

                  <path d="M12 2v2" />
                  <path d="M12 20v2" />
                  <path d="M4.93 4.93l1.41 1.41" />
                  <path d="M17.66 17.66l1.41 1.41" />
                  <path d="M2 12h2" />
                  <path d="M20 12h2" />
                  <path d="M6.34 17.66l-1.41 1.41" />
                  <path d="M19.07 4.93l-1.41 1.41" />
                </svg>
              ) : (
                /* MOON */

                <svg
                  className="h-[18px] w-[18px]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            {/* ==================================================
                LOGIN / PROFILE BUTTON
                ================================================== */}

            {isAuthenticated ? (
              <div className="hidden sm:flex items-center gap-2 ml-1.5">
                <Link
                  to={`/profile/${user?.id || "m1"}`}
                  className="
                    flex
                    h-8
                    items-center
                    gap-2
                    rounded-lg
                    border
                    border-neutral-200
                    bg-white
                    px-2.5
                    py-1
                    text-xs
                    font-semibold
                    text-neutral-900
                    transition-colors
                    hover:bg-neutral-50
                    dark:border-neutral-800
                    dark:bg-neutral-900
                    dark:text-white
                    dark:hover:bg-neutral-800
                  "
                >
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-indigo-600 text-[10px] font-bold text-white overflow-hidden">
                    {user?.profile?.avatar || user?.avatar ? (
                      <img
                        src={user.profile?.avatar || user.avatar}
                        alt={user?.name || "User"}
                        className="h-full w-full object-cover"
                      />
                    ) : user?.name ? (
                      user.name.charAt(0).toUpperCase()
                    ) : (
                      "U"
                    )}
                  </span>
                  <span className="max-w-[100px] truncate">{user?.name || "Profile"}</span>
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  title="Log out"
                  className="
                    inline-flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    rounded-lg
                    border
                    border-neutral-200
                    text-neutral-500
                    transition-colors
                    hover:bg-neutral-100
                    hover:text-neutral-900
                    dark:border-neutral-800
                    dark:text-neutral-400
                    dark:hover:bg-neutral-800
                    dark:hover:text-white
                  "
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="
                  hidden
                  h-8
                  items-center
                  justify-center
                  rounded-lg
                  bg-neutral-950
                  px-3.5
                  ml-1.5
                  text-sm
                  font-medium
                  text-white
                  transition-colors
                  duration-150
                  hover:bg-neutral-800
                  dark:bg-white
                  dark:text-neutral-950
                  dark:hover:bg-neutral-200
                  sm:flex
                "
              >
                Log in
              </Link>
            )}

            {/* ==================================================
                MOBILE MENU BUTTON
                ================================================== */}

            <button
              type="button"
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
              className={`
                ${iconBtnClass}
                md:hidden
              `}
            >
              {mobileMenuOpen ? (
                /* CLOSE */

                <svg
                  className="h-[18px] w-[18px]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              ) : (
                /* MENU */

                <svg
                  className="h-[18px] w-[18px]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* ==================================================
            MOBILE NAVIGATION
            ================================================== */}

        <div
          className={`
            overflow-hidden
            transition-[max-height,opacity]
            duration-300
            ease-out

            md:hidden

            ${mobileMenuOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"}
          `}
        >
          <nav
            className="
              mx-auto
              max-w-7xl

              px-5
              pb-4

              sm:px-6
              lg:px-8
            "
          >
            <div
              className="
                space-y-0.5
                border-t
                border-neutral-200/60
                pt-3

                dark:border-white/8
              "
            >
              <Link
                to="/hackathons"
                onClick={() => setMobileMenuOpen(false)}
                className="
                  block
                  rounded-lg
                  px-3
                  py-2.5

                  text-sm
                  font-medium

                  text-neutral-700

                  transition-colors

                  hover:bg-neutral-100

                  dark:text-neutral-300
                  dark:hover:bg-white/5
                "
              >
                Hackathons
              </Link>

              <Link
                to="/teammates"
                onClick={() => setMobileMenuOpen(false)}
                className="
                  block
                  rounded-lg
                  px-3
                  py-2.5

                  text-sm
                  font-medium

                  text-neutral-700

                  transition-colors

                  hover:bg-neutral-100

                  dark:text-neutral-300
                  dark:hover:bg-white/5
                "
              >
                Find Teammates
              </Link>

              <Link
                to="/network"
                onClick={() => setMobileMenuOpen(false)}
                className="
                  block
                  rounded-lg
                  px-3
                  py-2.5

                  text-sm
                  font-medium

                  text-neutral-700

                  transition-colors

                  hover:bg-neutral-100

                  dark:text-neutral-300
                  dark:hover:bg-white/5
                "
              >
                My Network
              </Link>

              <Link
                to="/messages"
                onClick={() => setMobileMenuOpen(false)}
                className="
                  block
                  rounded-lg
                  px-3
                  py-2.5

                  text-sm
                  font-medium

                  text-neutral-700

                  transition-colors

                  hover:bg-neutral-100

                  dark:text-neutral-300
                  dark:hover:bg-white/5
                "
              >
                Messages
              </Link>

              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="
                  mt-2
                  block
                  rounded-lg

                  bg-neutral-950

                  px-3
                  py-2.5

                  text-center
                  text-sm
                  font-medium
                  text-white

                  transition-colors

                  hover:bg-neutral-800

                  dark:bg-white
                  dark:text-neutral-950
                  dark:hover:bg-neutral-200
                "
              >
                Log in
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Spacer so content is not hidden behind fixed header */}
      <div className="h-14" />
    </>
  );
}

export default Header;