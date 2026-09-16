
// HackathonCard — compact, information-first card design with Save / Bookmark
// Displays Platform, Themes, Prize Pool & Deadline. Zero Mode/Fee/TeamSize/Eligibility fields.


import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ACCENT_TEXT, ACCENT_BG_SOFT } from "../../../constants/themeTokens";
import { useSaved } from "../../../context/SavedContext";
import { useAuth } from "../../../context/useAuth";
import DeadlineDisplay from "./DeadlineDisplay";
import {
  formatPrize,
  formatOrganizer,
  getHackathonRegistrationStatus,
  formatDate,
  getHackathonImage,
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

function HackathonCard({ hackathon }) {
  const currentLocation = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const id = hackathon.id || hackathon._id;
  const name = typeof hackathon.name === "string" ? hackathon.name : typeof hackathon.title === "string" ? hackathon.title : "Untitled Hackathon";
  const organizer = formatOrganizer(hackathon.organizerName, hackathon.organizer);

  const registrationDeadline = hackathon.registrationDeadline || hackathon.registration?.deadline;
  const registrationOpen = hackathon.registrationOpen ?? (registrationDeadline ? new Date(registrationDeadline) > new Date() : true);

  const prize = formatPrize(hackathon.prizePool, hackathon.prizes, hackathon.prize);

  const rawStartDate =
    hackathon.startDate ||
    hackathon.event?.startDate ||
    hackathon.eventStartDate ||
    hackathon.hackathonDate ||
    hackathon.dates?.start;
  const startDateFormatted = formatDate(rawStartDate);

  const source = hackathon.source || {};
  const rawPlatform = hackathon.hostedOn || (typeof source === "object" ? source.platform : hackathon.platform);
  const externalUrl = typeof source === "object" ? source.externalUrl : hackathon.url || hackathon.registrationUrl;
  const formattedPlatform = formatPlatformName(rawPlatform, source, externalUrl);

  const [imgError, setImgError] = useState(false);
  const logoUrl = getHackathonImage(hackathon);

  const accent = hackathon.accent || "indigo";

  const { isSaved, toggleSave } = useSaved();
  const saved = id ? isSaved(id) : false;

  const status = getHackathonRegistrationStatus(hackathon);

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

  const handleViewDetails = (e) => {
    e.preventDefault();
    if (!id) return;
    navigate(`/hackathons/${id}`, { state: { from: currentLocation } });
  };

  return (
    <article
      className="
        group
        flex
        w-full
        max-w-full
        min-w-0
        h-full
        flex-col
        justify-between
        rounded-xl
        border
        border-neutral-200
        bg-white
        p-3.5
        sm:p-5
        transition-shadow
        duration-150
        hover:border-neutral-300
        hover:shadow-md
        hover:shadow-neutral-950/5
        dark:border-neutral-800
        dark:bg-neutral-900
        dark:hover:border-neutral-700
        dark:hover:shadow-neutral-950/30
      "
    >
      <div className="min-w-0 w-full">
        {/* ── 1. Header: Logo + Name + Organizer & Status + Save Button ── */}
        <div className="flex items-start justify-between gap-2 sm:gap-3 min-w-0">
          <div className="flex min-w-0 flex-1 items-start gap-2 sm:gap-3">
            {/* Logo / Avatar fallback */}
            <Link
              to={id ? `/hackathons/${id}` : "#"}
              onClick={handleViewDetails}
              state={{ from: currentLocation }}
              aria-label={`View details for ${name}`}
              className="shrink-0 transition-opacity hover:opacity-90"
            >
              {logoUrl && !imgError ? (
                <img
                  src={logoUrl}
                  alt={organizer ? `${organizer} logo` : `${name} hackathon`}
                  onError={() => setImgError(true)}
                  className="h-9 w-9 shrink-0 rounded-lg object-cover max-w-full"
                />
              ) : (
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
              )}
            </Link>

            {/* Name & Organizer */}
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[15px] font-semibold leading-snug text-neutral-900 dark:text-white">
                <Link
                  to={id ? `/hackathons/${id}` : "#"}
                  onClick={handleViewDetails}
                  state={{ from: currentLocation }}
                  title={name}
                  className="block truncate hover:text-[#2563EB] dark:hover:text-blue-400"
                >
                  {name}
                </Link>
              </h3>
              {organizer && (
                <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                  {organizer}
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            {/* Registration Status Badge */}
            {status === "UPCOMING" ? (
              <span className="inline-flex shrink-0 items-center gap-1 sm:gap-1.5 rounded-full bg-blue-500/10 px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                UPCOMING
              </span>
            ) : status === "OPEN" ? (
              <span className="inline-flex shrink-0 items-center gap-1 sm:gap-1.5 rounded-full bg-emerald-500/10 px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                OPEN
              </span>
            ) : (
              <span className="inline-flex shrink-0 items-center gap-1 sm:gap-1.5 rounded-full bg-neutral-100 px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
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
                shrink-0
                place-items-center
                rounded-lg
                border
                focus-visible:outline
                focus-visible:outline-2
                focus-visible:outline-indigo-500
                ${saved
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
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── 2. Platform ── */}
        {formattedPlatform && (
          <p className="mt-2 break-words text-xs text-neutral-500 dark:text-neutral-400">
            Hosted on <span className="font-semibold text-neutral-700 dark:text-neutral-200">{formattedPlatform}</span>
          </p>
        )}

        {/* ── 4. Stats: Start Date & Prize ── */}
        <div className="mt-4 border-t border-neutral-100 pt-3.5 dark:border-neutral-800/80 min-w-0">
          <div className={startDateFormatted ? "grid grid-cols-2 gap-2 sm:gap-3 min-w-0" : "block min-w-0"}>
            {startDateFormatted && (
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  EVENT DATE
                </p>
                <p className="mt-0.5 break-words text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  {startDateFormatted}
                </p>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                PRIZE
              </p>
              <p className="mt-0.5 break-words text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                {prize}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. Footer: Deadline (Left) & View Details CTA (Right) ── */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 border-t border-neutral-100 pt-3.5 dark:border-neutral-800/80 min-w-0 w-full">
        <div className="min-w-0 flex-1">
          <DeadlineDisplay
            registrationDeadline={registrationDeadline}
            registrationOpen={registrationOpen}
          />
        </div>

        <button
          type="button"
          onClick={handleViewDetails}
          aria-label={`View details for ${name}`}
          className="
            inline-flex
            shrink-0
            items-center
            justify-center
            rounded-lg
            bg-[#2563EB]
            px-3.5
            py-2
            sm:py-1.5
            text-xs
            font-semibold
            text-white
            shadow-xs
            cursor-pointer
            hover:bg-[#1d4ed8]
            active:bg-[#1e40af]
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-[#2563EB]
            focus-visible:ring-offset-2
            dark:bg-[#2563EB]
            dark:hover:bg-[#1d4ed8]
          "
        >
          View Details
        </button>
      </div>
    </article>
  );
}

export default HackathonCard;
