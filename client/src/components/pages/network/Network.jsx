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
  const [connections, setConnections] = useState(INITIAL_CONNECTIONS);
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [sent, setSent] = useState(INITIAL_SENT);
  const [toastMessage, setToastMessage] = useState(null);

  // ── Action Handlers ──

  const handleAcceptRequest = (requestItem) => {
    // Remove from requests
    setRequests((prev) => prev.filter((r) => r.id !== requestItem.id));
    // Add to connections
    setConnections((prev) => [
      {
        id: `conn-${Date.now()}`,
        userId: requestItem.fromUserId,
        connectedAt: "Just now",
      },
      ...prev,
    ]);
  };

  const handleDeclineRequest = (requestId) => {
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  const handleCancelSentRequest = (sentId) => {
    setSent((prev) => prev.filter((s) => s.id !== sentId));
  };

  const handleMessageClick = (userName, username) => {
    const handleText = username ? `@${username}` : userName;
    setToastMessage(`Direct messaging with ${handleText} coming soon!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ── Derived Filtered Lists ──

  const filteredConnections = useMemo(() => {
    return connections.filter((conn) => {
      const u = TEAMMATES.find((m) => m.id === conn.userId);
      return matchesUserSearch(u, searchQuery);
    });
  }, [connections, searchQuery]);

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const u = TEAMMATES.find((m) => m.id === req.fromUserId);
      return matchesUserSearch(u, searchQuery);
    });
  }, [requests, searchQuery]);

  const filteredSent = useMemo(() => {
    return sent.filter((s) => {
      const u = TEAMMATES.find((m) => m.id === s.toUserId);
      return matchesUserSearch(u, searchQuery);
    });
  }, [sent, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 text-neutral-900 transition-colors dark:bg-neutral-950 dark:text-neutral-100">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* ── Page Header ── */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl dark:text-white">
            My Network
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Stay connected with builders you may want to collaborate with.
          </p>
        </div>

        {/* ── Search Bar & Tabs Row ── */}
        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <svg
                className="h-4 w-4 text-neutral-400 dark:text-neutral-500"
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
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your network by name, role, skill, @username..."
              className="
                w-full
                rounded-xl
                border
                border-neutral-200
                bg-white
                py-2.5
                pl-10
                pr-4
                text-xs
                font-medium
                text-neutral-900
                placeholder-neutral-400
                shadow-xs
                transition-colors
                focus:border-indigo-500
                focus:outline-none
                focus:ring-2
                focus:ring-indigo-500/20
                dark:border-neutral-800
                dark:bg-neutral-900
                dark:text-white
                dark:placeholder-neutral-500
                dark:focus:border-indigo-400
              "
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Navigation Tabs with Dynamic Counts */}
          <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setActiveTab("connections")}
              className={`
                inline-flex
                items-center
                gap-2
                border-b-2
                pb-3
                px-1
                text-xs
                font-semibold
                transition-colors
                ${
                  activeTab === "connections"
                    ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                    : "border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                }
              `}
            >
              <span>Connections</span>
              <span
                className={`
                  rounded-full
                  px-2
                  py-0.5
                  text-[10px]
                  font-bold
                  ${
                    activeTab === "connections"
                      ? "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
                      : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
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
                gap-2
                border-b-2
                pb-3
                px-1
                text-xs
                font-semibold
                transition-colors
                ${
                  activeTab === "requests"
                    ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                    : "border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                }
              `}
            >
              <span>Requests</span>
              <span
                className={`
                  rounded-full
                  px-2
                  py-0.5
                  text-[10px]
                  font-bold
                  ${
                    activeTab === "requests"
                      ? "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
                      : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
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
                gap-2
                border-b-2
                pb-3
                px-1
                text-xs
                font-semibold
                transition-colors
                ${
                  activeTab === "sent"
                    ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                    : "border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                }
              `}
            >
              <span>Sent</span>
              <span
                className={`
                  rounded-full
                  px-2
                  py-0.5
                  text-[10px]
                  font-bold
                  ${
                    activeTab === "sent"
                      ? "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
                      : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                  }
                `}
              >
                {sent.length}
              </span>
            </button>
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
            {filteredConnections.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {filteredConnections.map((conn) => {
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
                {searchQuery ? (
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
                      No connections yet
                    </h3>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      Start discovering builders and connect with people who share your interests.
                    </p>
                    <div className="mt-4">
                      <Link
                        to="/teammates"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                      >
                        <span>Find Teammates</span>
                      </Link>
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
            {filteredRequests.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {filteredRequests.map((req) => {
                  const user = TEAMMATES.find((m) => m.id === req.fromUserId);
                  if (!user) return null;

                  const { name, username, role, skills = [], location, availability, accent = "indigo" } = user;
                  const accentText = ACCENT_TEXT[accent] || ACCENT_TEXT.indigo;
                  const accentBgSoft = ACCENT_BG_SOFT[accent] || ACCENT_BG_SOFT.indigo;
                  const initial = name ? name.charAt(0).toUpperCase() : "?";
                  const visibleSkills = skills.slice(0, 3);

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

                        {/* Optional Message */}
                        {req.message && (
                          <div className="rounded-lg bg-neutral-50 p-3 text-xs italic text-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-300">
                            "{req.message}"
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
                {searchQuery ? (
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
                      No connection requests
                    </h3>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      You're all caught up.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: SENT REQUESTS ── */}
        {activeTab === "sent" && (
          <div>
            {filteredSent.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {filteredSent.map((s) => {
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
                {searchQuery ? (
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
                      No pending requests
                    </h3>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      People you connect with will appear here.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Network;
