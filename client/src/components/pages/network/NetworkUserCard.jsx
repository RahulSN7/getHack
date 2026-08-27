// ---------------------------------------------------------------------------
// NetworkUserCard.jsx — Redesigned Shared Card Component for My Network
// Matches exact getHack dark theme & reference design specifications
// Shared design system with TeammateCard.jsx
// ---------------------------------------------------------------------------

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

function UserAvatar({ avatar, name }) {
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
    </div>
  );
}

export default function NetworkUserCard({
  person,
  variant = "connection", // 'connection' | 'incoming-request' | 'sent-request'
  onAccept,
  onDecline,
  onCancel,
  onMessage,
}) {
  if (!person) return null;

  const {
    id,
    userId,
    fromUserId,
    toUserId,
    name = "Participant",
    username,
    bio = "",
    role = "Full Stack Developer",
    skills = [],
    location = "",
    note = "",
    createdAt = "",
    connectedAt = "",
    mutualConnectionsCount = 0,
    mutualConnections = [],
    availability = "available",
  } = person;

  const avatar = person.avatar || person.profile?.avatar || "";

  const currentLocation = useLocation();
  const isIncoming = variant === "incoming-request";
  const isSent = variant === "sent-request";
  const isConnection = variant === "connection";

  let profileTargetId;
  if (isIncoming) {
    profileTargetId = fromUserId || person.senderId || person.fromUser?._id || userId || id || person._id;
  } else if (isSent) {
    profileTargetId = toUserId || person.receiverId || person.toUser?._id || userId || id || person._id;
  } else {
    profileTargetId = userId || id || person._id;
  }

  const isOnline = availability === "available" || availability === "online";

  const rawSkills = skills || person.profile?.skills || [];
  const skillsList = Array.isArray(rawSkills)
    ? rawSkills
    : typeof rawSkills === "string"
    ? rawSkills.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const MAX_SKILLS = 3;
  const visibleSkills = skillsList.slice(0, MAX_SKILLS);
  const overflowSkillsCount = Math.max(0, skillsList.length - MAX_SKILLS);

  const realBio = bio || person.profile?.bio || "";
  const realLocation = location || person.profile?.location || "";

  const numMutual = mutualConnectionsCount || (Array.isArray(mutualConnections) ? mutualConnections.length : 0);

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
        {/* ── 1. Header: Avatar + Identity ── */}
        <div className="flex items-center gap-3.5">
          <Link
            to={profileTargetId ? `/profile/${profileTargetId}` : "#"}
            state={{ from: currentLocation }}
            aria-label={`View ${name}'s profile`}
            className="shrink-0 transition-opacity hover:opacity-90"
          >
            <UserAvatar avatar={avatar} name={name} />
          </Link>

          <div className="min-w-0 flex-1 space-y-0.5">
            <h3 className="truncate text-[16px] font-semibold text-neutral-900 dark:text-white leading-tight">
              <Link
                to={profileTargetId ? `/profile/${profileTargetId}` : "#"}
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

        {/* ── Optional Note (Requests) ── */}
        {note && (
          <div className="rounded-xl border border-neutral-200/80 bg-neutral-50 p-3 text-xs text-neutral-600 dark:border-neutral-700/60 dark:bg-neutral-800/50 dark:text-neutral-300">
            <span className="font-semibold text-neutral-900 dark:text-white">Note: </span>
            &quot;{note}&quot;
          </div>
        )}

        {/* ── Mutual Connections Row (Network Specific) ── */}
        {numMutual > 0 && (
          <div className="flex items-center justify-between border-t border-neutral-200/80 dark:border-neutral-800 pt-3 text-[12px] text-neutral-500 dark:text-neutral-400">
            <div className="flex items-center gap-2">
              {/* Stacked mini avatars */}
              <div className="flex -space-x-2 overflow-hidden">
                <span className="inline-block h-6 w-6 rounded-full bg-indigo-600/20 ring-2 ring-white dark:ring-neutral-900 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 grid place-items-center">
                  A
                </span>
                <span className="inline-block h-6 w-6 rounded-full bg-emerald-600/20 ring-2 ring-white dark:ring-neutral-900 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 grid place-items-center">
                  R
                </span>
                <span className="inline-block h-6 w-6 rounded-full bg-purple-600/20 ring-2 ring-white dark:ring-neutral-900 text-[9px] font-bold text-purple-600 dark:text-purple-400 grid place-items-center">
                  S
                </span>
              </div>
              <span className="font-medium text-neutral-600 dark:text-neutral-400">
                {numMutual} mutual connections
              </span>
            </div>

            <svg className="h-4 w-4 text-neutral-400 dark:text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        )}
      </div>

      {/* ── Footer Actions ── */}
      <div className="mt-5 flex items-center gap-2.5 pt-2">
        {isIncoming ? (
          <div className="flex w-full items-center gap-2">
            <Link
              to={`/profile/${profileTargetId}`}
              state={{ from: currentLocation }}
              className="
                group/btn
                flex-1
                h-10
                inline-flex
                items-center
                justify-center
                gap-1.5
                rounded-lg
                bg-indigo-600
                px-3
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
              <svg className="h-4 w-4 text-white/90 transition-transform duration-150 group-hover/btn:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>View Profile</span>
            </Link>

            <button
              type="button"
              onClick={() => onAccept && onAccept(person)}
              className="
                group/btn
                flex-1
                h-10
                inline-flex
                items-center
                justify-center
                gap-1.5
                rounded-lg
                border
                border-neutral-200/90
                bg-neutral-100/70
                px-3
                text-xs
                font-semibold
                text-neutral-700
                transition-all
                duration-150
                hover:border-emerald-500/40
                hover:bg-emerald-500/10
                hover:text-emerald-600
                dark:border-neutral-700/80
                dark:bg-neutral-800/70
                dark:text-neutral-200
                dark:hover:border-emerald-500/40
                dark:hover:bg-emerald-500/15
                dark:hover:text-emerald-400
              "
            >
              <span>Accept</span>
            </button>

            <button
              type="button"
              onClick={() => onDecline && onDecline(person)}
              className="
                group/btn
                flex-1
                h-10
                inline-flex
                items-center
                justify-center
                gap-1.5
                rounded-lg
                border
                border-neutral-200/90
                bg-neutral-100/70
                px-3
                text-xs
                font-semibold
                text-neutral-700
                transition-all
                duration-150
                hover:border-red-500/40
                hover:bg-red-500/10
                hover:text-red-600
                dark:border-neutral-700/80
                dark:bg-neutral-800/70
                dark:text-neutral-200
                dark:hover:border-red-500/40
                dark:hover:bg-red-500/15
                dark:hover:text-red-400
              "
            >
              <span>Reject</span>
            </button>
          </div>
        ) : isSent ? (
          <div className="flex w-full items-center gap-2.5">
            <Link
              to={`/profile/${profileTargetId}`}
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
              <svg className="h-4 w-4 text-white/90 transition-transform duration-150 group-hover/btn:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>View Profile</span>
            </Link>

            <button
              type="button"
              onClick={() => onCancel && onCancel(person)}
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
                hover:border-red-500/40
                hover:bg-red-500/10
                hover:text-red-600
                dark:border-neutral-700/80
                dark:bg-neutral-800/70
                dark:text-neutral-200
                dark:hover:border-red-500/40
                dark:hover:bg-red-500/15
                dark:hover:text-red-400
              "
            >
              <span>Cancel Request</span>
            </button>
          </div>
        ) : (
          <div className="flex w-full items-center gap-2.5">
            <Link
              to={`/profile/${profileTargetId}`}
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
              <svg className="h-4 w-4 text-white/90 transition-transform duration-150 group-hover/btn:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>View Profile</span>
            </Link>

            <button
              type="button"
              onClick={() => onMessage && onMessage(person)}
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
              <svg className="h-4 w-4 text-neutral-500 transition-colors duration-150 group-hover/btn:text-indigo-600 dark:text-neutral-400 dark:group-hover/btn:text-indigo-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>Message</span>
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
