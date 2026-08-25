// ---------------------------------------------------------------------------
// TeamCard — team listing card for "Join a Team" tab
// Follows the same card design conventions as HackathonCard.jsx
// ---------------------------------------------------------------------------

import { useState } from "react";
import { Link } from "react-router-dom";
import { ACCENT_TEXT, ACCENT_BG_SOFT } from "../../../constants/themeTokens";
import { resolveTeamLeader, getTeamActionState } from "../../../utils/teamMemberResolver";

// ---------------------------------------------------------------------------
// Status badge rendering
// ---------------------------------------------------------------------------

function StatusBadge({ currentSize, maxSize }) {
  const spotsLeft = Math.max(0, maxSize - currentSize);
  if (spotsLeft > 0) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        {spotsLeft === 1 ? "1 spot left" : `${spotsLeft} spots left`}
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
      <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500" />
      Team Full
    </span>
  );
}

// ---------------------------------------------------------------------------
// TeamCard Component
// ---------------------------------------------------------------------------

function TeamCard({
  team,
  currentUser,
  sentRequests = [],
  onRequestJoin,
  onViewDetails,
  onSelectTeam,
}) {
  const {
    teamName,
    hackathonName,
    description,
    rolesNeeded = [],
    techStack = [],
    currentSize = 1,
    maxSize = 4,
    location,
    accent = "indigo",
    status,
  } = team;

  const [isRequesting, setIsRequesting] = useState(false);

  const accentText = ACCENT_TEXT[accent] || ACCENT_TEXT.indigo;
  const accentBgSoft = ACCENT_BG_SOFT[accent] || ACCENT_BG_SOFT.indigo;
  const initial = teamName ? teamName.charAt(0).toUpperCase() : "T";
  const leaderObj = resolveTeamLeader(team);

  const teamIdStr = (team._id || team.id)?.toString();
  const actionState = getTeamActionState(team, currentUser, sentRequests);

  const handleRequestClick = async (e) => {
    e.stopPropagation();
    if (!onRequestJoin) return;
    try {
      setIsRequesting(true);
      await onRequestJoin(teamIdStr);
    } catch (err) {
      console.error("Request to join click error:", err);
    } finally {
      setIsRequesting(false);
    }
  };

  // Technologies list — fallback to team.technologies or team.tech if present
  const technologies =
    Array.isArray(techStack) && techStack.length > 0
      ? techStack
      : Array.isArray(team.technologies) && team.technologies.length > 0
      ? team.technologies
      : Array.isArray(team.tech)
      ? team.tech
      : [];

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
              {leaderObj && leaderObj.name && (
                <p className="mt-0.5 truncate text-[11px] text-neutral-400 dark:text-neutral-500">
                  Leader: <span className="font-medium text-neutral-600 dark:text-neutral-400">{leaderObj.name}</span>
                </p>
              )}
            </div>
          </div>

          <StatusBadge currentSize={currentSize} maxSize={maxSize} />
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

        {/* ── 4. Technologies ── */}
        {technologies.length > 0 && (
          <div className="mt-3.5">
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              TECHNOLOGIES
            </p>
            <div className="flex flex-wrap gap-1.5">
              {technologies.map((tech) => (
                <span
                  key={tech}
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
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── 5. Stats Row ── */}
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-neutral-100 pt-3.5 dark:border-neutral-800/80">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              TEAM MEMBERS
            </p>
            <p className="mt-0.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              {currentSize} / {maxSize} members
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              OPEN SPOTS
            </p>
            <p className="mt-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {maxSize - currentSize === 1 ? "1 spot available" : `${maxSize - currentSize} spots available`}
            </p>
          </div>
        </div>
      </div>

      {/* ── 6. Footer: Team Actions ── */}
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-neutral-100 pt-3.5 dark:border-neutral-800/80">
        <Link
          to={`/team/${teamIdStr}`}
          state={{ from: "/teammates?tab=teams" }}
          className="
            inline-flex
            items-center
            gap-1
            rounded-lg
            border
            border-neutral-200
            bg-white
            px-3
            py-1.5
            text-xs
            font-semibold
            text-neutral-700
            transition-colors
            hover:bg-neutral-50
            dark:border-neutral-800
            dark:bg-neutral-900
            dark:text-neutral-300
            dark:hover:bg-neutral-800
          "
        >
          <span>View Team</span>
        </Link>

        {actionState.type === "leader" ? (
          <span className="inline-flex items-center rounded-lg bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
            Your Team
          </span>
        ) : actionState.type === "member" ? (
          <span className="inline-flex items-center rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            You are a member
          </span>
        ) : actionState.type === "pending" ? (
          <span className="inline-flex items-center gap-1 rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-400 cursor-not-allowed dark:bg-neutral-800 dark:text-neutral-500">
            ✓ Request Sent
          </span>
        ) : actionState.type === "full" ? (
          <span className="inline-flex items-center rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-400 cursor-not-allowed dark:bg-neutral-800 dark:text-neutral-500">
            Team Full
          </span>
        ) : (
          <button
            type="button"
            disabled={isRequesting}
            onClick={handleRequestClick}
            className="
              inline-flex
              items-center
              gap-1
              rounded-lg
              bg-indigo-600
              px-3
              py-1.5
              text-xs
              font-semibold
              text-white
              transition-colors
              hover:bg-indigo-500
              disabled:opacity-50
              disabled:cursor-not-allowed
              dark:bg-indigo-500
              dark:hover:bg-indigo-400
            "
          >
            <span>{isRequesting ? "Sending..." : "Request to Join"}</span>
          </button>
        )}
      </div>
    </article>
  );
}

export default TeamCard;
