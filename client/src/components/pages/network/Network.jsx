// ---------------------------------------------------------------------------
// Network — My Network Page Component (/network)
// Professional community hub for managing connections, incoming requests, and sent requests
// ---------------------------------------------------------------------------

import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import NetworkFilters from "./NetworkFilters";
import NetworkUserCard from "./NetworkUserCard";
import { userService } from "../../../services/userService";

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

function Network() {
  const [activeTab, setActiveTab] = useState("connections"); // 'connections' | 'requests' | 'sent'
  const [searchQuery, setSearchQuery] = useState("");
  const [connections, setConnections] = useState([]);
  const [requests, setRequests] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);

  // Load real network requests from backend API on mount
  const loadNetworkData = async (isMounted = true) => {
    setLoading(true);
    try {
      const data = await userService.getNetworkRequests();
      if (isMounted && data) {
        setConnections(Array.isArray(data.connections) ? data.connections : []);
        setRequests(
          Array.isArray(data.incoming)
            ? data.incoming.map((req) => ({
                id: req.id || req.requestId,
                fromUserId: req.senderId,
                name: req.name,
                role: req.role,
                avatar: req.avatar,
                skills: req.skills || [],
                location: req.location || "",
                availability: req.availability || "",
                username: req.username || (req.name ? req.name.toLowerCase().replace(/[^a-z0-9]/g, "") : ""),
                note: req.note,
                createdAt: req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "Just now",
              }))
            : []
        );
        setSent(
          Array.isArray(data.outgoing)
            ? data.outgoing.map((s) => ({
                id: s.id || s.requestId,
                toUserId: s.receiverId,
                name: s.name,
                role: s.role,
                avatar: s.avatar,
                skills: s.skills || [],
                location: s.location || "",
                availability: s.availability || "",
                username: s.username || (s.name ? s.name.toLowerCase().replace(/[^a-z0-9]/g, "") : ""),
                note: s.note,
                createdAt: s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "Just now",
              }))
            : []
        );
      }
    } catch (err) {
      console.error("Failed to load network requests:", err);
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    loadNetworkData(isMounted);
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
    const reqId = typeof requestItem === "string" ? requestItem : requestItem.id;
    const reqName = requestItem?.name || "builder";
    try {
      await userService.respondToConnectionRequest(reqId, "accept");
      await loadNetworkData(true);
      setToastMessage(`Connection request from ${reqName} accepted!`);
    } catch (err) {
      setToastMessage("Failed to accept request.");
    }
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeclineRequest = async (requestItem) => {
    const reqId = typeof requestItem === "string" ? requestItem : requestItem.id;
    try {
      await userService.respondToConnectionRequest(reqId, "decline");
      await loadNetworkData(true);
      setToastMessage("Connection request declined.");
    } catch {
      setRequests((prev) => prev.filter((r) => r.id !== reqId));
    }
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
      if (conn.role) rolesSet.add(conn.role);
    });
    return Array.from(rolesSet);
  }, [connections]);

  const availableSkills = useMemo(() => {
    const skillsSet = new Set();
    connections.forEach((conn) => {
      if (conn.skills && Array.isArray(conn.skills)) {
        conn.skills.forEach((s) => skillsSet.add(s));
      }
    });
    return Array.from(skillsSet);
  }, [connections]);

  // ── Derived Pipeline: Search → Filter → Sort ──

  const displayedConnections = useMemo(() => {
    let list = connections.filter((conn) => matchesUserSearch(conn, searchQuery));

    if (connAvailability !== "all") {
      list = list.filter((conn) => conn.availability === connAvailability);
    }

    if (connRole !== "all") {
      list = list.filter((conn) => conn.role === connRole);
    }

    if (connSkills.length > 0) {
      list = list.filter((conn) => conn.skills && connSkills.some((s) => conn.skills.includes(s)));
    }

    return [...list].sort((a, b) => {
      if (connSort === "name-asc") {
        return (a.name || "").localeCompare(b.name || "");
      }
      if (connSort === "name-desc") {
        return (b.name || "").localeCompare(a.name || "");
      }
      return getDaysAgo(a.connectedAt) - getDaysAgo(b.connectedAt);
    });
  }, [connections, searchQuery, connAvailability, connRole, connSkills, connSort]);

  const displayedRequests = useMemo(() => {
    let list = requests.filter((req) => matchesUserSearch(req, searchQuery));

    if (requestAge === "recent") {
      list = list.filter((req) => getDaysAgo(req.createdAt) <= 7);
    } else if (requestAge === "older") {
      list = list.filter((req) => getDaysAgo(req.createdAt) > 7);
    }

    return [...list].sort((a, b) => {
      if (requestSort === "oldest") {
        return getDaysAgo(b.createdAt) - getDaysAgo(a.createdAt);
      }
      if (requestSort === "name-asc") {
        return (a.name || "").localeCompare(b.name || "");
      }
      return getDaysAgo(a.createdAt) - getDaysAgo(b.createdAt);
    });
  }, [requests, searchQuery, requestAge, requestSort]);

  const displayedSent = useMemo(() => {
    let list = sent.filter((s) => matchesUserSearch(s, searchQuery));

    if (sentAge === "recent") {
      list = list.filter((s) => getDaysAgo(s.createdAt) <= 7);
    } else if (sentAge === "older") {
      list = list.filter((s) => getDaysAgo(s.createdAt) > 7);
    }

    return [...list].sort((a, b) => {
      if (sentSort === "oldest") {
        return getDaysAgo(b.createdAt) - getDaysAgo(a.createdAt);
      }
      if (sentSort === "name-asc") {
        return (a.name || "").localeCompare(b.name || "");
      }
      return getDaysAgo(a.createdAt) - getDaysAgo(b.createdAt);
    });
  }, [sent, searchQuery, sentAge, sentSort]);

  return (
    <div className="min-h-screen bg-slate-50 text-neutral-900 transition-colors dark:bg-neutral-950 dark:text-neutral-100">
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
                  <span>Incoming Requests</span>
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
                  <span>Sent Requests</span>
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
          <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs font-semibold text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/60 dark:text-indigo-300 animate-in fade-in">
            {toastMessage}
          </div>
        )}

        {/* Loading State or Tab Content */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900" />
            ))}
          </div>
        ) : (
          <>
            {/* ── TAB 1: CONNECTIONS ── */}
            {activeTab === "connections" && (
              <div>
                {displayedConnections.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {displayedConnections.map((conn) => (
                      <NetworkUserCard
                        key={conn.id}
                        person={conn}
                        variant="connection"
                        onMessage={handleMessageClick}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
                    {connections.length === 0 ? (
                      <>
                        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                          No connections yet
                        </h3>
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                          Start connecting with developers and find people who complement your skills.
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
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {displayedRequests.map((req) => (
                      <NetworkUserCard
                        key={req.id}
                        person={req}
                        variant="incoming-request"
                        onAccept={handleAcceptRequest}
                        onDecline={handleDeclineRequest}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
                    {requests.length === 0 ? (
                      <>
                        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                          No incoming requests
                        </h3>
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                          When someone sends you a connection request, it will appear here.
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
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {displayedSent.map((s) => (
                      <NetworkUserCard
                        key={s.id}
                        person={s}
                        variant="sent-request"
                        onCancel={handleCancelSentRequest}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
                    {sent.length === 0 ? (
                      <>
                        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                          No sent requests
                        </h3>
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                          People you send connection requests to will appear here.
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
          </>
        )}
      </main>
    </div>
  );
}

export default Network;
