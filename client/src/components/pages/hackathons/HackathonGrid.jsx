// ---------------------------------------------------------------------------
// HackathonGrid — responsive card grid + empty state
// ---------------------------------------------------------------------------

import HackathonCard from "./HackathonCard";

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState({ hasFilters, onClear }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {/* Icon */}
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-neutral-100 dark:bg-neutral-800">
        <svg
          className="h-6 w-6 text-neutral-400 dark:text-neutral-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>

      <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
        No hackathons found
      </h3>

      <p className="mt-1.5 max-w-xs text-sm text-neutral-500 dark:text-neutral-400">
        {hasFilters
          ? "Try adjusting your search or selecting a different filter."
          : "No hackathons are available right now. Check back soon."}
      </p>

      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="
            mt-5
            inline-flex
            h-9
            items-center
            gap-1.5
            rounded-lg
            border
            border-neutral-300
            px-4
            text-sm
            font-medium
            text-neutral-700
            transition-colors
            duration-150
            hover:border-neutral-400
            hover:text-neutral-950
            dark:border-neutral-700
            dark:text-neutral-300
            dark:hover:border-neutral-600
            dark:hover:text-white
          "
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// HackathonGrid
// ---------------------------------------------------------------------------

function HackathonGrid({ hackathons, hasFilters, onClearFilters }) {
  if (hackathons.length === 0) {
    return <EmptyState hasFilters={hasFilters} onClear={onClearFilters} />;
  }

  return (
    <div
      className="
        grid
        gap-4

        sm:grid-cols-2
        lg:grid-cols-3
      "
    >
      {hackathons.map((hackathon) => (
        <HackathonCard key={hackathon.id} hackathon={hackathon} />
      ))}
    </div>
  );
}

export default HackathonGrid;
