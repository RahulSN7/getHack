const cards = [
  {
    title: "One Place for Hackathons",
    description:
      "Discover hackathons and opportunities without having to search across multiple platforms.",
    icon: (
      <svg
        className="h-5 w-5 text-indigo-600 transition-transform duration-200 group-hover:scale-110 dark:text-indigo-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
  {
    title: "Find the Right Teammates",
    description:
      "Find people based on their skills, experience, and availability so you can build stronger teams.",
    icon: (
      <svg
        className="h-5 w-5 text-indigo-600 transition-transform duration-200 group-hover:scale-110 dark:text-indigo-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
  },
  {
    title: "Connect & Collaborate",
    description:
      "Keep your connections, conversations, teams, and hackathon collaboration together in one platform.",
    icon: (
      <svg
        className="h-5 w-5 text-indigo-600 transition-transform duration-200 group-hover:scale-110 dark:text-indigo-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
  },
  {
    title: "getHack AI",
    description:
      "Use AI assistance to discover suitable hackathons and find potential teammates.",
    icon: (
      <svg
        className="h-5 w-5 text-indigo-600 transition-transform duration-200 group-hover:scale-110 dark:text-indigo-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 3v4M3 5h4M6 17v4m-2-2h4m11-16l1.5 3.5L22 6l-3.5 1.5L17 11l-1.5-3.5L12 6l3.5-1.5L17 1zM14 14l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5z"
        />
      </svg>
    ),
  },
];

function WhyGetHack() {
  return (
    <section id="why-gethack" className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-28 bg-slate-50/50 dark:bg-neutral-950/60 transition-colors border-y border-neutral-100 dark:border-neutral-900">
      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">
            PRODUCT VALUE
          </p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-neutral-950 sm:text-5xl dark:text-white">
            Why getHack
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">
            Everything you need to discover opportunities, build stronger teams, and ship projects seamlessly.
          </p>
        </div>

        {/* Responsive 4-Card Grid */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {cards.map((card) => (
            <div
              key={card.title}
              className="group flex flex-col rounded-xl border border-neutral-200/80 bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60 dark:hover:border-neutral-700 dark:hover:bg-neutral-900"
            >
              {/* Icon */}
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 dark:border-indigo-900/50 dark:bg-indigo-950/40">
                {card.icon}
              </div>

              {/* Title */}
              <h3 className="mt-5 text-base font-semibold tracking-tight text-neutral-950 dark:text-white">
                {card.title}
              </h3>

              {/* Description */}
              <p className="mt-2 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default WhyGetHack;
