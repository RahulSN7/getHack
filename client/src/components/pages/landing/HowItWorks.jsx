const steps = [
  {
    number: "01",
    title: "Discover",
    description: "Discover hackathons and opportunities that match your interests and skills.",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Connect",
    description: "Find developers and designers with complementary skills and connect with the right people for your hackathon.",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Collaborate",
    description: "Build teams, communicate with your connections, and work together to turn ideas into projects.",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="m18 16 4-4-4-4" />
        <path d="m6 8-4 4 4 4" />
        <path d="m14.5 4-5 16" />
      </svg>
    ),
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        {/* Heading */}
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">
            PROCESS
          </p>
          <h2
            className="
              mt-2
              text-3xl
              font-bold
              tracking-tight
              text-neutral-900
              sm:text-4xl

              dark:text-white
            "
          >
            How getHack works
          </h2>
          <p className="mt-3 text-base leading-relaxed text-neutral-500 dark:text-neutral-400">
            Three steps from discovery to shipping something real.
          </p>
        </div>

        {/* Steps */}
        <div className="mt-14 grid gap-8 sm:grid-cols-3 sm:gap-12">

          {steps.map((step) => (
            <div key={step.number} className="relative">
              {/* Icon + step number row */}
              <div className="mb-5 flex items-center gap-3">
                <div
                  className="
                    inline-flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    bg-indigo-500/10
                    text-indigo-500
                  "
                >
                  {step.icon}
                </div>
                <span className="text-xs font-bold tabular-nums tracking-widest text-neutral-300 dark:text-neutral-700">
                  {step.number}
                </span>
              </div>

              {/* Title */}
              <h3
                className="
                  text-lg
                  font-semibold
                  text-neutral-900

                  dark:text-white
                "
              >
                {step.title}
              </h3>

              {/* Description */}
              <p
                className="
                  mt-2
                  text-sm
                  leading-relaxed
                  text-neutral-500

                  dark:text-neutral-400
                "
              >
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
