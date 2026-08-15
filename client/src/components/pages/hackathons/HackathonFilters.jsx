// ---------------------------------------------------------------------------
// HackathonFilters — segmented filter tabs
// Restrained design: clear active state via background + slight border,
// no pill overdose, horizontal scroll on mobile.
// ---------------------------------------------------------------------------

const FILTERS = [
  { id: "all",               label: "All" },
  { id: "registration-open", label: "Registration Open" },
  { id: "upcoming",          label: "Upcoming" },
  { id: "online",            label: "Online" },
  { id: "offline",           label: "Offline" },
];

function HackathonFilters({ active, onChange }) {
  return (
    <div
      role="group"
      aria-label="Filter hackathons"
      className="
        flex
        items-center
        gap-0.5
        overflow-x-auto
        pb-0.5

        scrollbar-none
        [-ms-overflow-style:none]
        [scrollbar-width:none]
        [&::-webkit-scrollbar]:hidden
      "
    >
      {FILTERS.map((filter) => {
        const isActive = active === filter.id;
        return (
          <button
            key={filter.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(filter.id)}
            className={`
              shrink-0
              rounded-lg
              px-3.5
              py-1.5
              text-sm
              font-medium
              transition-colors
              duration-150
              focus-visible:outline
              focus-visible:outline-2
              focus-visible:outline-indigo-500
              focus-visible:outline-offset-2
              ${
                isActive
                  ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950"
                  : `
                    text-neutral-500
                    hover:bg-neutral-100
                    hover:text-neutral-800
                    dark:text-neutral-400
                    dark:hover:bg-neutral-800
                    dark:hover:text-neutral-200
                  `
              }
            `}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}

export default HackathonFilters;
