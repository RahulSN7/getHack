// ---------------------------------------------------------------------------
// Hackathons — discovery page with Filter popover, Search, Sort & Saved view
//
// Pipeline: data → search → status filter → format filter → saved filter → sort → grid
// All operations are pure and non-mutating.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import { HACKATHONS } from "../../../data/hackathons";
import { useSaved } from "../../../context/SavedContext";
import { ACCENT_TEXT, ACCENT_BG_SOFT } from "../../../constants/themeTokens";
import HackathonSearch from "./HackathonSearch";
import HackathonFilters from "./HackathonFilters";
import HackathonSort from "./HackathonSort";
import HackathonGrid from "./HackathonGrid";
import { hackathonService } from "../../../services/hackathonService";

// Helper to normalize backend DB hackathons
function normalizeHackathon(h) {
  return {
    ...h,
    id: h.id || h._id,
    name: h.title || h.name,
    organizer: h.organizerName || (typeof h.organizer === "object" ? h.organizer.name : h.organizer) || "Organizer",
    mode: h.format || h.mode || "Online",
    location: h.location?.city ? `${h.location.city}${h.location.country ? ", " + h.location.country : ""}` : h.location || null,
    registrationDeadline: h.registrationDeadline,
    hackathonDate: h.startDate || h.hackathonDate,
    eventEndDate: h.endDate || h.eventEndDate,
    registrationOpen: h.registrationDeadline ? new Date(h.registrationDeadline) > new Date() : true,
    prize: h.prizes || h.prizePool || h.prize || "Free",
    prizeValue: 0,
    tags: h.skills?.length ? h.skills : h.tags || ["Hackathon"],
    themes: h.themes?.length ? h.themes : h.tags || [],
    url: h.registrationUrl || h.url || "#",
    description: h.shortDescription || h.description || "",
    accent: "indigo",
  };
}

// ---------------------------------------------------------------------------
// Search: match against name, organizer, tags, domain, location
// ---------------------------------------------------------------------------

function applySearch(hackathons, query) {
  if (!query.trim()) return hackathons;
  const q = query.toLowerCase();
  return hackathons.filter((h) => {
    return (
      (h.name && h.name.toLowerCase().includes(q)) ||
      (h.organizer && h.organizer.toLowerCase().includes(q)) ||
      (h.domain && h.domain.toLowerCase().includes(q)) ||
      (h.location && h.location.toLowerCase().includes(q)) ||
      (h.tags && h.tags.some((tag) => tag.toLowerCase().includes(q)))
    );
  });
}

// ---------------------------------------------------------------------------
// Status Filter
// ---------------------------------------------------------------------------

function applyStatusFilter(hackathons, statusId) {
  const now = new Date();

  switch (statusId) {
    case "registration-open":
      return hackathons.filter(
        (h) => h.registrationOpen && new Date(h.registrationDeadline) > now
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

// ---------------------------------------------------------------------------
// Format Filter
// ---------------------------------------------------------------------------

function applyFormatFilter(hackathons, formatId) {
  switch (formatId) {
    case "online":
      return hackathons.filter((h) => h.mode === "Online");
    case "offline":
      return hackathons.filter((h) => h.mode === "Offline" || h.mode === "Hybrid");
    case "all":
    default:
      return hackathons;
  }
}

// ---------------------------------------------------------------------------
// Saved Filter
// ---------------------------------------------------------------------------

function applySavedFilter(hackathons, showSavedOnly, isSaved) {
  if (!showSavedOnly) return hackathons;
  return hackathons.filter((h) => isSaved(h.id));
}

// ---------------------------------------------------------------------------
// Sort
// ---------------------------------------------------------------------------

function applySort(hackathons, sortId) {
  const sorted = [...hackathons];
  switch (sortId) {
    case "deadline-desc":
      return sorted.sort(
        (a, b) =>
          new Date(b.registrationDeadline) - new Date(a.registrationDeadline)
      );
    case "prize-desc":
      return sorted.sort((a, b) => (b.prizeValue ?? 0) - (a.prizeValue ?? 0));
    case "deadline-asc":
    default:
      return sorted.sort(
        (a, b) =>
          new Date(a.registrationDeadline) - new Date(b.registrationDeadline)
      );
  }
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

function Hackathons() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [sortBy, setSortBy] = useState("deadline-asc");
  const [allHackathons, setAllHackathons] = useState(HACKATHONS);

  useEffect(() => {
    let isMounted = true;
    async function loadPublicHackathons() {
      try {
        const data = await hackathonService.getPublicHackathons();
        if (isMounted && data?.hackathons?.length > 0) {
          const apiNormalized = data.hackathons.map(normalizeHackathon);
          // Prepend API hackathons to static HACKATHONS
          const apiIds = new Set(apiNormalized.map((h) => String(h.id)));
          const filteredStatic = HACKATHONS.filter((h) => !apiIds.has(String(h.id)));
          setAllHackathons([...apiNormalized, ...filteredStatic]);
        }
      } catch {
        // Fail silently and keep static list
      }
    }
    loadPublicHackathons();
    return () => {
      isMounted = false;
    };
  }, []);

  const { isSaved, savedCount } = useSaved();

  const hasFilters =
    searchQuery.trim() !== "" ||
    statusFilter !== "all" ||
    formatFilter !== "all" ||
    showSavedOnly;

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setFormatFilter("all");
    setShowSavedOnly(false);
  };

  const handleApplyFilterPopover = ({ statusFilter: nextStatus, formatFilter: nextFormat }) => {
    setStatusFilter(nextStatus);
    setFormatFilter(nextFormat);
  };

  // Pipeline: search → status filter → format filter → saved filter → sort
  const results = useMemo(() => {
    const searched = applySearch(allHackathons, searchQuery);
    const statusFiltered = applyStatusFilter(searched, statusFilter);
    const formatFiltered = applyFormatFilter(statusFiltered, formatFilter);
    const savedFiltered = applySavedFilter(formatFiltered, showSavedOnly, isSaved);
    return applySort(savedFiltered, sortBy);
  }, [allHackathons, searchQuery, statusFilter, formatFilter, showSavedOnly, isSaved, sortBy]);

  const accentText = ACCENT_TEXT.indigo;
  const accentBgSoft = ACCENT_BG_SOFT.indigo;

  return (
    <div className="min-h-screen bg-slate-50 text-neutral-900 transition-colors dark:bg-neutral-950 dark:text-neutral-100">
      {/* ── Page header ── */}
      <div className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mx-auto max-w-7xl px-5 pb-6 pt-5 sm:px-6 lg:px-8">
          {/* Breadcrumb / label */}
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-indigo-500">
            Discover
          </p>

          {/* Heading */}
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-white">
            Hackathons
          </h1>
          <p className="mt-2 text-base text-neutral-500 dark:text-neutral-400">
            Discover hackathons worth building for — matched to your skills and interests.
          </p>

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
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
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
                formatFilter={formatFilter}
                onApply={handleApplyFilterPopover}
                onClear={() => {
                  setStatusFilter("all");
                  setFormatFilter("all");
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

        {/* Card grid */}
        <HackathonGrid
          hackathons={results}
          hasFilters={hasFilters}
          onClearFilters={handleClearFilters}
        />
      </main>
    </div>
  );
}

export default Hackathons;
