// ---------------------------------------------------------------------------
// TeammateCard.jsx — Redesigned Teammate Card Component for Find Teammates
// Matches exact getHack dark theme & reference design specifications
// ---------------------------------------------------------------------------

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

function UserAvatar({ avatar, name, isOnline = true }) {
  const [imgError, setImgError] = useState(false);
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "GH";

  return (
    <div className="relative shrink-0">
      {avatar && !imgError ? (
        <img
          src={avatar}
          alt={name}
          onError={() => setImgError(true)}
          className="h-[56px] w-[56px] rounded-full object-cover border border-[#232336]"
        />
      ) : (
        <div className="grid h-[56px] w-[56px] place-items-center rounded-full bg-[#885CF6]/20 font-bold text-base text-[#885CF6] border border-[#232336]">
          {initials}
        </div>
      )}

      {isOnline && (
        <span className="absolute bottom-0.5 right-0.5 h-[10px] w-[10px] rounded-full bg-[#22C55E] ring-2 ring-[#11121A]" />
      )}
    </div>
  );
}

export default function TeammateCard({ teammate, onConnect, connectionStatus }) {
  if (!teammate) return null;

  const {
    name = "Developer",
    bio = "",
    location = "",
    avatar = "",
    username = "",
    availability = "available",
  } = teammate;

  const currentLocation = useLocation();
  const navigate = useNavigate();
  const userId = teammate.id || teammate._id;
  const isOnline = availability === "available" || availability === "online";

  // Derive role
  const role =
    teammate.role ||
    teammate.profile?.role ||
    (teammate.domain ? (Array.isArray(teammate.domain) ? teammate.domain[0] : teammate.domain) : "Full Stack Developer");

  // Normalize skills (array or comma string)
  const rawSkills = teammate.skills || teammate.profile?.skills || [];
  const skillsList = Array.isArray(rawSkills)
    ? rawSkills
    : typeof rawSkills === "string"
    ? rawSkills.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const MAX_SKILLS = 3;
  const visibleSkills = skillsList.slice(0, MAX_SKILLS);
  const overflowSkillsCount = Math.max(0, skillsList.length - MAX_SKILLS);

  const realBio = bio || teammate.profile?.bio || "";
  const realLocation = location || teammate.profile?.location || "";

  return (
    <article
      className="
        group
        flex
        flex-col
        justify-between
        rounded-[16px]
        border
        border-neutral-200
        bg-white
        shadow-xs
        dark:border-neutral-800
        dark:bg-neutral-900
        p-[20px]
        transition-all
        duration-200
        hover:border-neutral-300
        dark:hover:border-neutral-700
      "
    >
      <div className="space-y-4">
        {/* ── Header: Avatar + Identity ── */}
        <div className="flex items-center gap-3.5">
          <Link
            to={userId ? `/profile/${userId}` : "#"}
            state={{ from: currentLocation }}
            aria-label={`View ${name}'s profile`}
            className="shrink-0 transition-opacity hover:opacity-90"
          >
            <UserAvatar avatar={avatar} name={name} isOnline={isOnline} />
          </Link>

          <div className="min-w-0 flex-1 space-y-0.5">
            <h3 className="truncate text-[16px] font-semibold text-neutral-900 dark:text-white leading-tight">
              <Link
                to={userId ? `/profile/${userId}` : "#"}
                state={{ from: currentLocation }}
                className="transition-colors hover:text-indigo-600 dark:hover:text-[#885CF6]"
              >
                {name}
              </Link>
            </h3>

            <p className="truncate text-[14px] font-medium text-indigo-600 dark:text-[#885CF6]">
              {role}
            </p>

            {realLocation && (
              <p className="flex items-center gap-1 truncate text-[12px] font-normal text-neutral-500 dark:text-[#A1A1AA] pt-0.5">
                <svg
                  className="h-3 w-3 shrink-0 text-neutral-400 dark:text-[#A1A1AA]"
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
                <span className="truncate">{realLocation}</span>
              </p>
            )}
          </div>
        </div>

        {/* ── Bio Section (Real Data Only) ── */}
        {realBio && (
          <p className="text-[14px] font-normal text-neutral-600 dark:text-[#D1D5DB] leading-relaxed line-clamp-2">
            {realBio}
          </p>
        )}

        {/* ── Skills Section ── */}
        {visibleSkills.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Skills
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {visibleSkills.map((skill) => (
                <span
                  key={skill}
                  className="
                    inline-flex
                    items-center
                    rounded-md
                    border
                    border-neutral-200/80
                    bg-neutral-100/80
                    px-2.5
                    py-1
                    text-[11px]
                    font-medium
                    text-neutral-700
                    transition-colors
                    duration-150
                    hover:border-indigo-500/30
                    hover:text-indigo-600
                    dark:border-neutral-700/50
                    dark:bg-neutral-800/60
                    dark:text-neutral-300
                    dark:hover:border-indigo-500/30
                    dark:hover:text-indigo-400
                  "
                >
                  {skill}
                </span>
              ))}

              {overflowSkillsCount > 0 && (
                <span
                  className="
                    inline-flex
                    items-center
                    rounded-md
                    border
                    border-neutral-200/80
                    bg-neutral-100/80
                    px-2.5
                    py-1
                    text-[11px]
                    font-medium
                    text-neutral-500
                    dark:border-neutral-700/50
                    dark:bg-neutral-800/60
                    dark:text-neutral-400
                  "
                >
                  +{overflowSkillsCount}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer Actions ── */}
      <div className="mt-5 flex items-center gap-2.5 pt-2">
        <Link
          to={`/profile/${userId}`}
          state={{ from: currentLocation }}
          className="
            group/btn
            flex-1
            h-10
            inline-flex
            items-center
            justify-center
            gap-2
            rounded-lg
            bg-indigo-600
            px-4
            text-xs
            font-semibold
            text-white
            shadow-2xs
            transition-all
            duration-150
            hover:bg-indigo-500
            active:scale-[0.99]
            dark:bg-indigo-500
            dark:hover:bg-indigo-400
          "
        >
          <svg
            className="h-4 w-4 text-white/90 transition-transform duration-150 group-hover/btn:translate-x-0.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>View Profile</span>
        </Link>

        {connectionStatus === "accepted" || connectionStatus === "connected" ? (
          <button
            type="button"
            disabled
            className="
              group/btn
              flex-1
              h-10
              inline-flex
              items-center
              justify-center
              gap-2
              rounded-lg
              border
              border-neutral-200/90
              bg-neutral-100/70
              px-4
              text-xs
              font-semibold
              text-emerald-600
              cursor-not-allowed
              opacity-90
              dark:border-neutral-700/80
              dark:bg-neutral-800/70
              dark:text-emerald-400
            "
          >
            <svg
              className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Connected</span>
          </button>
        ) : connectionStatus === "pending" ? (
          <button
            type="button"
            disabled
            className="
              group/btn
              flex-1
              h-10
              inline-flex
              items-center
              justify-center
              gap-2
              rounded-lg
              border
              border-neutral-200/90
              bg-neutral-100/70
              px-4
              text-xs
              font-semibold
              text-neutral-500
              cursor-not-allowed
              opacity-80
              dark:border-neutral-700/80
              dark:bg-neutral-800/70
              dark:text-neutral-400
            "
          >
            <svg
              className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Request Sent</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => (onConnect ? onConnect(teammate) : navigate(userId ? `/profile/${userId}` : "#", { state: { from: currentLocation } }))}
            className="
              group/btn
              flex-1
              h-10
              inline-flex
              items-center
              justify-center
              gap-2
              rounded-lg
              border
              border-neutral-200/90
              bg-neutral-100/70
              px-4
              text-xs
              font-semibold
              text-neutral-700
              transition-all
              duration-150
              hover:border-indigo-500/40
              hover:bg-indigo-500/10
              hover:text-indigo-600
              dark:border-neutral-700/80
              dark:bg-neutral-800/70
              dark:text-neutral-200
              dark:hover:border-indigo-500/40
              dark:hover:bg-indigo-500/15
              dark:hover:text-indigo-300
            "
          >
            <svg
              className="h-4 w-4 text-neutral-500 transition-colors duration-150 group-hover/btn:text-indigo-600 dark:text-neutral-400 dark:group-hover/btn:text-indigo-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            <span>Connect</span>
          </button>
        )}
      </div>
    </article>
  );
}
