// ---------------------------------------------------------------------------
// NetworkUserCard.jsx — Shared Card Component for My Network
// Reusable across Connections, Incoming Requests, and Sent Requests
// ---------------------------------------------------------------------------

import { useState } from "react";
import { Link } from "react-router-dom";

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

  if (avatar && !imgError) {
    return (
      <img
        src={avatar}
        alt={name}
        onError={() => setImgError(true)}
        className="h-11 w-11 shrink-0 rounded-xl object-cover border border-neutral-200 shadow-2xs dark:border-neutral-800"
      />
    );
  }

  return (
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-500/10 text-xs font-bold text-indigo-600 border border-neutral-200 dark:border-neutral-800 dark:bg-indigo-500/20 dark:text-indigo-400">
      {initials}
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
    role = "Developer",
    skills = [],
    location = "",
    avatar = "",
    note = "",
    createdAt = "",
    connectedAt = "",
  } = person;

  const profileTargetId = userId || fromUserId || toUserId || id || person._id;
  const getHackId = username ? `@${username}` : `GH-${(profileTargetId || "").slice(-6).toUpperCase()}`;

  const MAX_SKILLS = 3;
  const visibleSkills = Array.isArray(skills) ? skills.slice(0, MAX_SKILLS) : [];
  const hiddenCount = Array.isArray(skills) ? Math.max(0, skills.length - MAX_SKILLS) : 0;

  const isIncoming = variant === "incoming-request";
  const isSent = variant === "sent-request";
  const isConnection = variant === "connection";

  const dateLabel = isIncoming
    ? `Wants to connect`
    : isSent
    ? `Request sent · ${createdAt || "Recently"}`
    : "";

  return (
    <div
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
        shadow-2xs
        transition-all
        duration-150
        hover:border-neutral-300
        hover:shadow-xs
        dark:border-neutral-800
        dark:bg-neutral-900
        dark:hover:border-neutral-700
      "
    >
      <div className="space-y-3.5">
        {/* ── Header: Avatar + Identity + Status ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3.5">
            <UserAvatar avatar={avatar} name={name} />

            <div className="min-w-0 flex-1 space-y-0.5">
              <h3 className="truncate text-sm font-bold text-neutral-900 dark:text-white">
                {name}
              </h3>

              <p className="truncate text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {role}
              </p>

              <p className="font-mono text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
                getHack ID: {getHackId}
              </p>
            </div>
          </div>

          {/* Right Status Badge for Requests */}
          {!isConnection && (
            <span className="shrink-0 text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
              {dateLabel}
            </span>
          )}
        </div>

        {/* ── Skills Chips ── */}
        {visibleSkills.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {visibleSkills.map((sk) => (
              <span
                key={sk}
                className="
                  rounded-md
                  bg-neutral-100
                  px-2.5
                  py-1
                  text-[11px]
                  font-medium
                  text-neutral-700
                  dark:bg-neutral-800
                  dark:text-neutral-300
                "
              >
                {sk}
              </span>
            ))}

            {hiddenCount > 0 && (
              <span className="rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                +{hiddenCount}
              </span>
            )}
          </div>
        )}

        {/* ── Optional Note Snippet (Requests) ── */}
        {note && (
          <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-2.5 text-xs text-neutral-600 dark:border-neutral-800/80 dark:bg-neutral-800/40 dark:text-neutral-300">
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">Note: </span>
            &quot;{note}&quot;
          </div>
        )}
      </div>

      {/* ── Card Footer Actions ── */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3.5 dark:border-neutral-800/80">
        {/* Left Actions */}
        {isIncoming ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAccept && onAccept(person)}
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
                shadow-2xs
                transition-colors
                duration-150
                hover:bg-indigo-500
                dark:bg-indigo-500
                dark:hover:bg-indigo-400
              "
            >
              <span>Accept</span>
            </button>

            <button
              type="button"
              onClick={() => onDecline && onDecline(person)}
              className="
                inline-flex
                items-center
                gap-1.5
                rounded-lg
                border
                border-neutral-200
                bg-white
                px-3
                py-1.5
                text-xs
                font-semibold
                text-neutral-600
                transition-colors
                duration-150
                hover:bg-neutral-50
                hover:text-neutral-900
                dark:border-neutral-800
                dark:bg-neutral-900
                dark:text-neutral-400
                dark:hover:bg-neutral-800
                dark:hover:text-white
              "
            >
              <span>Decline</span>
            </button>
          </div>
        ) : isSent ? (
          <button
            type="button"
            onClick={() => onCancel && onCancel(person.id || person._id)}
            className="
              inline-flex
              items-center
              gap-1.5
              rounded-lg
              border
              border-neutral-200
              bg-white
              px-3
              py-1.5
              text-xs
              font-semibold
              text-neutral-600
              transition-colors
              duration-150
              hover:border-red-200
              hover:bg-red-50
              hover:text-red-600
              dark:border-neutral-800
              dark:bg-neutral-900
              dark:text-neutral-400
              dark:hover:border-red-900/50
              dark:hover:bg-red-950/40
              dark:hover:text-red-400
            "
          >
            <span>Cancel Request</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onMessage && onMessage(name, username)}
            className="
              inline-flex
              items-center
              gap-1.5
              rounded-lg
              border
              border-neutral-200
              bg-white
              px-3.5
              py-1.5
              text-xs
              font-semibold
              text-neutral-700
              shadow-2xs
              transition-colors
              duration-150
              hover:bg-neutral-50
              hover:text-neutral-950
              dark:border-neutral-800
              dark:bg-neutral-900
              dark:text-neutral-300
              dark:hover:bg-neutral-800
              dark:hover:text-white
            "
          >
            <svg className="h-3.5 w-3.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Message</span>
          </button>
        )}

        {/* Right Action: View Profile */}
        <Link
          to={`/profile/${profileTargetId}`}
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
            className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
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
  );
}
