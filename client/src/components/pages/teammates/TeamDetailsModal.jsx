// ---------------------------------------------------------------------------
// TeamDetailsModal — Modal dialog displaying full team details
// Community-focused, friendly UI displaying team info, roles needed, tech stack, and members
// ---------------------------------------------------------------------------

import { useEffect, useRef } from "react";
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
  } = team;

  const accentText = ACCENT_TEXT[accent] || ACCENT_TEXT.indigo;
  const accentBgSoft = ACCENT_BG_SOFT[accent] || ACCENT_BG_SOFT.indigo;
  const initial = teamName ? teamName.charAt(0).toUpperCase() : "T";

  // Find creator details if present
  const creator = TEAMMATES.find((m) => m.id === createdBy);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
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
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-4 pr-8">
          <div
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-lg font-bold ${accentBgSoft} ${accentText}`}
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="team-details-title" className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {teamName}
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              Building for <span className="font-semibold text-neutral-800 dark:text-neutral-200">{hackathonName}</span>
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <StatusBadge status={status} />
              <span className="text-xs text-neutral-400 dark:text-neutral-500">·</span>
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                {currentSize} / {maxSize} members
              </span>
            </div>
          </div>
        </div>

        <div className="my-5 border-t border-neutral-100 dark:border-neutral-800" />

        {/* Content Body */}
        <div className="space-y-5 text-sm">
          {/* Description */}
          {description && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                Project Overview
              </h3>
              <p className="mt-1.5 text-neutral-700 dark:text-neutral-300 leading-relaxed">
                {description}
              </p>
            </div>
          )}

          {/* Roles Needed */}
          {rolesNeeded.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                Looking for Skills & Roles
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {rolesNeeded.map((role) => (
                  <span
                    key={role}
                    className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${accentBgSoft} ${accentText}`}
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tech Stack */}
          {techStack.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                Tech Stack
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {techStack.map((tech) => (
                  <span
                    key={tech}
                    className="inline-flex items-center rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-300"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Team Info / Creator */}
          <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-4 dark:border-neutral-800/80 dark:bg-neutral-900/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Team Contact
                </p>
                <p className="mt-0.5 font-semibold text-neutral-900 dark:text-white">
                  {creator ? creator.name : "Team Builder"}
                </p>
                {creator && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {creator.role} {creator.location ? `· ${creator.location}` : ""}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Location
                </p>
                <p className="mt-0.5 font-semibold text-neutral-900 dark:text-white">
                  {location || "Remote"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-neutral-100 pt-4 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-neutral-950 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default TeamDetailsModal;
