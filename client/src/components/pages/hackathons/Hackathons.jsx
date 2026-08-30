// ---------------------------------------------------------------------------
// Hackathons — discovery page with Filter popover, Search, Sort & Saved view
//
// Pipeline: MongoDB API → search → status filter → platform filter → format filter → saved filter → sort → grid
// All data fetched strictly from backend MongoDB endpoints. Zero mock data.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useSaved } from "../../../context/SavedContext";
import { ACCENT_TEXT, ACCENT_BG_SOFT } from "../../../constants/themeTokens";
import HackathonSearch from "./HackathonSearch";
import HackathonFilters from "./HackathonFilters";
import HackathonSort from "./HackathonSort";
import HackathonGrid from "./HackathonGrid";
import { hackathonService } from "../../../services/hackathonService";
import {
  formatTeamSize,
  formatPrize,
  formatOrganizer,
  formatLocation,
  formatFee,
  formatMode,
} from "../../../utils/hackathonFormatters";

// Helper to normalize backend DB hackathons into component contract
function normalizeHackathon(h) {
  const sourcePlatform = typeof h.source === "object" ? h.source?.platform : h.platform || "gethack";
  const externalUrl = typeof h.source === "object" ? h.source?.externalUrl : h.registration?.url || h.registrationUrl || h.url || "#";

  const nameStr = typeof h.title === "string" ? h.title : typeof h.name === "string" ? h.name : "Untitled Hackathon";
  const orgStr = formatOrganizer(h.organizerName, h.organizer);
  const modeStr = formatMode(h.mode, h.format, h.event);
  const locStr = formatLocation(h.location, h.event);
  const prizeStr = formatPrize(h.prizePool, h.prizes, h.prize || "Free");
  const feeStr = formatFee(h.fee, h.registrationFee);
  const teamSizeStr = formatTeamSize(h.teamSize, h.minTeamSize, h.maxTeamSize);

  return {
    ...h,
    id: h.id || h._id,
    name: nameStr,
    organizer: orgStr,
    mode: modeStr,
    location: locStr,
    registrationDeadline: h.registration?.deadline || h.registrationDeadline,
    hackathonDate: h.event?.startDate || h.startDate || h.hackathonDate,
    eventEndDate: h.event?.endDate || h.endDate || h.eventEndDate,
    registrationOpen: h.registration?.deadline ? new Date(h.registration.deadline) > new Date() : (h.registrationDeadline ? new Date(h.registrationDeadline) > new Date() : true),
    prize: prizeStr,
    prizeValue: typeof h.prizePool === "object" ? (h.prizePool?.amount || 0) : (typeof h.prizeValue === "number" ? h.prizeValue : 0),
    fee: feeStr,
    teamSize: teamSizeStr,
    tags: Array.isArray(h.skills) && h.skills.length ? h.skills.filter((s) => typeof s === "string") : Array.isArray(h.tags) ? h.tags.filter((t) => typeof t === "string") : ["Hackathon"],
    themes: Array.isArray(h.themes) && h.themes.length ? h.themes.filter((t) => typeof t === "string") : Array.isArray(h.tags) ? h.tags.filter((t) => typeof t === "string") : [],
    url: typeof externalUrl === "string" ? externalUrl : "#",
    description: typeof h.shortDescription === "string" ? h.shortDescription : typeof h.description === "string" ? h.description : "",
    source: typeof h.source === "object" ? h.source : { platform: sourcePlatform, externalUrl },
    platform: typeof sourcePlatform === "string" ? sourcePlatform : "gethack",
    accent: "indigo",
  };
}

// Search: match against name, organizer, tags, domain, location, platform
function applySearch(hackathons, query) {
  if (!query.trim()) return hackathons;
  const q = query.toLowerCase();
  return hackathons.filter((h) => {
    return (
      (h.name && h.name.toLowerCase().includes(q)) ||
      (h.organizer && h.organizer.toLowerCase().includes(q)) ||
      (h.domain && h.domain.toLowerCase().includes(q)) ||
      (h.location && h.location.toLowerCase().includes(q)) ||
      (h.platform && h.platform.toLowerCase().includes(q)) ||
      (h.tags && h.tags.some((tag) => tag.toLowerCase().includes(q))) ||
      (h.themes && h.themes.some((theme) => theme.toLowerCase().includes(q)))
    );
  });
}

