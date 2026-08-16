// ---------------------------------------------------------------------------
// TeamCard — team listing card for "Join a Team" tab
// Follows the same card design conventions as HackathonCard.jsx
// ---------------------------------------------------------------------------

import { ACCENT_TEXT, ACCENT_BG_SOFT } from "../../../constants/themeTokens";

// ---------------------------------------------------------------------------
// Status badge rendering
// ---------------------------------------------------------------------------

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
      Full
    </span>
  );
}

// ---------------------------------------------------------------------------
// TeamCard Component
// ---------------------------------------------------------------------------

function TeamCard({ team, onSelectTeam }) {
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
  } = team;

  const accentText = ACCENT_TEXT[accent] || ACCENT_TEXT.indigo;
  const accentBgSoft = ACCENT_BG_SOFT[accent] || ACCENT_BG_SOFT.indigo;
  const initial = teamName ? teamName.charAt(0).toUpperCase() : "T";

  // Tech stack preview — max 3
  const visibleTech = techStack.slice(0, 3);
  const techOverflow = techStack.length - 3;

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
        {/* ── 1. Header: Avatar + Team Name + Hackathon & Status ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {/* Team avatar */}
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

            {/* Team Name & Hackathon */}
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[15px] font-semibold leading-snug text-neutral-900 dark:text-white">
                {teamName}
              </h3>
              <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                for{" "}
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  {hackathonName}
                </span>
              </p>
            </div>
          </div>

          <StatusBadge status={status} />
        </div>

        {/* ── 2. Description ── */}
        {description && (
          <p className="mt-3.5 line-clamp-2 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-300">
            {description}
          </p>
        )}

        {/* ── 3. Roles Needed ── */}
        {rolesNeeded.length > 0 && (
          <div className="mt-3.5">
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              ROLES NEEDED
            </p>
            <div className="flex flex-wrap gap-1.5">
              {rolesNeeded.map((role) => (
                <span
                  key={role}
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
                  {role}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── 4. Stats Row ── */}
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-neutral-100 pt-3.5 dark:border-neutral-800/80">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              TEAM SIZE
            </p>
            <p className="mt-0.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              {currentSize} / {maxSize} members
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              LOCATION
            </p>
            <p className="mt-0.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              {location || "Remote"}
            </p>
          </div>
        </div>
      </div>

      {/* ── 5. Footer: Tech Stack (Left) & Team Details CTA (Right) ── */}
      <div className="mt-4 flex items-end justify-between gap-3 border-t border-neutral-100 pt-3.5 dark:border-neutral-800/80">
        {/* Tech stack preview */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Tech:
            </span>
            {visibleTech.map((tech) => (
              <span
                key={tech}
                className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300"
              >
                {tech}
                {tech !== visibleTech[visibleTech.length - 1] || techOverflow > 0 ? "," : ""}
              </span>
            ))}
            {techOverflow > 0 && (
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                +{techOverflow}
              </span>
            )}
          </div>
        </div>

        {/* Team Details CTA */}
        <button
          type="button"
          onClick={() => onSelectTeam && onSelectTeam(team)}
          className="
            inline-flex
            shrink-0
            items-center
            gap-1.5
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
          <span>Team Details</span>
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
        </button>
      </div>
    </article>
  );
}

export default TeamCard;
