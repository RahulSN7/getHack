function HeroCTA() {
  return (
    <div
      className="
        mt-10
        flex
        flex-col
        gap-3

        sm:flex-row
        sm:items-center
      "
    >
      {/* Primary — Browse Hackathons */}

      <a
        href="#hackathons"
        className="
          group
          inline-flex
          h-11
          items-center
          justify-center
          gap-2

          rounded-lg

          bg-neutral-950
          px-5

          text-sm
          font-semibold
          text-white

          transition-all
          duration-150

          hover:bg-neutral-800

          dark:bg-white
          dark:text-neutral-950
          dark:hover:bg-neutral-200

          focus-visible:outline-2
          focus-visible:outline-offset-2
          focus-visible:outline-indigo-500
        "
      >
        Browse Hackathons

        <svg
          className="
            h-4 w-4
            transition-transform
            duration-150
            group-hover:translate-x-0.5
          "
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </a>

      {/* Secondary — Find Teammates */}

      <a
        href="#teammates"
        className="
          group
          inline-flex
          h-11
          items-center
          justify-center
          gap-2

          rounded-lg

          border
          border-neutral-300

          px-5

          text-sm
          font-semibold
          text-neutral-700

          transition-all
          duration-150

          hover:border-neutral-400
          hover:text-neutral-950

          dark:border-neutral-700
          dark:text-neutral-300
          dark:hover:border-neutral-500
          dark:hover:text-white

          focus-visible:outline-2
          focus-visible:outline-offset-2
          focus-visible:outline-indigo-500
        "
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>

        Find Teammates
      </a>
    </div>
  );
}

export default HeroCTA;
