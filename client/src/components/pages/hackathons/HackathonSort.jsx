// ---------------------------------------------------------------------------
// HackathonSort — sort control + result count
// Clean native select styled to match the design system.
// ---------------------------------------------------------------------------

const SORT_OPTIONS = [
  { value: "deadline-asc",  label: "Deadline — soonest first" },
  { value: "deadline-desc", label: "Deadline — latest first" },
  { value: "prize-desc",    label: "Prize — highest first" },
];

function HackathonSort({ value, onChange, resultCount }) {
  return (
    <div className="flex items-center justify-between gap-4">
      {/* Result count */}
      <p className="text-sm font-normal text-neutral-500 dark:text-neutral-400" aria-live="polite" aria-atomic="true">
        <span className="font-semibold text-neutral-900 dark:text-white">
          {resultCount}
        </span>{" "}
        {resultCount === 1 ? "hackathon" : "hackathons"}
      </p>

      {/* Sort select */}
      <div className="flex items-center gap-2">
        <label
          htmlFor="hackathon-sort"
          className="shrink-0 text-xs font-medium text-neutral-500 dark:text-neutral-400"
        >
          Sort by
        </label>

        <div className="relative">
          <select
            id="hackathon-sort"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="
              h-8
              appearance-none
              rounded-lg
              border
              border-neutral-200
              bg-white
              pl-3
              pr-8
              text-xs
              font-medium
              text-neutral-700
              outline-none

              transition-[border-color,box-shadow]
              duration-150

              focus:border-indigo-400
              focus:ring-2
              focus:ring-indigo-500/15

              dark:border-neutral-800
              dark:bg-neutral-900
              dark:text-neutral-200
              dark:focus:border-indigo-500
            "
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Custom chevron */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-neutral-400 dark:text-neutral-500"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}

export default HackathonSort;
