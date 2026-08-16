const steps = [
  {
    number: "01",
    title: "Discover",
    description: "Find hackathons that match your interests, skills, and schedule.",
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
    description: "Find developers with complementary skills and form your team.",
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
    description: "Stay connected, exchange ideas, and work together to turn an idea into a project.",
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
    <section className="px-6 py-20">
      <div className="mx-auto max-w-7xl">
        {/* Heading */}
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-wide text-indigo-500">
            How it works
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
            Three steps to your next hackathons
          </h2>
        </div>

        {/* Steps */}
        <div
          className="
            mt-14
            grid
            gap-8

            sm:grid-cols-3
            sm:gap-12
          "
        >
          {steps.map((step) => (
            <div key={step.number}>
              {/* Icon */}
              <div
                className="
                  mb-4
                  inline-flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-lg

                  bg-indigo-500/10
                  text-indigo-500
                "
              >
                {step.icon}
              </div>

              {/* Number + title */}
              <div className="flex items-baseline gap-2">
                <span
                  className="
                    text-xs
                    font-bold
                    text-neutral-300

                    dark:text-neutral-600
                  "
                >
                  {step.number}
                </span>
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
              </div>

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
