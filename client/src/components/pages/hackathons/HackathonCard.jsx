// ---------------------------------------------------------------------------
// HackathonCard — discovery page version
// Clean information hierarchy: urgency-aware deadline, mode, tech tags, prize
// ---------------------------------------------------------------------------

// Accent → text color mapping (Tailwind v4 safe classes)
const ACCENT_TEXT = {
  indigo:  "text-indigo-500",
  emerald: "text-emerald-500",
  amber:   "text-amber-500",
  rose:    "text-rose-500",
  sky:     "text-sky-500",
  violet:  "text-violet-500",
};

const ACCENT_BG_SOFT = {
  indigo:  "bg-indigo-500/10",
  emerald: "bg-emerald-500/10",
  amber:   "bg-amber-500/10",
  rose:    "bg-rose-500/10",
  sky:     "bg-sky-500/10",
  violet:  "bg-violet-500/10",
};

// ---------------------------------------------------------------------------
// Deadline utilities
// ---------------------------------------------------------------------------

function getDeadlineInfo(isoDate, registrationOpen) {
  if (!registrationOpen) {
    return { label: "Registration closed", urgency: "closed" };
  }

  const now = new Date();
  const deadline = new Date(isoDate);
  const msLeft = deadline - now;
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

  if (msLeft <= 0) {
    return { label: "Registration closed", urgency: "closed" };
  }
  if (daysLeft <= 1) {
    return { label: "Closes today", urgency: "urgent" };
  }
  if (daysLeft <= 7) {
    return { label: `${daysLeft} days left`, urgency: "soon" };
  }
  if (daysLeft <= 14) {
    return { label: `${daysLeft} days left`, urgency: "normal" };
  }

  // Format as "Closes Aug 22"
  const formatted = deadline.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
  });
  return { label: `Closes ${formatted}`, urgency: "neutral" };
}

const URGENCY_CLASSES = {
  closed:  "text-neutral-400 dark:text-neutral-600",
  urgent:  "text-amber-600 font-semibold dark:text-amber-400",
  soon:    "text-amber-600 dark:text-amber-400",
  normal:  "text-neutral-600 dark:text-neutral-400",
  neutral: "text-neutral-500 dark:text-neutral-500",
};

// ---------------------------------------------------------------------------
// Mode badge
// ---------------------------------------------------------------------------

function ModeBadge({ mode, location }) {
  const isOnline = mode === "Online";
  const isOffline = mode === "Offline";

  return (
    <span className="inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
      {isOnline && (
        <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      )}
      {isOffline && (
        <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      )}
      {!isOnline && !isOffline && (
        <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8" />
          <path d="M12 17v4" />
        </svg>
      )}
      <span>{mode}{location ? ` · ${location}` : ""}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// HackathonCard
// ---------------------------------------------------------------------------

function HackathonCard({ hackathon }) {
  const {
    name,
    organizer,
    mode,
    location,
    registrationDeadline,
    registrationOpen,
    prize,
    participants,
    tags = [],
    accent = "indigo",
    url = "#",
  } = hackathon;

  const accentText = ACCENT_TEXT[accent] || ACCENT_TEXT.indigo;
  const accentBgSoft = ACCENT_BG_SOFT[accent] || ACCENT_BG_SOFT.indigo;
  const initial = name.charAt(0).toUpperCase();
  const { label: deadlineLabel, urgency } = getDeadlineInfo(
    registrationDeadline,
    registrationOpen
  );
  const isClosed = urgency === "closed";
  const visibleTags = tags.slice(0, 4);
  const extraTags = tags.length - visibleTags.length;

  return (
    <article
      className={`
        group
        flex
        flex-col

        rounded-xl

        border
        border-neutral-200

        bg-white

        transition-shadow
        duration-200

        hover:shadow-md
        hover:shadow-neutral-900/6

        dark:border-neutral-800
        dark:bg-neutral-900
        dark:hover:shadow-neutral-950/30

        ${isClosed ? "opacity-75" : ""}
      `}
    >
      <div className="flex flex-col gap-4 p-5">
        {/* ── Header: logo + name + organizer ── */}
        <div className="flex items-start gap-3">
          {/* Logo initial */}
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

          {/* Name + organizer */}
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[15px] font-semibold leading-snug text-neutral-900 dark:text-white">
              {name}
            </h3>
            <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
              {organizer}
            </p>
          </div>

          {/* Registration status indicator */}
          {registrationOpen && !isClosed && (
            <span className="mt-0.5 shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              Open
            </span>
          )}
        </div>

        {/* ── Tech tags ── */}
        {visibleTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="
                  rounded
                  bg-neutral-100
                  px-2
                  py-0.5
                  text-xs
                  font-medium
                  text-neutral-600
                  dark:bg-neutral-800
                  dark:text-neutral-400
                "
              >
                {tag}
              </span>
            ))}
            {extraTags > 0 && (
              <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
                +{extraTags}
              </span>
            )}
          </div>
        )}

        {/* ── Mode + deadline row ── */}
        <div className="flex items-center justify-between gap-3">
          <ModeBadge mode={mode} location={location} />

          <span className={`shrink-0 text-xs ${URGENCY_CLASSES[urgency]}`}>
            {deadlineLabel}
          </span>
        </div>
      </div>

      {/* ── Footer: prize + CTA ── */}
      <div
        className="
          mt-auto
          flex
          items-center
          justify-between
          border-t
          border-neutral-100
          px-5
          py-3.5
          dark:border-neutral-800
        "
      >
        {/* Prize */}
        <div>
          {prize ? (
            <>
              <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                Prize
              </p>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                {prize}
              </p>
            </>
          ) : participants ? (
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              {participants.toLocaleString()} joined
            </p>
          ) : null}
        </div>

        {/* CTA */}
        <a
          href={url}
          className={`
            inline-flex
            items-center
            gap-1.5
            rounded-lg
            px-3
            py-1.5
            text-xs
            font-semibold
            transition-colors
            duration-150
            ${
              isClosed
                ? "text-neutral-400 dark:text-neutral-600 cursor-not-allowed pointer-events-none"
                : `${accentText} hover:bg-neutral-50 dark:hover:bg-white/5`
            }
          `}
          tabIndex={isClosed ? -1 : 0}
          aria-disabled={isClosed}
        >
          View hackathon
          <svg
            className="h-3 w-3 transition-transform duration-150 group-hover:translate-x-0.5"
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
        </a>
      </div>
    </article>
  );
}

export default HackathonCard;
