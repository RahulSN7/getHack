// ---------------------------------------------------------------------------
// HackathonDetailsPage — detailed view for a single hackathon (/hackathons/:id)
// Polished startup event/product information page with clean typography,
// balanced two-column layout, unified right sidebar rail, mode-specific details,
// themes, eligibility, complete timeline with end date, single prize pool, and zero duplicate data.
// ---------------------------------------------------------------------------

import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useSaved } from "../../context/SavedContext";
import { useAuth } from "../../context/useAuth";
import { ACCENT_TEXT, ACCENT_BG_SOFT } from "../../constants/themeTokens";
import DeadlineDisplay from "../../components/pages/hackathons/DeadlineDisplay";
import BackButton from "../../components/common/BackButton";
import { hackathonService } from "../../services/hackathonService";
import {
  formatTeamSize,
  formatPrize,
  formatOrganizer,
  formatLocation,
  formatFee,
  formatMode,
  getHackathonRegistrationStatus,
} from "../../utils/hackathonFormatters";

// Helper to format date string cleanly
function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
  } catch {
    return dateStr;
  }
}

// Helper to check valid HTTP/HTTPS registration URL
function isValidRegistrationUrl(urlStr) {
  if (!urlStr || typeof urlStr !== "string") return false;
  const clean = urlStr.trim();
  if (
    !clean ||
    clean === "#" ||
    clean.toLowerCase() === "none" ||
    clean.toLowerCase() === "not available" ||
    clean.toLowerCase() === "null" ||
    clean.toLowerCase() === "undefined"
  ) {
    return false;
  }
  return clean.startsWith("http://") || clean.startsWith("https://");
}

function HackathonDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { isSaved, toggleSave } = useSaved();

  const [hackathon, setHackathon] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate(`/login?redirect=/hackathons/${id}`, { replace: true });
    }
  }, [authLoading, isAuthenticated, id, navigate]);

  useEffect(() => {
    let isMounted = true;
    async function loadHackathon() {
      try {
        setLoading(true);
        // Fetch from API backend
        const data = await hackathonService.getHackathonById(id);
        if (isMounted && (data?.hackathon || data?.data)) {
          const h = data.hackathon || data.data;
          const regUrlCandidate = h.registrationUrl || h.registration?.url || (typeof h.source === "object" ? h.source?.externalUrl : h.externalUrl) || h.url || "";
          const hasValidUrl = isValidRegistrationUrl(regUrlCandidate);
          const extUrl = hasValidUrl ? regUrlCandidate.trim() : null;

          const orgStr = formatOrganizer(h.organizerName, h.organizer);
          const modeStr = formatMode(h.mode, h.format, h.event);
          const locStr = formatLocation(h.location, h.event);
          const prizeStr = formatPrize(h.prizePool, h.prizes, h.prize || "See official registration page");
          const feeStr = formatFee(h.fee, h.registrationFee);
          const teamSizeStr = formatTeamSize(h.teamSize, h.minTeamSize, h.maxTeamSize);

          setHackathon({
            ...h,
            organizerId: typeof h.organizer === "object" ? (h.organizer._id || h.organizer.ref) : (h.organizer || "org_demo"),
            name: typeof h.title === "string" ? h.title : typeof h.name === "string" ? h.name : "Untitled Hackathon",
            organizer: orgStr,
            mode: modeStr,
            location: locStr,
            hackathonDate: h.event?.startDate || h.startDate || h.hackathonDate,
            eventEndDate: h.event?.endDate || h.endDate || h.eventEndDate,
            registrationDeadline: h.registration?.deadline || h.registrationDeadline,
            registrationUrl: extUrl,
            url: extUrl,
            hasValidRegistrationUrl: hasValidUrl,
            fee: feeStr,
            teamSize: teamSizeStr,
            prize: prizeStr,
            registrationOpen: h.registration?.deadline ? new Date(h.registration.deadline) > new Date() : (h.registrationDeadline ? new Date(h.registrationDeadline) > new Date() : true),
            source: typeof h.source === "object" ? h.source : { platform: h.platform || "gethack", externalUrl: extUrl },
            platform: h.hostedOn || (typeof h.source === "object" ? h.source?.platform : typeof h.platform === "string" ? h.platform : null),
          });
          return;
        }
      } catch (error) {
        console.error("Failed to load hackathon from API:", error);
      } finally {
        if (isMounted) setLoading(false);
      }

      if (isMounted) {
        setHackathon(null);
      }
    }

    loadHackathon();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-20 transition-colors dark:bg-neutral-950 dark:text-neutral-100">
        <div className="mx-auto max-w-xl text-center">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            <svg className="h-4 w-4 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10" />
            </svg>
            <span>Loading hackathon details...</span>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 404 Not Found State
  // ---------------------------------------------------------------------------
  if (!hackathon) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-20 transition-colors dark:bg-neutral-950 dark:text-neutral-100">
        <div className="mx-auto max-w-xl text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Hackathon not found
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            The hackathon you're looking for doesn't exist or may have been removed.
          </p>
          <div className="mt-6">
            <Link
              to="/hackathons"
              className="inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
            >
              ← Back to Hackathons
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Destructure hackathon attributes
  const {
    name,
    organizer,
    mode,
    location,
    registrationDeadline,
    registrationOpen,
    hackathonDate,
    eventEndDate,
    fee = "Free",
    minTeamSize,
    maxTeamSize,
    teamSize,
    prize = "See official registration page",
    accent = "indigo",
    registrationUrl,
    hasValidRegistrationUrl,
    description,
    tags = [],
    themes,
    eligibility,
    platform,
    duration,
    timezone,
    submission,
    venue,
    address,
    checkIn,
    mapUrl,
  } = hackathon;

  const saved = isSaved(id);
  const status = getHackathonRegistrationStatus(hackathon);
  const isOpen = status === "OPEN";

  const accentText = ACCENT_TEXT[accent] || ACCENT_TEXT.indigo;
  const accentBgSoft = ACCENT_BG_SOFT[accent] || ACCENT_BG_SOFT.indigo;
  const initial = name ? name.charAt(0).toUpperCase() : "H";
  const teamSizeLabel = formatTeamSize(teamSize, minTeamSize, maxTeamSize);
  const formattedEventDate = formatDate(hackathonDate);
  const formattedEndDate = formatDate(eventEndDate);



  // Resolution for Eligibility text
  const eligibilityText =
    typeof eligibility === "string" && eligibility.trim() && eligibility !== "Not specified"
      ? eligibility
      : "Check official registration page";

  const handleSaveToggle = () => {
    toggleSave(id);
  };

  const submissionText =
    typeof submission === "string"
      ? submission
      : typeof submission === "object" && submission !== null
        ? submission.platform || submission.url || (submission.deadline ? formatDate(submission.deadline) : null)
        : null;

  // Check if any event details specs exist
  const hasOnlineSpecs = Boolean(platform || duration || timezone || submissionText);
  const hasOfflineSpecs = Boolean(venue || address || checkIn || mapUrl);
  const hasEventDetails = hasOnlineSpecs || hasOfflineSpecs;

  return (
    <div className="min-h-screen bg-slate-50 text-neutral-900 transition-colors dark:bg-neutral-950 dark:text-neutral-100">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ── 1. Back Navigation ── */}
        <div className="mb-6">
          <BackButton fallbackPath="/hackathons" />
        </div>

        {/* ── 2. Identity Header Section ── */}
        <div className="rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              {/* Avatar logo */}
              <div
                className={`
                  grid
                  h-12
                  w-12
                  shrink-0
                  place-items-center
                  rounded-xl
                  text-lg
                  font-bold
                  shadow-2xs
                  ring-1
                  ring-black/5
                  dark:ring-white/10
                  ${accentBgSoft}
                  ${accentText}
                `}
              >
                {initial}
              </div>

              {/* Title & Metadata */}
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl dark:text-white">
                  {name}
                </h1>
                <p className="mt-1 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  Organized by{" "}
                  <Link
                    to={`/organizer/${hackathon?.organizerId || hackathon?.organizer || "org_demo"}/profile`}
                    className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    {organizer}
                  </Link>
                </p>

                {/* Status & Location badge */}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {status === "UPCOMING" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      Upcoming
                    </span>
                  ) : status === "OPEN" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Registration Open
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500" />
                      Registration Closed
                    </span>
                  )}

                 
                </div>
              </div>
            </div>

            {/* Save / Bookmark Button */}
            <button
              type="button"
              onClick={handleSaveToggle}
              aria-label={saved ? `Remove ${name} from saved` : `Save ${name}`}
              aria-pressed={saved}
              className={`
                inline-flex
                h-9
                items-center
                justify-center
                gap-1.5
                rounded-lg
                border
                px-3.5
                text-xs
                font-semibold
                transition-all
                duration-150
                focus-visible:outline
                focus-visible:outline-2
                focus-visible:outline-indigo-500
                ${
                  saved
                    ? `${accentBgSoft} ${accentText} border-transparent`
                    : "border-neutral-200 bg-neutral-50/50 text-neutral-700 hover:border-neutral-300 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:text-white"
                }
              `}
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill={saved ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              <span>{saved ? "Saved" : "Save"}</span>
            </button>
          </div>
        </div>

        {/* ── 3. Quick Overview Bar (2 Columns: Deadline & Event Date) ── */}
        <div className="mt-6 divide-y divide-neutral-200/80 rounded-xl border border-neutral-200/90 bg-white shadow-xs sm:grid sm:grid-cols-2 sm:divide-x sm:divide-y-0 dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
          {/* Deadline */}
          <div className="px-5 py-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Registration Deadline
            </span>
            <div className="mt-0.5">
              <DeadlineDisplay
                registrationDeadline={registrationDeadline}
                registrationOpen={registrationOpen}
              />
            </div>
          </div>

          {/* Event Date */}
          <div className="px-5 py-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Event Date
            </span>
            <p className="mt-0.5 text-sm font-semibold text-neutral-900 dark:text-white">
              {formattedEventDate || "TBA"}
            </p>
          </div>
        </div>

        {/* ── 4. Balanced Two-Column Content Layout ── */}
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* LEFT COLUMN (Main Content) */}
          <div className="space-y-8 lg:col-span-2">
            {/* About Section */}
            <section className="space-y-2.5">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                About this hackathon
              </h2>
              <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                {description ||
                  "Discover hackathons worth building for. Connect with skilled teammates, pitch ideas, and present your solution to mentors and judges."}
              </p>
            </section>



            {/* Event Timeline Section */}
            <section className="space-y-4 border-t border-neutral-200/80 pt-6 dark:border-neutral-800">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Event Timeline
              </h2>

              <div className="relative space-y-6 border-l-2 border-neutral-200 pl-4 text-xs dark:border-neutral-800">
                {/* Milestone 1: Registration Opens */}
                <div className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-neutral-950 dark:bg-white" />
                  <p className="font-semibold text-neutral-900 dark:text-white">
                    Registration Opens
                  </p>
                  <p className="mt-0.5 text-neutral-500 dark:text-neutral-400">
                    Announced & Accepting Entries
                  </p>
                </div>

                {/* Milestone 2: Registration Closes */}
                <div className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-neutral-400 dark:bg-neutral-500" />
                  <p className="font-semibold text-neutral-900 dark:text-white">
                    Registration Closes
                  </p>
                  <div className="mt-0.5">
                    <DeadlineDisplay
                      registrationDeadline={registrationDeadline}
                      registrationOpen={registrationOpen}
                    />
                  </div>
                </div>

                {/* Milestone 3: Hackathon Begins */}
                <div className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-neutral-400 dark:bg-neutral-500" />
                  <p className="font-semibold text-neutral-900 dark:text-white">
                    Hackathon Begins
                  </p>
                  <p className="mt-0.5 text-neutral-500 dark:text-neutral-400">
                    {formattedEventDate || "TBA"}
                  </p>
                </div>

                {/* Milestone 4: Hackathon Ends */}
                <div className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-neutral-400 dark:bg-neutral-500" />
                  <p className="font-semibold text-neutral-900 dark:text-white">
                    Hackathon Ends
                  </p>
                  <p className="mt-0.5 text-neutral-500 dark:text-neutral-400">
                    {formattedEndDate || formattedEventDate || "TBA"}
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT SIDEBAR (Contextual Rail) */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
              {/* 1. Single Prize Pool Representation */}
              <div>
                <div className="flex items-center justify-between text-neutral-400 dark:text-neutral-500">
                  <h2 className="text-xs font-bold uppercase tracking-wider">
                    PRIZE POOL
                  </h2>
                  <svg className="h-4 w-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                </div>
                <p className="mt-2 text-2xl font-extrabold text-neutral-900 dark:text-white">
                  {prize}
                </p>
              </div>

              {/* 2. Event Details Section */}
              {hasEventDetails && (
                <>
                  <div className="my-5 border-t border-neutral-200/80 dark:border-neutral-800" />

                  <div>
                    <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                      EVENT DETAILS
                    </h2>

                    {/* Online Specs */}
                    {hasOnlineSpecs && (
                      <div className="space-y-2 text-xs">
                        {platform && (
                          <div className="flex items-center justify-between py-1">
                            <span className="text-neutral-500 dark:text-neutral-400">Platform</span>
                            <span className="font-semibold text-neutral-900 dark:text-white">{platform}</span>
                          </div>
                        )}
                        {duration && (
                          <div className="flex items-center justify-between py-1">
                            <span className="text-neutral-500 dark:text-neutral-400">Duration</span>
                            <span className="font-semibold text-neutral-900 dark:text-white">{duration}</span>
                          </div>
                        )}
                        {timezone && (
                          <div className="flex items-center justify-between py-1">
                            <span className="text-neutral-500 dark:text-neutral-400">Timezone</span>
                            <span className="font-semibold text-neutral-900 dark:text-white">{timezone}</span>
                          </div>
                        )}
                        {submissionText && (
                          <div className="flex items-center justify-between py-1">
                            <span className="text-neutral-500 dark:text-neutral-400">Submission</span>
                            <span className="font-semibold text-neutral-900 dark:text-white">{submissionText}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Offline Specs */}
                    {hasOfflineSpecs && (
                      <div className={`space-y-2 text-xs ${hasOnlineSpecs ? "mt-4 pt-3 border-t border-neutral-200/60 dark:border-neutral-800/60" : ""}`}>
                        {venue && (
                          <div className="flex items-start justify-between gap-2 py-1">
                            <span className="shrink-0 text-neutral-500 dark:text-neutral-400">Venue</span>
                            <span className="text-right font-semibold text-neutral-900 dark:text-white">{venue}</span>
                          </div>
                        )}
                        {address && (
                          <div className="flex items-start justify-between gap-2 py-1">
                            <span className="shrink-0 text-neutral-500 dark:text-neutral-400">Address</span>
                            <span className="text-right font-medium text-neutral-800 dark:text-neutral-200">{address}</span>
                          </div>
                        )}
                        {checkIn && (
                          <div className="flex items-center justify-between py-1">
                            <span className="text-neutral-500 dark:text-neutral-400">Check-in</span>
                            <span className="font-semibold text-neutral-900 dark:text-white">{checkIn}</span>
                          </div>
                        )}
                        {mapUrl && (
                          <div className="flex items-center justify-between py-1">
                            <span className="text-neutral-500 dark:text-neutral-400">Map</span>
                            <a
                              href={mapUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                            >
                              <span>View location</span>
                              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* 3. Registration & Participation Section */}
              <div className="my-5 border-t border-neutral-200/80 dark:border-neutral-800" />

              <div>
                <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  REGISTRATION & PARTICIPATION
                </h2>
                <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                  For the latest theme, eligibility, team size, registration fee, rules, and participation requirements, visit the official registration page.
                </p>
                <div className="mt-4">
                  {hasValidRegistrationUrl ? (
                    <a
                      href={registrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="
                        flex
                        w-full
                        items-center
                        justify-center
                        gap-2
                        rounded-xl
                        bg-indigo-600
                        px-4
                        py-3
                        text-xs
                        font-semibold
                        text-white
                        shadow-xs
                        transition-all
                        hover:bg-indigo-500
                        focus-visible:outline
                        focus-visible:outline-2
                        focus-visible:outline-indigo-500
                        dark:bg-indigo-500
                        dark:hover:bg-indigo-400
                      "
                    >
                      <span>View Official Registration ↗</span>
                    </a>
                  ) : (
                    <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-100 px-4 py-3 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                      <span>Official registration link unavailable</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default HackathonDetailsPage;
