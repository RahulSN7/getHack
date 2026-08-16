// ---------------------------------------------------------------------------
// TeammateSearch — search input for the Find Teammates page
// Same design pattern as HackathonSearch.jsx
// ---------------------------------------------------------------------------

function TeammateSearch({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      {/* Search icon */}
      <svg
        className="
          pointer-events-none
          absolute
          left-3.5
          top-1/2
          h-4
          w-4
          -translate-y-1/2
          text-neutral-400
          dark:text-neutral-500
        "
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>

      <input
        id="teammate-search"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Search by name, role, or skills…"}
        className="
          h-10
          w-full
          rounded-lg
          border
          border-neutral-200
          bg-white
          pl-10
          pr-4
          text-sm
          text-neutral-900
          placeholder-neutral-400
          outline-none
          transition-colors
          duration-150
          focus:border-indigo-500
          focus:ring-1
          focus:ring-indigo-500/20
          dark:border-neutral-800
          dark:bg-neutral-900
          dark:text-white
          dark:placeholder-neutral-500
          dark:focus:border-indigo-400
          dark:focus:ring-indigo-400/20
        "
      />

      {/* Clear button */}
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="
            absolute
            right-3
            top-1/2
            -translate-y-1/2
            rounded
            p-0.5
            text-neutral-400
            transition-colors
            hover:text-neutral-600
            dark:text-neutral-500
            dark:hover:text-neutral-300
          "
        >
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default TeammateSearch;
