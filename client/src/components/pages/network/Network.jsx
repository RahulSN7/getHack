// ---------------------------------------------------------------------------
// Network — My Network Page Component (/network)
// Professional community hub for managing connections, incoming requests, and sent requests
// ---------------------------------------------------------------------------

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { TEAMMATES } from "../../../data/teammates";
import {
  INITIAL_CONNECTIONS,
  INITIAL_REQUESTS,
  INITIAL_SENT,
} from "../../../data/networkData";
import { ACCENT_TEXT, ACCENT_BG_SOFT } from "../../../constants/themeTokens";

import NetworkFilters from "./NetworkFilters";

// ---------------------------------------------------------------------------
// Availability badge (strictly 2 states)
// ---------------------------------------------------------------------------

function AvailabilityBadge({ availability }) {
  const isAvailable = availability === "Available";

  if (isAvailable) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Available
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
      <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500" />
      Not Available
    </span>
  );
}

// ---------------------------------------------------------------------------
// Days ago parser helper
// ---------------------------------------------------------------------------

function getDaysAgo(dateStr) {
  if (!dateStr) return 999;
  const s = dateStr.toLowerCase();
  if (s.includes("just now") || s.includes("today") || s.includes("yesterday")) return 1;
  const match = s.match(/(\d+)\s*(day|week|month|year)/);
  if (!match) return 1;
  const val = parseInt(match[1], 10);
  const unit = match[2];
  if (unit.startsWith("day")) return val;
  if (unit.startsWith("week")) return val * 7;
  if (unit.startsWith("month")) return val * 30;
  if (unit.startsWith("year")) return val * 365;
  return val;
}

// ---------------------------------------------------------------------------
// Search matching helper for user objects
// Matches name, username, id, role, skills, location
// ---------------------------------------------------------------------------

function matchesUserSearch(user, query) {
  if (!query.trim() || !user) return true;
  const q = query.toLowerCase().replace(/^@/, "");

  return (
    (user.name && user.name.toLowerCase().includes(q)) ||
    (user.username && user.username.toLowerCase().includes(q)) ||
    (user.id && user.id.toLowerCase().includes(q)) ||
    (user.role && user.role.toLowerCase().includes(q)) ||
    (user.skills && user.skills.some((s) => s.toLowerCase().includes(q))) ||
    (user.location && user.location.toLowerCase().includes(q))
  );
}

// ---------------------------------------------------------------------------
// Main Network Component
// ---------------------------------------------------------------------------

import { useEffect } from "react";
import { userService } from "../../../services/userService";

