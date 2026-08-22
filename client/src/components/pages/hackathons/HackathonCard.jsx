// ---------------------------------------------------------------------------
// HackathonCard — compact, information-first card design with Save / Bookmark
// Displays Platform, Themes, Prize Pool & Deadline. Zero Mode/Fee/TeamSize/Eligibility fields.
// ---------------------------------------------------------------------------

import { Link } from "react-router-dom";
import { ACCENT_TEXT, ACCENT_BG_SOFT } from "../../../constants/themeTokens";
import { useSaved } from "../../../context/SavedContext";
import DeadlineDisplay from "./DeadlineDisplay";
import {
  formatPrize,
  formatOrganizer,
} from "../../../utils/hackathonFormatters";

// Platform normalization helper
function formatPlatformName(platformInput, sourceObj, urlInput) {
  let raw = platformInput;
  if (!raw && sourceObj && typeof sourceObj === "object") {
    raw = sourceObj.platform || sourceObj.name;
  }
  if (!raw && typeof sourceObj === "string") {
    raw = sourceObj;
  }
  if (!raw && urlInput && typeof urlInput === "string") {
    raw = urlInput;
  }

  if (!raw || typeof raw !== "string") return null;

  const str = raw.trim().toLowerCase();

  // Exclude mode values or generic placeholder strings
  if (
    str === "gethack" ||
    str === "unknown" ||
    str === "none" ||
    str === "n/a" ||
    str === "online" ||
    str === "offline" ||
    str === "hybrid"
  ) {
    return null;
  }

  // Known platform matches
  if (str.includes("unstop")) return "Unstop";
  if (str.includes("devpost")) return "Devpost";
  if (str.includes("devfolio")) return "Devfolio";
  if (str.includes("dorahacks")) return "DoraHacks";
  if (str.includes("hackerearth")) return "HackerEarth";
  if (str.includes("kaggle")) return "Kaggle";
  if (str.includes("mlh") || str.includes("major league hacking")) return "MLH";
  if (str.includes("hack2skill")) return "Hack2Skill";

  // If URL string passed, attempt hostname matching
  if (str.startsWith("http://") || str.startsWith("https://")) {
    try {
      const host = new URL(raw).hostname.replace(/^www\./, "");
      if (host.includes("unstop")) return "Unstop";
      if (host.includes("devpost")) return "Devpost";
      if (host.includes("devfolio")) return "Devfolio";
      if (host.includes("dorahacks")) return "DoraHacks";
      if (host.includes("hackerearth")) return "HackerEarth";
      if (host.includes("kaggle")) return "Kaggle";
      if (host.includes("mlh")) return "MLH";
      if (host.includes("hack2skill")) return "Hack2Skill";
      return null;
    } catch {
      return null;
    }
  }

  // Capitalize clean single word platform if valid string
  if (raw.length <= 25 && !raw.includes("/") && !raw.includes("http")) {
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  return null;
}

// Clean & deduplicated themes extractor
function getCleanThemes(hackathon) {
  const raw = Array.isArray(hackathon.themes) && hackathon.themes.length > 0
    ? hackathon.themes
    : Array.isArray(hackathon.tags) && hackathon.tags.length > 0
    ? hackathon.tags
    : Array.isArray(hackathon.skills) && hackathon.skills.length > 0
    ? hackathon.skills
    : [];

  if (!Array.isArray(raw) || raw.length === 0) return [];

  const seen = new Set();
  const unique = [];

  for (const item of raw) {
    if (typeof item === "string" && item.trim().length > 0) {
      const clean = item.trim();
      const key = clean.toLowerCase();
      if (
        key !== "online" &&
        key !== "offline" &&
        key !== "hybrid" &&
        key !== "hackathon" &&
        !seen.has(key)
      ) {
        seen.add(key);
        unique.push(clean);
      }
    }
  }

  return unique;
}

function HackathonCard({ hackathon }) {
  const id = hackathon.id || hackathon._id;
  const name = typeof hackathon.name === "string" ? hackathon.name : typeof hackathon.title === "string" ? hackathon.title : "Untitled Hackathon";
  const organizer = formatOrganizer(hackathon.organizerName, hackathon.organizer);

  const registrationDeadline = hackathon.registrationDeadline || hackathon.registration?.deadline;
  const registrationOpen = hackathon.registrationOpen ?? (registrationDeadline ? new Date(registrationDeadline) > new Date() : true);

  const prize = formatPrize(hackathon.prizePool, hackathon.prizes, hackathon.prize);

  const source = hackathon.source || {};
  const rawPlatform = typeof source === "object" ? source.platform : hackathon.platform;
  const externalUrl = typeof source === "object" ? source.externalUrl : hackathon.url || hackathon.registrationUrl;
  const formattedPlatform = formatPlatformName(rawPlatform, source, externalUrl);

  const allThemes = getCleanThemes(hackathon);
  const displayThemes = allThemes.slice(0, 3);
  const remainingThemesCount = allThemes.length - 3;

  const accent = hackathon.accent || "indigo";

  const { isSaved, toggleSave } = useSaved();
  const saved = id ? isSaved(id) : false;

  const isOpen =
    Boolean(registrationOpen) &&
    Boolean(registrationDeadline) &&
    new Date(registrationDeadline) > new Date();

  const mode = hackathon.format || hackathon.event?.mode || hackathon.mode || null;
  const minTeam = hackathon.minTeamSize || hackathon.teamSize?.min || 1;
  const maxTeam = hackathon.maxTeamSize || hackathon.teamSize?.max || 4;
  const teamSizeStr = minTeam === maxTeam ? `${minTeam} Member${minTeam > 1 ? "s" : ""}` : `${minTeam}–${maxTeam} Members`;

  const accentText = ACCENT_TEXT[accent] || ACCENT_TEXT.indigo;
  const accentBgSoft = ACCENT_BG_SOFT[accent] || ACCENT_BG_SOFT.indigo;
  const initial = name ? name.charAt(0).toUpperCase() : "H";

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

          <div className="flex shrink-0 items-center gap-1.5">
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

            {/* Mode Badge */}
            {mode && (
              <span className="inline-flex shrink-0 items-center rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                {mode}
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

        {/* ── 2. Platform ── */}
        {formattedPlatform && (
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            Hosted on <span className="font-semibold text-neutral-700 dark:text-neutral-200">{formattedPlatform}</span>
          </p>
        )}

        {/* ── 3. Themes ── */}
        {displayThemes.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {displayThemes.map((theme, idx) => (
              <span
                key={idx}
                className="max-w-[130px] truncate rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                title={theme}
              >
                {theme}
              </span>
            ))}
            {remainingThemesCount > 0 && (
              <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[11px] font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                +{remainingThemesCount}
              </span>
            )}
          </div>
        )}

        {/* ── 4. Stats Row: Team Size & Prize ── */}
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-neutral-100 pt-3.5 dark:border-neutral-800/80">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              TEAM SIZE
            </p>
            <p className="mt-0.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              {teamSizeStr}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              PRIZE
            </p>
            <p className="mt-0.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              {prize}
            </p>
          </div>
        </div>
      </div>

      {/* ── 5. Footer: Deadline (Left) & View Details CTA (Right) ── */}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-neutral-100 pt-3.5 dark:border-neutral-800/80">
        <DeadlineDisplay
          registrationDeadline={registrationDeadline}
          registrationOpen={registrationOpen}
        />

        <Link
          to={`/hackathons/${id}`}
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
          <span>View Details</span>
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

export default HackathonCard;
