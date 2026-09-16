function HeroCTA() {
  return (
    <div
      className="
        mt-7
        sm:mt-9
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
          w-full
          sm:w-auto
          items-center
          justify-center
          gap-2

          rounded-lg

          bg-neutral-950
          px-6

          text-sm
          font-semibold
          text-white

          shadow-sm
          shadow-black/10

          transition-all
          duration-150

          hover:bg-neutral-800
          hover:shadow-md
          hover:shadow-black/15

          dark:bg-white
          dark:text-neutral-950
          dark:shadow-white/5
          dark:hover:bg-neutral-100

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
            duration-200
            group-hover:translate-x-1
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
          w-full
          sm:w-auto
          items-center
          justify-center
          gap-2

          rounded-lg

          border
          border-neutral-300

          bg-white/60
          backdrop-blur-sm

          px-6

          text-sm
          font-semibold
          text-neutral-700

          transition-all
          duration-150

          hover:border-neutral-400
          hover:bg-white
          hover:text-neutral-950

          dark:border-neutral-700
          dark:bg-neutral-900/60
          dark:text-neutral-300
          dark:hover:border-neutral-500
          dark:hover:bg-neutral-900
          dark:hover:text-white

          focus-visible:outline-2
          focus-visible:outline-offset-2
          focus-visible:outline-indigo-500
        "
      >
        <svg
          className="h-4 w-4 text-neutral-400 transition-colors duration-150 group-hover:text-neutral-600 dark:text-neutral-500 dark:group-hover:text-neutral-300"
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
