// ---------------------------------------------------------------------------
// HackathonCard — compact, information-first card design with Save / Bookmark
// ---------------------------------------------------------------------------

import { ACCENT_TEXT, ACCENT_BG_SOFT } from "../../../constants/themeTokens";
import { useSaved } from "../../../context/SavedContext";

// ---------------------------------------------------------------------------
// Deadline calculation
// ---------------------------------------------------------------------------

function getDeadlineText(isoDate, isOpen) {
  if (!isOpen) return "Registration closed";

  const now = new Date();
  const deadline = new Date(isoDate);
  const msLeft = deadline - now;

  if (msLeft <= 0) return "Registration closed";

  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0) return "Today";
  if (daysLeft === 1) return "1 day left";
  return `${daysLeft} days left`;
}

// ---------------------------------------------------------------------------
// Team size formatting helper
// ---------------------------------------------------------------------------

function formatTeamSize(min, max, customText) {
  if (customText) return customText;
  if (!min && !max) return "Individual / Team";
  if (min && max) {
    if (min === max) {
      return `${min} ${min === 1 ? "member" : "members"}`;
    }
    return `${min}–${max} members`;
  }
  if (min) return `Min ${min} ${min === 1 ? "member" : "members"}`;
  if (max) return `Up to ${max} ${max === 1 ? "member" : "members"}`;
  return "Individual / Team";
}

// ---------------------------------------------------------------------------
// Mode & location icon display
// ---------------------------------------------------------------------------

function ModeDisplay({ mode, location }) {
  const isOnline = mode === "Online";

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400">
      {isOnline ? (
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
          <path
            d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
          />
        </svg>
      ) : (
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
      )}
      <span>
        {mode}
        {location ? ` · ${location}` : ""}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// HackathonCard Component
// ---------------------------------------------------------------------------

function HackathonCard({ hackathon }) {
  const {
    id,
    name,
    organizer,
    mode,
    location,
    registrationDeadline,
    registrationOpen,
    fee = "Free",
    minTeamSize,
    maxTeamSize,
    teamSize,
    prize = "N/A",
    accent = "indigo",
    url = "#",
  } = hackathon;

  const { isSaved, toggleSave } = useSaved();
  const saved = id ? isSaved(id) : false;

  // Calculate actual registration availability
  const isOpen =
    Boolean(registrationOpen) && new Date(registrationDeadline) > new Date();

  const accentText = ACCENT_TEXT[accent] || ACCENT_TEXT.indigo;
  const accentBgSoft = ACCENT_BG_SOFT[accent] || ACCENT_BG_SOFT.indigo;
  const initial = name ? name.charAt(0).toUpperCase() : "H";
  const deadlineText = getDeadlineText(registrationDeadline, isOpen);
  const teamSizeLabel = formatTeamSize(minTeamSize, maxTeamSize, teamSize);

  const handleSaveToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (id) {
      toggleSave(id);
    }
  };

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
        {/* ── 1. Header: Logo + Name + Organizer & Status + Save Button ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {/* Logo / Avatar fallback */}
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

            {/* Name & Organizer */}
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[15px] font-semibold leading-snug text-neutral-900 dark:text-white">
                {name}
              </h3>
              <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                {organizer}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Registration Status Badge */}
            {isOpen ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                OPEN
              </span>
            ) : (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500" />
                CLOSED
              </span>
            )}

            {/* Save / Bookmark Button */}
            <button
              type="button"
              onClick={handleSaveToggle}
              aria-label={saved ? `Remove ${name} from saved` : `Save ${name}`}
              aria-pressed={saved}
              className={`
                grid
                h-7
                w-7
                place-items-center
                rounded-lg
                border
                transition-all
                duration-150
                focus-visible:outline
                focus-visible:outline-2
                focus-visible:outline-indigo-500
                ${
                  saved
                    ? `${accentBgSoft} ${accentText} border-transparent`
                    : "border-neutral-200 bg-neutral-50/50 text-neutral-400 hover:border-neutral-300 hover:text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-500 dark:hover:border-neutral-700 dark:hover:text-neutral-300"
                }
              `}
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill={saved ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── 2. Meta row: Online/Offline (Left) & Deadline (Right) ── */}
        <div className="mt-4 flex items-center justify-between gap-2 text-xs">
          <ModeDisplay mode={mode} location={location} />

          <span
            className={`shrink-0 font-medium ${
              isOpen
                ? "text-neutral-600 dark:text-neutral-400"
                : "text-neutral-400 dark:text-neutral-500"
            }`}
          >
            {deadlineText}
          </span>
        </div>

        {/* ── 3. Team Size & Registration Fee ── */}
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-neutral-100 pt-3.5 dark:border-neutral-800/80">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              TEAM SIZE
            </p>
            <p className="mt-0.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              {teamSizeLabel}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              REGISTRATION FEE
            </p>
            <p className="mt-0.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              {fee}
            </p>
          </div>
        </div>
      </div>

      {/* ── 4. Footer: Prize (Left) & View Hackathon CTA (Right) ── */}
      <div className="mt-4 flex items-end justify-between gap-3 border-t border-neutral-100 pt-3.5 dark:border-neutral-800/80">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            PRIZE
          </p>
          <p className="mt-0.5 text-sm font-semibold text-neutral-900 dark:text-white">
            {prize}
          </p>
        </div>

        <a
          href={url}
          className="
            inline-flex
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
          <span>View Hackathon</span>
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
        </a>
      </div>
    </article>
  );
}

export default HackathonCard;
