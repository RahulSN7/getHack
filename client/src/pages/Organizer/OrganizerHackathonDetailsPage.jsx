// ---------------------------------------------------------------------------
// OrganizerHackathonDetailsPage.jsx — Dedicated Organizer Hackathon View
// Route: /organizer/hackathons/:id
// Reuses exact getHack participant details UI design language + Organizer actions.
// Enforces strict ownership check via GET /api/hackathons/organizer/:id.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ACCENT_BG_SOFT, ACCENT_TEXT } from "../../constants/themeTokens";
import DeadlineDisplay from "../../components/pages/hackathons/DeadlineDisplay";
import { hackathonService } from "../../services/hackathonService";

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

function OrganizerHackathonDetailsPage() {
  const { id } = useParams();

  const [hackathon, setHackathon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadOrganizerHackathon() {
      try {
        setLoading(true);
        setError(null);
        const data = await hackathonService.getOrganizerHackathonById(id);
        if (isMounted && data?.hackathon) {
          const h = data.hackathon;
          setHackathon({
            ...h,
            name: h.title || h.name,
            organizer: h.organizerName || (typeof h.organizer === "object" ? h.organizer.name : h.organizer) || "Organizer",
            mode: h.format || h.mode || "Online",
            location: h.location?.city ? `${h.location.city}${h.location.country ? ", " + h.location.country : ""}` : h.location || null,
            hackathonDate: h.startDate || h.hackathonDate,
            eventEndDate: h.endDate || h.eventEndDate,
            url: h.registrationUrl || h.url || "#",
            prize: h.prizes || h.prizePool || h.prize || "N/A",
            registrationOpen: h.registrationDeadline ? new Date(h.registrationDeadline) > new Date() : true,
          });
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load hackathon details.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadOrganizerHackathon();
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
            <span>Loading organizer view...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error State (Unauthorized / Permission / 404)
  if (error || !hackathon) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-20 transition-colors dark:bg-neutral-950 dark:text-neutral-100">
        <div className="mx-auto max-w-xl text-center space-y-4">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/80 dark:text-red-400">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {error || "Hackathon not found"}
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {error?.includes("permission")
              ? "You do not have permission to access the organizer view for this hackathon."
              : "The hackathon you are looking for does not exist or may have been deleted."}
          </p>
          <div className="pt-2">
            <Link
              to="/organizer/hackathons"
              className="inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
            >
              ← Back to My Hackathons
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
    prize = "N/A",
    accent = "indigo",
    url = "#",
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

  const isOpen =
    Boolean(registrationOpen) &&
    Boolean(registrationDeadline) &&
    new Date(registrationDeadline) > new Date();

  const accentText = ACCENT_TEXT[accent] || ACCENT_TEXT.indigo;
  const accentBgSoft = ACCENT_BG_SOFT[accent] || ACCENT_BG_SOFT.indigo;
  const initial = name ? name.charAt(0).toUpperCase() : "H";
  const teamSizeLabel = formatTeamSize(minTeamSize, maxTeamSize, teamSize);
  const formattedEventDate = formatDate(hackathonDate);
  const formattedEndDate = formatDate(eventEndDate);

  const themeList = Array.isArray(themes) && themes.length > 0 ? themes : tags;
  const eligibilityText =
    eligibility ||
    "Students, developers, designers, and technology enthusiasts are welcome to participate.";

  const isOnlineMode = mode === "Online" || mode === "Hybrid";
  const isOfflineMode = mode === "Offline" || mode === "Hybrid";

  const hasOnlineSpecs = isOnlineMode && (platform || duration || timezone || submission);
  const hasOfflineSpecs = isOfflineMode && (venue || address || checkIn || mapUrl);
  const hasEventDetails = hasOnlineSpecs || hasOfflineSpecs;

  return (
    <div className="min-h-screen bg-slate-50 text-neutral-900 transition-colors dark:bg-neutral-950 dark:text-neutral-100">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ── 1. Top Navigation Action ── */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/organizer/hackathons"
            className="
              group
              inline-flex
              items-center
              gap-1.5
              text-xs
              font-semibold
              text-neutral-500
              transition-colors
              hover:text-neutral-900
              dark:text-neutral-400
              dark:hover:text-white
            "
          >
            <svg
              className="h-3.5 w-3.5 transition-transform duration-150 group-hover:-translate-x-0.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
            <span>Back to My Hackathons</span>
          </Link>

          {/* Subtle Organizer View Badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50/80 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/80 dark:text-indigo-300">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
            ORGANIZER VIEW
          </span>
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
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {organizer}
                  </span>
                </p>

                {/* Status & Mode badges */}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {isOpen ? (
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

                  <span className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                    {mode === "Online" ? (
                      <svg className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10z"/></svg>
                    ) : (
                      <svg className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    )}
                    <span>
                      {mode}
                      {location ? ` · ${location}` : ""}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Organizer Action Buttons */}
            <div className="flex items-center gap-2">
              <Link
                to={`/organizer/hackathons/${id}/edit`}
                className="
                  inline-flex
                  h-9
                  items-center
                  gap-1.5
                  rounded-lg
                  bg-indigo-600
                  px-4
                  text-xs
                  font-semibold
                  text-white
                  shadow-xs
                  transition-colors
                  hover:bg-indigo-500
                  dark:bg-indigo-500
                  dark:hover:bg-indigo-400
                "
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span>Edit Hackathon</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ── 3. Quick Overview Bar ── */}
        <div className="mt-6 divide-y divide-neutral-200/80 rounded-xl border border-neutral-200/90 bg-white shadow-xs sm:grid sm:grid-cols-4 sm:divide-x sm:divide-y-0 dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
          {/* Fee */}
          <div className="px-5 py-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Registration Fee
            </span>
            <p className="mt-0.5 text-sm font-semibold text-neutral-900 dark:text-white">
              {fee}
            </p>
          </div>

          {/* Team Size */}
          <div className="px-5 py-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Team Size
            </span>
            <p className="mt-0.5 text-sm font-semibold text-neutral-900 dark:text-white">
              {teamSizeLabel}
            </p>
          </div>

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
          {/* LEFT COLUMN */}
          <div className="space-y-8 lg:col-span-2">
            {/* About Section */}
            <section className="space-y-2.5">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                About this hackathon
              </h2>
              <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                {description ||
                  "Detailed explanation of your hackathon problem statements, goals, and benefits."}
              </p>
            </section>

            {/* Themes Section */}
            {themeList.length > 0 && (
              <section className="space-y-3 border-t border-neutral-200/80 pt-6 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    THEMES
                  </h2>
                  <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                    · Focus & Topics
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {themeList.map((t) => (
                    <span
                      key={t}
                      className={`
                        inline-flex
                        items-center
                        rounded-md
                        border
                        px-3
                        py-1
                        text-xs
                        font-medium
                        transition-colors
                        ${accentBgSoft}
                        ${accentText}
                        border-transparent
                      `}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Eligibility Section */}
            <section className="space-y-3 border-t border-neutral-200/80 pt-6 dark:border-neutral-800">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                ELIGIBILITY
              </h2>
              <p className="pt-1 text-sm font-medium leading-relaxed text-neutral-800 dark:text-neutral-200">
                {eligibilityText}
              </p>
            </section>

            {/* Event Timeline Section */}
            <section className="space-y-4 border-t border-neutral-200/80 pt-6 dark:border-neutral-800">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Event Timeline
              </h2>

              <div className="relative space-y-6 border-l-2 border-neutral-200 pl-4 text-xs dark:border-neutral-800">
                <div className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-neutral-950 dark:bg-white" />
                  <p className="font-semibold text-neutral-900 dark:text-white">
                    Registration Opens
                  </p>
                  <p className="mt-0.5 text-neutral-500 dark:text-neutral-400">
                    Accepting Entries
                  </p>
                </div>

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

                <div className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-neutral-400 dark:bg-neutral-500" />
                  <p className="font-semibold text-neutral-900 dark:text-white">
                    Hackathon Begins
                  </p>
                  <p className="mt-0.5 text-neutral-500 dark:text-neutral-400">
                    {formattedEventDate || "TBA"}
                  </p>
                </div>

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

          {/* RIGHT SIDEBAR */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
              {/* Prize Pool */}
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

              {/* Specifications Section */}
              {hasEventDetails && (
                <>
                  <div className="my-5 border-t border-neutral-200/80 dark:border-neutral-800" />
                  <div>
                    <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                      EVENT DETAILS
                    </h2>

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
                      </div>
                    )}

                    {hasOfflineSpecs && (
                      <div className="space-y-2 text-xs">
                        {venue && (
                          <div className="flex items-start justify-between gap-2 py-1">
                            <span className="shrink-0 text-neutral-500 dark:text-neutral-400">Venue</span>
                            <span className="text-right font-semibold text-neutral-900 dark:text-white">{venue}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Registration Link Preview */}
              <div className="my-5 border-t border-neutral-200/80 dark:border-neutral-800" />

              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  External Registration
                </h3>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  Registration is handled on the organizer&apos;s platform.
                </p>

                <div className="mt-4">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="
                      inline-flex
                      w-full
                      items-center
                      justify-center
                      gap-2
                      rounded-lg
                      border
                      border-neutral-200
                      bg-white
                      px-4
                      py-2.5
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
                    <span>Registration Page</span>
                    <svg className="h-3.5 w-3.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default OrganizerHackathonDetailsPage;