// Status Filter
function applyStatusFilter(hackathons, statusId) {
  const now = new Date();

  switch (statusId) {
    case "registration-open":
      return hackathons.filter(
        (h) => h.registrationOpen && new Date(h.registrationDeadline) > now
      );
    case "upcoming":
      return hackathons.filter((h) => new Date(h.hackathonDate || h.startDate) > now);
    case "live":
      return hackathons.filter(
        (h) => new Date(h.hackathonDate || h.startDate) <= now && new Date(h.eventEndDate || h.endDate) >= now
      );
    case "registration-closed":
      return hackathons.filter(
        (h) => !h.registrationOpen || new Date(h.registrationDeadline) <= now
      );
    case "all":
    default:
      return hackathons;
  }
}

// Platform Filter
function applyPlatformFilter(hackathons, platformId) {
  if (!platformId || platformId === "all") return hackathons;
  const p = platformId.toLowerCase();
  return hackathons.filter(
    (h) => (h.source?.platform || h.platform || "").toLowerCase() === p
  );
}

// Saved Filter
function applySavedFilter(hackathons, showSavedOnly, isSaved) {
  if (!showSavedOnly) return hackathons;
  return hackathons.filter((h) => isSaved(h.id));
}

// Sort
function applySort(hackathons, sortId) {
  const sorted = [...hackathons];
  switch (sortId) {
    case "deadline-desc":
      return sorted.sort(
        (a, b) =>
          new Date(b.registrationDeadline || 0) - new Date(a.registrationDeadline || 0)
      );
    case "prize-desc":
      return sorted.sort((a, b) => (b.prizeValue ?? 0) - (a.prizeValue ?? 0));
    case "deadline-asc":
    default:
      return sorted.sort(
        (a, b) =>
          new Date(a.registrationDeadline || 0) - new Date(b.registrationDeadline || 0)
      );
  }
}

