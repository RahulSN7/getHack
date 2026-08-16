// ---------------------------------------------------------------------------
// TeamDetailsModal — Strict Modal Scroll Isolation
// Background remains locked while only the modal content scrolls vertically
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import { TEAMMATES } from "../../../data/teammates";
import { ACCENT_TEXT, ACCENT_BG_SOFT } from "../../../constants/themeTokens";

function StatusBadge({ status }) {
  if (status === "Recruiting") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Looking for teammates
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
      <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500" />
      Team complete
    </span>
  );
}

function TeamDetailsModal({ team, onClose }) {
  const modalRef = useRef(null);
  const [joined, setJoined] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Lock body scroll while modal is open, restore on unmount/close
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  if (!team) return null;

  const {
    teamName,
    hackathonName,
    description,
    rolesNeeded = [],
    techStack = [],
    currentSize,
    maxSize,
    location,
    accent = "indigo",
    status,
    createdBy,
    memberIds = [],
  } = team;

  const accentText = ACCENT_TEXT[accent] || ACCENT_TEXT.indigo;
  const accentBgSoft = ACCENT_BG_SOFT[accent] || ACCENT_BG_SOFT.indigo;
  const isFull = status === "Full" || currentSize >= maxSize;

  // Resolve member profiles from TEAMMATES data
  const memberList = memberIds
    .map((id) => TEAMMATES.find((m) => m.id === id))
    .filter(Boolean);

  // Fallback if no memberIds defined
  const creator = TEAMMATES.find((m) => m.id === createdBy);
  const displayMembers =
    memberList.length > 0
      ? memberList
      : creator
        ? [creator]
        : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-neutral-950/60 backdrop-blur-xs overscroll-contain transition-opacity animate-in fade-in duration-150"
      onClick={(e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="team-details-title"
    >
      <div
        ref={modalRef}
        className="relative flex flex-col w-full max-w-2xl max-h-[85vh] sm:max-h-[88vh] overflow-hidden overscroll-contain rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
      >
        {/* ── Fixed Top Bar: Back & Close ── */}
        <div className="shrink-0 flex items-center justify-between border-b border-neutral-100 px-6 py-4 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
            <span>Back to Join a Team</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close team details"
            className="
              grid
              h-8
              w-8
              place-items-center
              rounded-lg
              text-neutral-400
              transition-colors
              hover:bg-neutral-100
              hover:text-neutral-700
              focus-visible:outline
              focus-visible:outline-2
              focus-visible:outline-indigo-500
              dark:text-neutral-500
              dark:hover:bg-neutral-800
              dark:hover:text-neutral-200
            "
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Internal Scrollable Content Area ── */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-6 sm:p-8 space-y-8">
          {/* 1. TEAM HEADER */}
          <section className="flex items-start gap-4">
            <div
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-lg font-bold ${accentBgSoft} ${accentText}`}
            >
              {teamName ? teamName.charAt(0).toUpperCase() : "T"}
            </div>

            <div className="min-w-0 flex-1">
              <h2
                id="team-details-title"
                className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl dark:text-white"
              >
                {teamName}
              </h2>
              <p className="mt-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Building for{" "}
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  {hackathonName}
                </span>
              </p>

              {/* Status & Compact Metadata */}
              <div className="mt-3 flex flex-wrap items-center gap-2.5 text-xs">
                <StatusBadge status={status} />
                <span className="text-neutral-300 dark:text-neutral-700">·</span>
                <span className="font-medium text-neutral-600 dark:text-neutral-400">
                  {currentSize} / {maxSize} members
                </span>
                {location && (
                  <>
                    <span className="text-neutral-300 dark:text-neutral-700">·</span>
                    <span className="text-neutral-500 dark:text-neutral-400">
                      {location}
                    </span>
                  </>
                )}
              </div>
            </div>
          </section>

          <div className="border-t border-neutral-100 dark:border-neutral-800" />

          {/* 2. PROJECT OVERVIEW */}
          {description && (
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                PROJECT OVERVIEW
              </h3>
              <p className="text-sm sm:text-base leading-relaxed text-neutral-700 dark:text-neutral-300">
                {description}
              </p>
            </section>
          )}

          {/* 3. LOOKING FOR */}
          {rolesNeeded.length > 0 && (
            <section className="space-y-2 border-t border-neutral-100 pt-8 dark:border-neutral-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                LOOKING FOR
              </h3>
              <div className="flex flex-wrap gap-2 pt-1">
                {rolesNeeded.map((role) => (
                  <span
                    key={role}
                    className={`inline-flex items-center rounded-md px-3 py-1 text-xs font-semibold ${accentBgSoft} ${accentText}`}
                  >
                    {role}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* 4. TECH STACK */}
          {techStack.length > 0 && (
            <section className="space-y-2 border-t border-neutral-100 pt-8 dark:border-neutral-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                TECH STACK
              </h3>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {techStack.map((tech) => (
                  <span
                    key={tech}
                    className="inline-flex items-center rounded-md border border-neutral-200/90 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-300"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* 5. TEAM MEMBERS */}
          <section className="space-y-3 border-t border-neutral-100 pt-8 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                TEAM MEMBERS
              </h3>
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                · {displayMembers.length}
              </span>
            </div>

            <div className="space-y-2.5 pt-1">
              {displayMembers.map((member) => {
                const isLeader = member.id === createdBy;
                const memberInitials = member.name
                  ? member.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                  : "?";

                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3.5 rounded-xl border border-neutral-200/70 bg-neutral-50/50 p-3.5 dark:border-neutral-800/70 dark:bg-neutral-900/50"
                  >
                    {/* Avatar */}
                    <div
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-bold ${isLeader
                          ? `${accentBgSoft} ${accentText}`
                          : "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                        }`}
                    >
                      {memberInitials}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">
                          {member.name}
                        </p>
                        {isLeader && (
                          <span className="shrink-0 rounded bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
                            LEADER
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                        {member.role}
                        {member.location ? ` · ${member.location}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 6. JOIN CTA */}
          <section className="border-t border-neutral-100 pt-8 dark:border-neutral-800">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {!isFull
                  ? "Reach out to connect and build together."
                  : "This team has reached its full member capacity."}
              </p>

              {!isFull ? (
                <button
                  type="button"
                  onClick={() => setJoined(true)}
                  className={`
                    inline-flex
                    w-full
                    sm:w-auto
                    items-center
                    justify-center
                    gap-2
                    rounded-lg
                    px-6
                    py-2.5
                    text-xs
                    font-semibold
                    shadow-xs
                    transition-all
                    duration-150
                    focus-visible:outline
                    focus-visible:outline-2
                    focus-visible:outline-indigo-500
                    ${joined
                      ? "bg-emerald-600 text-white dark:bg-emerald-500 hover:bg-emerald-700"
                      : "bg-indigo-600 text-white hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                    }
                  `}
                >
                  {joined ? (
                    <>
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Interest Sent</span>
                    </>
                  ) : (
                    <span>I'd like to join</span>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="
                    w-full
                    sm:w-auto
                    cursor-not-allowed
                    rounded-lg
                    bg-neutral-200
                    px-6
                    py-2.5
                    text-xs
                    font-semibold
                    text-neutral-500
                    dark:bg-neutral-800
                    dark:text-neutral-400
                  "
                >
                  Team is full
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default TeamDetailsModal;
