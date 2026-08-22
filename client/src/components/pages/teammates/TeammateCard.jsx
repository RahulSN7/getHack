// ---------------------------------------------------------------------------
// TeammateCard — clean participant discovery card for getHack
// Replaces role label with Skills section and focuses on participant discovery
// ---------------------------------------------------------------------------

import { Link } from "react-router-dom";
import { ACCENT_TEXT, ACCENT_BG_SOFT } from "../../../constants/themeTokens";
import { isProfileComplete } from "../../../utils/profileValidation";

// ---------------------------------------------------------------------------
// Availability badge rendering (only shows valid real availability; no "Not Set")
// ---------------------------------------------------------------------------

function AvailabilityBadge({ availability, isComplete }) {
  if (!isComplete || !availability) {
    return null; // Do not render "Not Set" badge
  }

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

function TeammateCard({ teammate }) {
  const {
    name,
    experience = "Intermediate",
    bio,
    location,
    availability,
    hackathonsCompleted = 0,
    accent = "indigo",
    username,
    avatar,
  } = teammate;

  const accentText = ACCENT_TEXT[accent] || ACCENT_TEXT.indigo;
  const accentBgSoft = ACCENT_BG_SOFT[accent] || ACCENT_BG_SOFT.indigo;
  const initial = name ? name.charAt(0).toUpperCase() : "?";

  // Normalize skills (supports array or comma-separated string)
  const rawSkills = teammate.skills || teammate.profile?.skills || [];
  const parsedSkills = Array.isArray(rawSkills)
    ? rawSkills
    : typeof rawSkills === "string"
    ? rawSkills.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const visibleSkills = parsedSkills.slice(0, 3);
  const overflowCount = Math.max(0, parsedSkills.length - 3);

  // Normalize interests
  const rawInterests = teammate.interests || teammate.profile?.interests || [];
  const formattedInterests = Array.isArray(rawInterests)
    ? rawInterests.join(" · ")
    : typeof rawInterests === "string"
    ? rawInterests
    : "";

  // Normalize domain
  const rawDomain = teammate.domain || teammate.profile?.domain || "";
  const formattedDomain = Array.isArray(rawDomain)
    ? rawDomain.join(" · ")
    : typeof rawDomain === "string"
    ? rawDomain
    : "";

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
        hover:-translate-y-0.5
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
        {/* ── 1. Header: Avatar + Name + getHack ID (No Participant role) ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {/* Avatar */}
            {avatar ? (
              <img
                src={avatar}
                alt={name}
                className="h-10 w-10 shrink-0 rounded-full object-cover border border-neutral-200 dark:border-neutral-800"
              />
            ) : (
              <div
                className={`
                  grid
                  h-10
                  w-10
                  shrink-0
                  place-items-center
                  rounded-full
                  text-sm
                  font-bold
                  ${accentBgSoft}
                  ${accentText}
                `}
              >
                {initial}
              </div>
            )}

            {/* Name & getHack ID */}
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[15px] font-semibold leading-snug text-neutral-900 dark:text-white">
                {name}
              </h3>
              {username && (
                <p className="mt-0.5 text-[11px] font-medium text-neutral-400 dark:text-neutral-500 font-mono">
                  @{username}
                </p>
              )}
            </div>
          </div>

          <AvailabilityBadge availability={availability} isComplete={isProfileComplete(teammate)} />
        </div>

        {/* ── 2. Skills Section ── */}
        {parsedSkills.length > 0 && (
          <div className="mt-4 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              SKILLS
            </p>
            <div className="flex flex-wrap gap-1.5">
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
                  +{overflowCount}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── 3. Interests (Compact) ── */}
        {formattedInterests && (
          <div className="mt-3.5 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              INTERESTS
            </p>
            <p className="truncate text-xs font-medium text-neutral-600 dark:text-neutral-300">
              {formattedInterests}
            </p>
          </div>
        )}

        {/* ── 4. Domain (Compact - if present) ── */}
        {formattedDomain && (
          <div className="mt-3 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              DOMAIN
            </p>
            <p className="truncate text-xs font-medium text-neutral-600 dark:text-neutral-300">
              {formattedDomain}
            </p>
          </div>
        )}

        {/* ── 5. Bio (Fallback if no interests/domain) ── */}
        {bio && !formattedInterests && !formattedDomain && (
          <p className="mt-3.5 line-clamp-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
            {bio}
          </p>
        )}

        {/* ── 6. Stats Row ── */}
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

      {/* ── 7. Footer: Location (if set) & View Profile Action ── */}
      <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3.5 dark:border-neutral-800/80">
        {location ? (
          <span className="inline-flex items-center gap-1 truncate text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            <svg
              className="h-3 w-3 shrink-0 text-neutral-400 dark:text-neutral-500"
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
            <span className="truncate">{location}</span>
          </span>
        ) : (
          <span />
        )}

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
    </article>
  );
}

export default TeammateCard;
