// ---------------------------------------------------------------------------
// TeammateCard — individual profile card for "Find Members" tab
// Follows the same card design conventions as HackathonCard.jsx
// ---------------------------------------------------------------------------

import { Link } from "react-router-dom";
import { ACCENT_TEXT, ACCENT_BG_SOFT } from "../../../constants/themeTokens";

// ---------------------------------------------------------------------------
// Availability badge rendering
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
// TeammateCard Component
// ---------------------------------------------------------------------------

function TeammateCard({ teammate, onConnect, connectionStatus }) {
  const {
    name,
    role,
    skills = [],
    experience,
    bio,
    location,
    availability,
    hackathonsCompleted = 0,
    accent = "indigo",
    username,
  } = teammate;

  const accentText = ACCENT_TEXT[accent] || ACCENT_TEXT.indigo;
  const accentBgSoft = ACCENT_BG_SOFT[accent] || ACCENT_BG_SOFT.indigo;
  const initial = name ? name.charAt(0).toUpperCase() : "?";

  // Show max 3 skills, then "+N more"
  const visibleSkills = skills.slice(0, 3);
  const overflowCount = skills.length - 3;

  return (
    <article
      className="
        group
        flex
        flex-col
        justify-between
        rounded-xl
        border
        border-neutral-200
        bg-white
        p-5
        transition-all
        duration-200
        hover:border-neutral-300
        hover:shadow-md
        hover:shadow-neutral-950/5
        dark:border-neutral-800
        dark:bg-neutral-900
        dark:hover:border-neutral-700
        dark:hover:shadow-neutral-950/30
      "
    >
      <div>
        {/* ── 1. Header: Avatar + Name + Role & Availability ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {/* Avatar */}
            <div
              className={`
                grid
                h-9
                w-9
                shrink-0
                place-items-center
                rounded-lg
                text-sm
                font-bold
                ${accentBgSoft}
                ${accentText}
              `}
            >
              {initial}
            </div>

            {/* Name & Role */}
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[15px] font-semibold leading-snug text-neutral-900 dark:text-white">
                {name}
              </h3>
              {username && (
                <p className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 font-mono">
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

        {/* ── 2. Bio ── */}
        {bio && (
          <p className="mt-3.5 line-clamp-2 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-300">
            {bio}
          </p>
        )}

        {/* ── 3. Skills ── */}
        {skills.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {visibleSkills.map((skill) => (
              <span
                key={skill}
                className={`
                  inline-flex
                  items-center
                  rounded-md
                  px-2
                  py-0.5
                  text-[11px]
                  font-medium
                  ${accentBgSoft}
                  ${accentText}
                `}
              >
                {skill}
              </span>
            ))}
            {overflowCount > 0 && (
              <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                +{overflowCount} more
              </span>
            )}
          </div>
        )}

        {/* ── 4. Stats Row ── */}
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-neutral-100 pt-3.5 dark:border-neutral-800/80">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              EXPERIENCE
            </p>
            <p className="mt-0.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              {experience}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              HACKATHONS
            </p>
            <p className="mt-0.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              {hackathonsCompleted} completed
            </p>
          </div>
        </div>
      </div>

      {/* ── 5. Footer: Location (Left) & View Profile (Right) ── */}
      <div className="mt-4 flex items-end justify-between gap-3 border-t border-neutral-100 pt-3.5 dark:border-neutral-800/80">
        {/* Location */}
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400">
          {location ? (
            <>
              <svg
                className="h-3.5 w-3.5 shrink-0 text-neutral-400 dark:text-neutral-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>{location}</span>
            </>
          ) : (
            <>
              <svg
                className="h-3.5 w-3.5 shrink-0 text-neutral-400 dark:text-neutral-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10z" />
              </svg>
              <span>Remote</span>
            </>
          )}
        </span>

        {/* Actions: Connect & View Profile */}
        <div className="flex items-center gap-2">
          {connectionStatus === "accepted" ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
              ✓ Connected
            </span>
          ) : connectionStatus === "pending" ? (
            <button
              type="button"
              disabled
              className="cursor-not-allowed inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500"
            >
              Request Sent
            </button>
          ) : onConnect ? (
            <button
              type="button"
              onClick={() => onConnect(teammate)}
              className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-2xs transition-colors hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              + Connect
            </button>
          ) : null}

          <Link
            to={`/profile/${teammate.id || teammate._id}`}
            className="
              inline-flex
              items-center
              gap-1
              text-xs
              font-semibold
              text-indigo-600
              transition-colors
              duration-150
              hover:text-indigo-700
              dark:text-indigo-400
              dark:hover:text-indigo-300
            "
          >
            <span>View Profile</span>
            <svg
              className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-1"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </article>
  );
}

export default TeammateCard;
