// ---------------------------------------------------------------------------
// Hackathons — discovery page
//
// Pipeline: data → search → filter → sort → display
// All operations are pure and non-mutating.
// ---------------------------------------------------------------------------

import { useMemo, useState } from "react";
import { HACKATHONS } from "../../../data/hackathons";
import HackathonSearch from "./HackathonSearch";
import HackathonFilters from "./HackathonFilters";
import HackathonSort from "./HackathonSort";
import HackathonGrid from "./HackathonGrid";

// ---------------------------------------------------------------------------
// Search: match against name, organizer, tags, domain, location
// ---------------------------------------------------------------------------

function applySearch(hackathons, query) {
  if (!query.trim()) return hackathons;
  const q = query.toLowerCase();
  return hackathons.filter((h) => {
    return (
      h.name.toLowerCase().includes(q) ||
      h.organizer.toLowerCase().includes(q) ||
      (h.domain && h.domain.toLowerCase().includes(q)) ||
      (h.location && h.location.toLowerCase().includes(q)) ||
      h.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  });
}

// ---------------------------------------------------------------------------
// Filter
// ---------------------------------------------------------------------------

function applyFilter(hackathons, filterId) {
  const now = new Date();

  switch (filterId) {
    case "registration-open":
      return hackathons.filter(
        (h) => h.registrationOpen && new Date(h.registrationDeadline) > now
      );
    case "upcoming":
      return hackathons.filter((h) => new Date(h.registrationDeadline) > now);
    case "online":
      return hackathons.filter((h) => h.mode === "Online");
    case "offline":
      return hackathons.filter((h) => h.mode === "Offline");
    case "all":
    default:
      return hackathons;
  }
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
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortBy, setSortBy] = useState("deadline-asc");

  const hasFilters = searchQuery.trim() !== "" || activeFilter !== "all";

  const handleClearFilters = () => {
    setSearchQuery("");
    setActiveFilter("all");
  };

  // Pipeline: search → filter → sort (never mutates source)
  const results = useMemo(() => {
    const searched = applySearch(HACKATHONS, searchQuery);
    const filtered = applyFilter(searched, activeFilter);
    return applySort(filtered, sortBy);
  }, [searchQuery, activeFilter, sortBy]);

  return (
    <div className="min-h-screen bg-slate-50 text-neutral-900 transition-colors dark:bg-neutral-950 dark:text-neutral-100">
      {/* ── Page header ── */}
      <div className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mx-auto max-w-7xl px-5 pb-6 pt-24 sm:px-6 lg:px-8">
          {/* Breadcrumb / label */}
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-indigo-500">
            Discover
          </p>

          {/* Heading */}
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-white">
            Hackathons
          </h1>
          <p className="mt-2 text-base text-neutral-500 dark:text-neutral-400">
            Find competitions worth building for — matched to your skills and interests.
          </p>

          {/* Search bar */}
          <div className="mt-6 max-w-2xl">
            <HackathonSearch value={searchQuery} onChange={setSearchQuery} />
          </div>

          {/* Filters */}
          <div className="mt-4">
            <HackathonFilters active={activeFilter} onChange={setActiveFilter} />
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
