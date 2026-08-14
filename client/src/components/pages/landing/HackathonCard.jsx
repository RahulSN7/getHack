function HackathonCard({ hackathon }) {
  const {
    name,
    organizer,
    mode,
    deadline,
    prize,
    participants,
    tags = [],
    accent = "indigo",
  } = hackathon;

  // Simple color mapping for the top accent bar
  const accentColors = {
    indigo: "bg-indigo-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    sky: "bg-sky-500",
    violet: "bg-violet-500",
  };

  const accentBg = accentColors[accent] || accentColors.indigo;

  // First letter for logo placeholder
  const initial = name.charAt(0).toUpperCase();

  return (
    <article
      className="
        group
        relative

        overflow-hidden
        rounded-xl

        border
        border-neutral-200

        bg-white

        transition-all
        duration-200

        hover:-translate-y-0.5
        hover:shadow-lg
        hover:shadow-neutral-950/5

        dark:border-neutral-800
        dark:bg-neutral-900
        dark:hover:shadow-neutral-950/30
      "
    >
      {/* Top accent strip */}
      <div className={`h-1 w-full ${accentBg}`} />

      <div className="p-5">
        {/* Header: logo + name + organizer */}
        <div className="flex items-start gap-3">
          <div
            className={`
              grid
              h-10
              w-10
              shrink-0
              place-items-center
              rounded-lg

              ${accentBg}/10

              text-sm
              font-bold
              ${accentBg.replace("bg-", "text-")}
            `}
          >
            {initial}
          </div>

          <div className="min-w-0">
            <h3
              className="
                truncate
                text-base
                font-semibold
                text-neutral-900

                dark:text-white
              "
            >
              {name}
            </h3>

            <p
              className="
                mt-0.5
                truncate
                text-sm
                text-neutral-500

                dark:text-neutral-400
              "
            >
              {organizer}
            </p>
          </div>
        </div>

        {/* Metadata row */}
        <div
          className="
            mt-4
            flex
            items-center
            gap-2
            text-xs
            text-neutral-500

            dark:text-neutral-400
          "
        >
          {/* Mode badge */}
          <span
            className="
              inline-flex
              items-center
              gap-1
              rounded
              bg-neutral-100
              px-1.5
              py-0.5

              font-medium
              text-neutral-600

              dark:bg-neutral-800
              dark:text-neutral-300
            "
          >
            {mode === "Online" ? (
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            ) : (
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            )}
            {mode}
          </span>

          <span className="text-neutral-300 dark:text-neutral-600">·</span>

          {/* Deadline */}
          <span>{deadline}</span>

          {participants && (
            <>
              <span className="text-neutral-300 dark:text-neutral-600">·</span>
              <span>{participants} joined</span>
            </>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="
                  rounded
                  bg-neutral-100
                  px-2
                  py-0.5

                  text-xs
                  font-medium
                  text-neutral-600

                  dark:bg-neutral-800
                  dark:text-neutral-400
                "
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Bottom: prize + CTA */}
        <div
          className="
            mt-4
            flex
            items-center
            justify-between

            border-t
            border-neutral-100
            pt-4

            dark:border-neutral-800
          "
        >
          {prize && (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                Prize
              </p>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                {prize}
              </p>
            </div>
          )}

          <a
            href="#"
            className="
              inline-flex
              items-center
              gap-1

              text-sm
              font-medium
              text-indigo-500

              transition-colors
              duration-150

              hover:text-indigo-600

              dark:text-indigo-400
              dark:hover:text-indigo-300

              group-hover:gap-1.5
            "
          >
            View
            <svg
              className="
                h-3.5 w-3.5
                transition-transform
                duration-150
                group-hover:translate-x-0.5
              "
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </article>
  );
}

export default HackathonCard;