function Network() {
  const [activeTab, setActiveTab] = useState("connections"); // 'connections' | 'requests' | 'sent'
  const [searchQuery, setSearchQuery] = useState("");
  const [connections, setConnections] = useState(INITIAL_CONNECTIONS);
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [sent, setSent] = useState(INITIAL_SENT);
  const [toastMessage, setToastMessage] = useState(null);

  // Load real network requests from backend API on mount
  useEffect(() => {
    let isMounted = true;
    async function loadNetworkData() {
      try {
        const data = await userService.getNetworkRequests();
        if (isMounted && data) {
          if (Array.isArray(data.connections) && data.connections.length > 0) {
            setConnections(data.connections);
          }
          if (Array.isArray(data.incoming)) {
            setRequests(
              data.incoming.map((req) => ({
                id: req.id || req.requestId,
                fromUserId: req.senderId,
                name: req.name,
                role: req.role,
                avatar: req.avatar,
                skills: req.skills,
                location: req.location,
                availability: req.availability,
                note: req.note,
                createdAt: req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "Just now",
              }))
            );
          }
          if (Array.isArray(data.outgoing)) {
            setSent(
              data.outgoing.map((s) => ({
                id: s.id || s.requestId,
                toUserId: s.receiverId,
                name: s.name,
                role: s.role,
                avatar: s.avatar,
                note: s.note,
                createdAt: s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "Just now",
              }))
            );
          }
        }
      } catch (err) {
        // Fallback to local data if unauthenticated or offline
      }
    }
    loadNetworkData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter states
  const [connAvailability, setConnAvailability] = useState("all");
  const [connRole, setConnRole] = useState("all");
  const [connSkills, setConnSkills] = useState([]);
  const [requestAge, setRequestAge] = useState("all");
  const [sentAge, setSentAge] = useState("all");

  // Sort states
  const [connSort, setConnSort] = useState("recently-connected");
  const [requestSort, setRequestSort] = useState("newest");
  const [sentSort, setSentSort] = useState("newest");

  // ── Action Handlers ──

  const handleAcceptRequest = async (requestItem) => {
    try {
      await userService.respondToConnectionRequest(requestItem.id, "accept");
    } catch {
      // Proceed with UI update
    }
    // Remove from requests
    setRequests((prev) => prev.filter((r) => r.id !== requestItem.id));
    // Add to connections
    setConnections((prev) => [
      {
        id: `conn-${Date.now()}`,
        userId: requestItem.fromUserId || requestItem.id,
        name: requestItem.name,
        role: requestItem.role,
        avatar: requestItem.avatar,
        skills: requestItem.skills || [],
        connectedAt: "Just now",
      },
      ...prev,
    ]);
    setToastMessage(`Connection request from ${requestItem.name || "builder"} accepted!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeclineRequest = async (requestItem) => {
    const reqId = typeof requestItem === "string" ? requestItem : requestItem.id;
    try {
      await userService.respondToConnectionRequest(reqId, "decline");
    } catch {
      // Proceed with UI update
    }
    setRequests((prev) => prev.filter((r) => r.id !== reqId));
    setToastMessage("Connection request declined.");
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCancelSentRequest = (sentId) => {
    setSent((prev) => prev.filter((s) => s.id !== sentId));
  };

  const handleMessageClick = (userName, username) => {
    const handleText = username ? `@${username}` : userName;
    setToastMessage(`Direct messaging with ${handleText} coming soon!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleApplyFilters = ({
    connAvailability: nextAvail,
    connRole: nextRole,
    connSkills: nextSkills,
    requestAge: nextReqAge,
    sentAge: nextSentAge,
  }) => {
    setConnAvailability(nextAvail);
    setConnRole(nextRole);
    setConnSkills(nextSkills);
    setRequestAge(nextReqAge);
    setSentAge(nextSentAge);
  };

  const handleClearFilters = () => {
    if (activeTab === "connections") {
      setConnAvailability("all");
      setConnRole("all");
      setConnSkills([]);
    } else if (activeTab === "requests") {
      setRequestAge("all");
    } else if (activeTab === "sent") {
      setSentAge("all");
    }
  };

  // ── Derived Dynamic Filter Options ──

  const availableRoles = useMemo(() => {
    const rolesSet = new Set();
    connections.forEach((conn) => {
      const u = TEAMMATES.find((m) => m.id === conn.userId);
      if (u?.role) rolesSet.add(u.role);
    });
    return Array.from(rolesSet);
  }, [connections]);

  const availableSkills = useMemo(() => {
    const skillsSet = new Set();
    connections.forEach((conn) => {
      const u = TEAMMATES.find((m) => m.id === conn.userId);
      if (u?.skills) {
        u.skills.forEach((s) => skillsSet.add(s));
      }
    });
    return Array.from(skillsSet);
  }, [connections]);

  // ── Derived Pipeline: Search → Filter → Sort ──

  const displayedConnections = useMemo(() => {
    let list = connections.filter((conn) => {
      const u = TEAMMATES.find((m) => m.id === conn.userId);
      return matchesUserSearch(u, searchQuery);
    });

    if (connAvailability !== "all") {
      list = list.filter((conn) => {
        const u = TEAMMATES.find((m) => m.id === conn.userId);
        return u?.availability === connAvailability;
      });
    }

    if (connRole !== "all") {
      list = list.filter((conn) => {
        const u = TEAMMATES.find((m) => m.id === conn.userId);
        return u?.role === connRole;
      });
    }

    if (connSkills.length > 0) {
      list = list.filter((conn) => {
        const u = TEAMMATES.find((m) => m.id === conn.userId);
        return u?.skills && connSkills.some((s) => u.skills.includes(s));
      });
    }

    return [...list].sort((a, b) => {
      const uA = TEAMMATES.find((m) => m.id === a.userId);
      const uB = TEAMMATES.find((m) => m.id === b.userId);

      if (connSort === "name-asc") {
        return (uA?.name || "").localeCompare(uB?.name || "");
      }
      if (connSort === "name-desc") {
        return (uB?.name || "").localeCompare(uA?.name || "");
      }
      return getDaysAgo(a.connectedAt) - getDaysAgo(b.connectedAt);
    });
  }, [connections, searchQuery, connAvailability, connRole, connSkills, connSort]);

  const displayedRequests = useMemo(() => {
    let list = requests.filter((req) => {
      const u = TEAMMATES.find((m) => m.id === req.fromUserId);
      return matchesUserSearch(u, searchQuery);
    });

    if (requestAge === "recent") {
      list = list.filter((req) => getDaysAgo(req.createdAt) <= 7);
    } else if (requestAge === "older") {
      list = list.filter((req) => getDaysAgo(req.createdAt) > 7);
    }

    return [...list].sort((a, b) => {
      const uA = TEAMMATES.find((m) => m.id === a.fromUserId);
      const uB = TEAMMATES.find((m) => m.id === b.fromUserId);

      if (requestSort === "oldest") {
        return getDaysAgo(b.createdAt) - getDaysAgo(a.createdAt);
      }
      if (requestSort === "name-asc") {
        return (uA?.name || "").localeCompare(uB?.name || "");
      }
      return getDaysAgo(a.createdAt) - getDaysAgo(b.createdAt);
    });
  }, [requests, searchQuery, requestAge, requestSort]);

  const displayedSent = useMemo(() => {
    let list = sent.filter((s) => {
      const u = TEAMMATES.find((m) => m.id === s.toUserId);
      return matchesUserSearch(u, searchQuery);
    });

    if (sentAge === "recent") {
      list = list.filter((s) => getDaysAgo(s.createdAt) <= 7);
    } else if (sentAge === "older") {
      list = list.filter((s) => getDaysAgo(s.createdAt) > 7);
    }

    return [...list].sort((a, b) => {
      const uA = TEAMMATES.find((m) => m.id === a.toUserId);
      const uB = TEAMMATES.find((m) => m.id === b.toUserId);

      if (sentSort === "oldest") {
        return getDaysAgo(b.createdAt) - getDaysAgo(a.createdAt);
      }
      if (sentSort === "name-asc") {
        return (uA?.name || "").localeCompare(uB?.name || "");
      }
      return getDaysAgo(a.createdAt) - getDaysAgo(b.createdAt);
    });
  }, [sent, searchQuery, sentAge, sentSort]);

  return (
    <div className="min-h-screen bg-slate-50 text-neutral-900 transition-colors dark:bg-neutral-950 dark:text-neutral-100">
      {/* ── Page Header ── */}
      {/* ── Page Header Banner ── */}
      <div className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mx-auto max-w-7xl px-5 pb-6 pt-5 sm:px-6 lg:px-8">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-indigo-500">
            COLLABORATE
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-white">
            My Network
          </h1>
          <p className="mt-2 text-base text-neutral-500 dark:text-neutral-400">
            Stay connected with builders, message teammates, and collaborate on what comes next.
          </p>

          {/* ── Search Bar ── */}
          <div className="mt-6 max-w-2xl">
            <div className="relative">
              <svg
                className="
                  pointer-events-none
                  absolute
                  left-3.5
                  top-1/2
                  h-4
                  w-4
                  -translate-y-1/2
                  text-neutral-400
                  dark:text-neutral-500
                "
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your network by name, role, or skill…"
                className="
                  h-10
                  w-full
                  rounded-lg
                  border
                  border-neutral-200
                  bg-white
                  pl-10
                  pr-4
                  text-sm
                  text-neutral-900
                  placeholder-neutral-400
                  outline-none
                  transition-colors
                  duration-150
                  focus:border-indigo-500
                  focus:ring-1
                  focus:ring-indigo-500/20
                  dark:border-neutral-800
                  dark:bg-neutral-900
                  dark:text-white
                  dark:placeholder-neutral-500
                  dark:focus:border-indigo-400
                  dark:focus:ring-indigo-400/20
                "
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="
                    absolute
                    right-3
                    top-1/2
                    -translate-y-1/2
                    rounded
                    p-0.5
                    text-neutral-400
                    transition-colors
                    hover:text-neutral-600
                    dark:text-neutral-500
                    dark:hover:text-neutral-300
                  "
                >
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <line x1="6" y1="6" x2="18" y2="18" />
                    <line x1="18" y1="6" x2="6" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* ── Toolbar: View Tabs + Filter Popover ── */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-neutral-200 bg-neutral-50 p-0.5 dark:border-neutral-800 dark:bg-neutral-900">
                <button
                  type="button"
                  onClick={() => setActiveTab("connections")}
                  className={`
                    inline-flex
                    items-center
                    gap-1.5
                    rounded-md
                    px-3
                    py-1.5
                    text-xs
                    font-semibold
                    transition-all
                    duration-150
                    ${
                      activeTab === "connections"
                        ? "bg-white text-neutral-900 shadow-xs dark:bg-neutral-800 dark:text-white"
                        : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                    }
                  `}
                >
                  <span>Connections</span>
                  <span
                    className={`
                      inline-flex
                      h-4
                      min-w-4
                      items-center
                      justify-center
                      rounded-full
                      px-1
                      text-[10px]
                      font-bold
                      ${
                        activeTab === "connections"
                          ? "bg-indigo-500 text-white"
                          : "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                      }
                    `}
                  >
                    {connections.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("requests")}
                  className={`
                    inline-flex
                    items-center
                    gap-1.5
                    rounded-md
                    px-3
                    py-1.5
                    text-xs
                    font-semibold
                    transition-all
                    duration-150
                    ${
                      activeTab === "requests"
                        ? "bg-white text-neutral-900 shadow-xs dark:bg-neutral-800 dark:text-white"
                        : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                    }
                  `}
                >
                  <span>Requests</span>
                  <span
                    className={`
                      inline-flex
                      h-4
                      min-w-4
                      items-center
                      justify-center
                      rounded-full
                      px-1
                      text-[10px]
                      font-bold
                      ${
                        activeTab === "requests"
                          ? "bg-indigo-500 text-white"
                          : "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                      }
                    `}
                  >
                    {requests.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("sent")}
                  className={`
                    inline-flex
                    items-center
                    gap-1.5
                    rounded-md
                    px-3
                    py-1.5
                    text-xs
                    font-semibold
                    transition-all
                    duration-150
                    ${
                      activeTab === "sent"
                        ? "bg-white text-neutral-900 shadow-xs dark:bg-neutral-800 dark:text-white"
                        : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                    }
                  `}
                >
                  <span>Sent</span>
                  <span
                    className={`
                      inline-flex
                      h-4
                      min-w-4
                      items-center
                      justify-center
                      rounded-full
                      px-1
                      text-[10px]
                      font-bold
                      ${
                        activeTab === "sent"
                          ? "bg-indigo-500 text-white"
                          : "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                      }
                    `}
                  >
                    {sent.length}
                  </span>
                </button>
              </div>

              {/* Filter Popover */}
              <NetworkFilters
                activeTab={activeTab}
                connAvailability={connAvailability}
                connRole={connRole}
                connSkills={connSkills}
                availableRoles={availableRoles}
                availableSkills={availableSkills}
                requestAge={requestAge}
                sentAge={sentAge}
                onApply={handleApplyFilters}
                onClear={handleClearFilters}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Page Content Container ── */}
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
        {/* Result Toolbar: Result count (Left) + Sort select (Right) */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <p className="text-sm font-normal text-neutral-500 dark:text-neutral-400">
            <span className="font-semibold text-neutral-900 dark:text-white">
              {activeTab === "connections"
                ? displayedConnections.length
                : activeTab === "requests"
                ? displayedRequests.length
                : displayedSent.length}
            </span>{" "}
            {activeTab === "connections"
              ? displayedConnections.length === 1
                ? "connection"
                : "connections"
              : activeTab === "requests"
              ? displayedRequests.length === 1
                ? "request"
                : "requests"
              : displayedSent.length === 1
              ? "sent request"
              : "sent requests"}
          </p>

          <div className="flex items-center gap-2">
            <label htmlFor="network-sort" className="shrink-0 text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Sort by
            </label>
            <div className="relative">
              <select
                id="network-sort"
                value={
                  activeTab === "connections"
                    ? connSort
                    : activeTab === "requests"
                    ? requestSort
                    : sentSort
                }
                onChange={(e) => {
                  if (activeTab === "connections") setConnSort(e.target.value);
                  else if (activeTab === "requests") setRequestSort(e.target.value);
                  else setSentSort(e.target.value);
                }}
                className="
                  h-8
                  appearance-none
                  rounded-lg
                  border
                  border-neutral-200
                  bg-white
                  pl-3
                  pr-8
                  text-xs
                  font-medium
                  text-neutral-700
                  outline-none
                  transition-[border-color,box-shadow]
                  duration-150
                  focus:border-indigo-400
                  focus:ring-2
                  focus:ring-indigo-500/15
                  dark:border-neutral-800
                  dark:bg-neutral-900
                  dark:text-neutral-200
                  dark:focus:border-indigo-500
                "
              >
                {activeTab === "connections" && (
                  <>
                    <option value="recently-connected">Recently Connected</option>
                    <option value="name-asc">Name A–Z</option>
                    <option value="name-desc">Name Z–A</option>
                  </>
                )}
                {activeTab === "requests" && (
                  <>
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="name-asc">Name A–Z</option>
                  </>
                )}
                {activeTab === "sent" && (
                  <>
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="name-asc">Name A–Z</option>
                  </>
                )}
              </select>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-neutral-400 dark:text-neutral-500"
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </div>
          </div>
        </div>

        {/* Toast Feedback */}
        {toastMessage && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs font-semibold text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/60 dark:text-indigo-300 animate-in fade-in">
            {toastMessage}
          </div>
        )}

        {/* ── TAB 1: CONNECTIONS ── */}
        {activeTab === "connections" && (
          <div>
            {displayedConnections.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {displayedConnections.map((conn) => {
                  const user = TEAMMATES.find((m) => m.id === conn.userId);
                  if (!user) return null;

                  const { name, username, role, skills = [], location, availability, accent = "indigo" } = user;
                  const accentText = ACCENT_TEXT[accent] || ACCENT_TEXT.indigo;
                  const accentBgSoft = ACCENT_BG_SOFT[accent] || ACCENT_BG_SOFT.indigo;
                  const initial = name ? name.charAt(0).toUpperCase() : "?";
                  const visibleSkills = skills.slice(0, 3);

                  return (
                    <div
                      key={conn.id}
                      className="
                        flex
                        flex-col
                        justify-between
                        rounded-xl
                        border
                        border-neutral-200
                        bg-white
                        p-5
                        shadow-xs
                        transition-all
                        hover:border-neutral-300
                        dark:border-neutral-800
                        dark:bg-neutral-900
                        dark:hover:border-neutral-700
                      "
                    >
                      <div className="space-y-3">
                        {/* Card Header: Avatar + Identity + Status */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            <div
                              className={`
                                grid
                                h-10
                                w-10
                                shrink-0
                                place-items-center
                                rounded-xl
                                text-sm
                                font-bold
                                ${accentBgSoft}
                                ${accentText}
                              `}
                            >
                              {initial}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="truncate text-sm font-semibold text-neutral-900 dark:text-white">
                                {name}
                              </h3>
                              {username && (
                                <p className="text-[11px] font-medium font-mono text-neutral-400 dark:text-neutral-500">
                                  @{username}
                                </p>
                              )}
                              <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                                {role}
                              </p>
                            </div>
                          </div>
                          <AvailabilityBadge availability={availability} />
                        </div>

                        {/* Skills Chips */}
                        {visibleSkills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {visibleSkills.map((s) => (
                              <span
                                key={s}
                                className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Location & Connection Metadata */}
                        <div className="flex items-center justify-between text-[11px] text-neutral-400 dark:text-neutral-500 pt-1">
                          <span>{location || "Remote"}</span>
                          <span>Connected {conn.connectedAt}</span>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800/80">
                        <button
                          type="button"
                          onClick={() => handleMessageClick(name, username)}
                          className="
                            inline-flex
                            items-center
                            gap-1.5
                            rounded-lg
                            border
                            border-neutral-200
                            px-3
                            py-1.5
                            text-xs
                            font-semibold
                            text-neutral-700
                            transition-colors
                            hover:bg-neutral-50
                            dark:border-neutral-800
                            dark:text-neutral-300
                            dark:hover:bg-neutral-800
                          "
                        >
                          <svg className="h-3.5 w-3.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                          <span>Message</span>
                        </button>

                        <Link
                          to={`/profile/${user.id}`}
                          className="
                            inline-flex
                            items-center
                            gap-1
                            text-xs
                            font-semibold
                            text-indigo-600
                            transition-colors
                            hover:text-indigo-700
                            dark:text-indigo-400
                            dark:hover:text-indigo-300
                          "
                        >
                          <span>View Profile</span>
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M5 12h14" />
                            <path d="m12 5 7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
                {connections.length === 0 ? (
                  <>
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                      No connections yet
                    </h3>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      Start discovering builders and connect with people who share your interests.
                    </p>
                    <div className="mt-4">
                      <Link
                        to="/teammates"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-950 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                      >
                        <span>Find Teammates</span>
                      </Link>
                    </div>
                  </>
                ) : searchQuery ? (
                  <>
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                      No people found
                    </h3>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      Try searching by name, skill, role, username, or getHack ID.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                      No matches found
                    </h3>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      Try changing or clearing your filters.
                    </p>
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-950 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: INCOMING REQUESTS ── */}
        {activeTab === "requests" && (
          <div>
            {displayedRequests.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {displayedRequests.map((req) => {
                  const user = TEAMMATES.find((m) => m.id === req.fromUserId) || req;

                  const name = user.name || "Participant";
                  const username = user.username || "";
                  const role = user.role || "Developer";
                  const skills = Array.isArray(user.skills) ? user.skills : [];
                  const location = user.location || "";
                  const availability = user.availability || "Available";
                  const accent = user.accent || "indigo";
                  const accentText = ACCENT_TEXT[accent] || ACCENT_TEXT.indigo;
                  const accentBgSoft = ACCENT_BG_SOFT[accent] || ACCENT_BG_SOFT.indigo;
                  const initial = name ? name.charAt(0).toUpperCase() : "?";
                  const visibleSkills = skills.slice(0, 3);
                  const note = req.note || req.message;

                  return (
                    <div
                      key={req.id}
                      className="
                        flex
                        flex-col
                        justify-between
                        rounded-xl
                        border
                        border-neutral-200
                        bg-white
                        p-5
                        shadow-xs
                        transition-all
                        hover:border-neutral-300
                        dark:border-neutral-800
                        dark:bg-neutral-900
                        dark:hover:border-neutral-700
                      "
                    >
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            <div
                              className={`
                                grid
                                h-10
                                w-10
                                shrink-0
                                place-items-center
                                rounded-xl
                                text-sm
                                font-bold
                                ${accentBgSoft}
                                ${accentText}
                              `}
                            >
                              {initial}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="truncate text-sm font-semibold text-neutral-900 dark:text-white">
                                {name}
                              </h3>
                              {username && (
                                <p className="text-[11px] font-medium font-mono text-neutral-400 dark:text-neutral-500">
                                  @{username}
                                </p>
                              )}
                              <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                                {role}
                              </p>
                            </div>
                          </div>
                          <AvailabilityBadge availability={availability} />
                        </div>

                        {/* Skills */}
                        {visibleSkills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {visibleSkills.map((s) => (
                              <span
                                key={s}
                                className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Optional Message / Note */}
                        {note && (
                          <div className="rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-300">
                            <span className="font-semibold text-neutral-900 dark:text-white">Note: </span>
                            &quot;{note}&quot;
                          </div>
                        )}

                        {/* Location & Received Date */}
                        <div className="flex items-center justify-between text-[11px] text-neutral-400 dark:text-neutral-500 pt-1">
                          <span>{location || "Remote"}</span>
                          <span>Received {req.createdAt}</span>
                        </div>
                      </div>

                      {/* Request Actions: Accept / Decline / View Profile */}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800/80">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAcceptRequest(req)}
                            className="
                              inline-flex
                              items-center
                              gap-1.5
                              rounded-lg
                              bg-indigo-600
                              px-3.5
                              py-1.5
                              text-xs
                              font-semibold
                              text-white
                              transition-colors
                              hover:bg-indigo-500
                              dark:bg-indigo-500
                              dark:hover:bg-indigo-400
                            "
                          >
                            <span>Accept</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeclineRequest(req.id)}
                            className="
                              inline-flex
                              items-center
                              gap-1.5
                              rounded-lg
                              border
                              border-neutral-200
                              px-3
                              py-1.5
                              text-xs
                              font-semibold
                              text-neutral-600
                              transition-colors
                              hover:bg-neutral-50
                              dark:border-neutral-800
                              dark:text-neutral-400
                              dark:hover:bg-neutral-800
                            "
                          >
                            <span>Decline</span>
                          </button>
                        </div>

                        <Link
                          to={`/profile/${user.id}`}
                          className="
                            inline-flex
                            items-center
                            gap-1
                            text-xs
                            font-semibold
                            text-indigo-600
                            transition-colors
                            hover:text-indigo-700
                            dark:text-indigo-400
                            dark:hover:text-indigo-300
                          "
                        >
                          <span>View Profile</span>
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M5 12h14" />
                            <path d="m12 5 7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
                {requests.length === 0 ? (
                  <>
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                      No connection requests
                    </h3>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      You&apos;re all caught up.
                    </p>
                  </>
                ) : searchQuery ? (
                  <>
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                      No people found
                    </h3>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      Try searching by name, skill, role, username, or getHack ID.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                      No matches found
                    </h3>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      Try changing or clearing your filters.
                    </p>
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-950 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: SENT REQUESTS ── */}
        {activeTab === "sent" && (
          <div>
            {displayedSent.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {displayedSent.map((s) => {
                  const user = TEAMMATES.find((m) => m.id === s.toUserId);
                  if (!user) return null;

                  const { name, username, role, skills = [], location, availability, accent = "indigo" } = user;
                  const accentText = ACCENT_TEXT[accent] || ACCENT_TEXT.indigo;
                  const accentBgSoft = ACCENT_BG_SOFT[accent] || ACCENT_BG_SOFT.indigo;
                  const initial = name ? name.charAt(0).toUpperCase() : "?";
                  const visibleSkills = skills.slice(0, 3);

                  return (
                    <div
                      key={s.id}
                      className="
                        flex
                        flex-col
                        justify-between
                        rounded-xl
                        border
                        border-neutral-200
                        bg-white
                        p-5
                        shadow-xs
                        transition-all
                        hover:border-neutral-300
                        dark:border-neutral-800
                        dark:bg-neutral-900
                        dark:hover:border-neutral-700
                      "
                    >
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            <div
                              className={`
                                grid
                                h-10
                                w-10
                                shrink-0
                                place-items-center
                                rounded-xl
                                text-sm
                                font-bold
                                ${accentBgSoft}
                                ${accentText}
                              `}
                            >
                              {initial}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="truncate text-sm font-semibold text-neutral-900 dark:text-white">
                                {name}
                              </h3>
                              {username && (
                                <p className="text-[11px] font-medium font-mono text-neutral-400 dark:text-neutral-500">
                                  @{username}
                                </p>
                              )}
                              <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                                {role}
                              </p>
                            </div>
                          </div>
                          <AvailabilityBadge availability={availability} />
                        </div>

                        {/* Skills */}
                        {visibleSkills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {visibleSkills.map((sk) => (
                              <span
                                key={sk}
                                className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                              >
                                {sk}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Location & Sent Date */}
                        <div className="flex items-center justify-between text-[11px] text-neutral-400 dark:text-neutral-500 pt-1">
                          <span>{location || "Remote"}</span>
                          <span>Request sent {s.createdAt}</span>
                        </div>
                      </div>

                      {/* Sent Actions: Cancel Request / View Profile */}
                      <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800/80">
                        <button
                          type="button"
                          onClick={() => handleCancelSentRequest(s.id)}
                          className="
                            inline-flex
                            items-center
                            gap-1.5
                            rounded-lg
                            border
                            border-neutral-200
                            px-3
                            py-1.5
                            text-xs
                            font-semibold
                            text-neutral-600
                            transition-colors
                            hover:bg-neutral-50
                            dark:border-neutral-800
                            dark:text-neutral-400
                            dark:hover:bg-neutral-800
                          "
                        >
                          <span>Cancel Request</span>
                        </button>

                        <Link
                          to={`/profile/${user.id}`}
                          className="
                            inline-flex
                            items-center
                            gap-1
                            text-xs
                            font-semibold
                            text-indigo-600
                            transition-colors
                            hover:text-indigo-700
                            dark:text-indigo-400
                            dark:hover:text-indigo-300
                          "
                        >
                          <span>View Profile</span>
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M5 12h14" />
                            <path d="m12 5 7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
                {sent.length === 0 ? (
                  <>
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                      No sent requests
                    </h3>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      Requests you send to developers will appear here.
                    </p>
                  </>
                ) : searchQuery ? (
                  <>
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                      No people found
                    </h3>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      Try searching by name, skill, role, username, or getHack ID.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                      No matches found
                    </h3>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      Try changing or clearing your filters.
                    </p>
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-950 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default Network;