function Hackathons() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isParticipant = isAuthenticated && user?.role?.toLowerCase() === "participant";
  const showCreateHackathonButton = !isParticipant;

  const handleCreateHackathonClick = () => {
    if (!isAuthenticated) {
      navigate("/login?redirect=/organizer/create", { state: { from: location } });
    } else {
      navigate("/organizer/create");
    }
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [sortBy, setSortBy] = useState("deadline-asc");

  const [allHackathons, setAllHackathons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPublicHackathons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await hackathonService.getPublicHackathons({ limit: 200 });
      const items = data.data || data.hackathons || [];
      setAllHackathons(items.map(normalizeHackathon));
    } catch (err) {
      console.error("Failed to fetch hackathons from MongoDB:", err);
      setError(err.message || "We couldn't retrieve hackathons right now. Please try again.");
      setAllHackathons([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPublicHackathons();
  }, [loadPublicHackathons]);

  const { isSaved, savedCount } = useSaved();

  const hasFilters =
    searchQuery.trim() !== "" ||
    statusFilter !== "all" ||
    platformFilter !== "all" ||
    showSavedOnly;

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setPlatformFilter("all");
    setShowSavedOnly(false);
  };

  const handleApplyFilterPopover = ({ statusFilter: nextStatus, platformFilter: nextPlatform }) => {
    setStatusFilter(nextStatus);
    if (nextPlatform) setPlatformFilter(nextPlatform);
  };

  // Pipeline: search → status filter → platform filter → saved filter → sort
  const results = useMemo(() => {
    const searched = applySearch(allHackathons, searchQuery);
    const statusFiltered = applyStatusFilter(searched, statusFilter);
    const platformFiltered = applyPlatformFilter(statusFiltered, platformFilter);
    const savedFiltered = applySavedFilter(platformFiltered, showSavedOnly, isSaved);
    return applySort(savedFiltered, sortBy);
  }, [allHackathons, searchQuery, statusFilter, platformFilter, showSavedOnly, isSaved, sortBy]);

  const accentText = ACCENT_TEXT.indigo;
  const accentBgSoft = ACCENT_BG_SOFT.indigo;

  return (
    <div className="min-h-screen bg-slate-50 text-neutral-900 transition-colors dark:bg-neutral-950 dark:text-neutral-100">
      {/* ── Page header ── */}
      <div className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mx-auto max-w-7xl px-5 pb-6 pt-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {/* Breadcrumb / label */}
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-indigo-500">
                Discover
              </p>

              {/* Heading */}
              <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-white">
                Hackathons
              </h1>
              <p className="mt-2 text-base text-neutral-500 dark:text-neutral-400">
                Discover hackathons worth building for — aggregated across MLH, Devpost, Devfolio, Unstop, DoraHacks, Kaggle, & Hack2Skill.
              </p>
            </div>

            {/* Create Hackathon Button for non-participants (logged out or organizers) */}
            {showCreateHackathonButton && (
              <button
                type="button"
                onClick={handleCreateHackathonClick}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#6366f1] px-4 py-2 text-sm font-semibold text-white shadow-xs transition-all duration-150 cursor-pointer hover:bg-[#5254e0] active:bg-[#4345cc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1] focus-visible:ring-offset-2 dark:bg-[#6366f1] dark:hover:bg-[#5254e0]"
              >
                <span>+ Create Hackathon</span>
              </button>
            )}
          </div>

          {/* Search bar */}
          <div className="mt-6 max-w-2xl">
            <HackathonSearch value={searchQuery} onChange={setSearchQuery} />
          </div>

          {/* Toolbar: View Tabs, Filter Popover, Saved Toggle & Sort */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* All / Saved View Tabs */}
              <div className="inline-flex rounded-lg border border-neutral-200 bg-neutral-50 p-0.5 dark:border-neutral-800 dark:bg-neutral-900">
                <button
                  type="button"
                  onClick={() => setShowSavedOnly(false)}
                  className={`
                    rounded-md
                    px-3
                    py-1.5
                    text-xs
                    font-semibold
                    transition-all
                    duration-150
                    ${
                      !showSavedOnly
                        ? "bg-white text-neutral-900 shadow-xs dark:bg-neutral-800 dark:text-white"
                        : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                    }
                  `}
                >
                  All Hackathons
                </button>
                <button
                  type="button"
                  onClick={() => setShowSavedOnly(true)}
                  aria-label={`View saved hackathons (${savedCount})`}
                  className={`
                    inline-flex
                    items-center
                    gap-1.5
                    rounded-md
                    px-3
                    py-1.5
                    text-xs
                    font-semibold
                    transition-all
                    duration-150
                    ${
                      showSavedOnly
                        ? `${accentBgSoft} ${accentText} shadow-xs`
                        : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                    }
                  `}
                >
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill={showSavedOnly ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                  <span>Saved</span>
                  <span
                    className={`
                      inline-flex
                      h-4
                      min-w-4
                      items-center
                      justify-center
                      rounded-full
                      px-1
                      text-[10px]
                      font-bold
                      ${
                        showSavedOnly
                          ? "bg-indigo-500 text-white"
                          : "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                      }
                    `}
                  >
                    {savedCount}
                  </span>
                </button>
              </div>

              {/* Filter Popover Trigger */}
              <HackathonFilters
                statusFilter={statusFilter}
                platformFilter={platformFilter}
                onApply={handleApplyFilterPopover}
                onClear={() => {
                  setStatusFilter("all");
                  setPlatformFilter("all");
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
        {/* Sort + count */}
        <div className="mb-6">
          <HackathonSort
            value={sortBy}
            onChange={setSortBy}
            resultCount={results.length}
          />
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
                    <div className="h-3 w-1/2 rounded bg-neutral-200 dark:bg-neutral-800" />
                  </div>
                </div>
                <div className="mt-4 flex justify-between">
                  <div className="h-3 w-1/3 rounded bg-neutral-200 dark:bg-neutral-800" />
                  <div className="h-3 w-1/4 rounded bg-neutral-200 dark:bg-neutral-800" />
                </div>
                <div className="mt-4 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                  <div className="h-4 w-1/2 rounded bg-neutral-200 dark:bg-neutral-800" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State with Retry Button */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-500">
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
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
              Unable to load hackathons
            </h3>
            <p className="mt-1.5 max-w-xs text-sm text-neutral-500 dark:text-neutral-400">
              We couldn&apos;t retrieve hackathons right now. Please try again.
            </p>
            <button
              type="button"
              onClick={loadPublicHackathons}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Card grid & Empty State */}
        {!loading && !error && (
          <HackathonGrid
            hackathons={results}
            hasFilters={hasFilters}
            onClearFilters={handleClearFilters}
          />
        )}
      </main>
    </div>
  );
}

export default Hackathons;
