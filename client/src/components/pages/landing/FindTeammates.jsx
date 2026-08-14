const profiles = [
  {
    name: "Priya Sharma",
    role: "Frontend Developer",
    skills: ["React", "TypeScript", "Figma"],
    lookingFor: "Backend + ML teammates",
  },
  {
    name: "Arjun Patel",
    role: "ML Engineer",
    skills: ["Python", "PyTorch", "FastAPI"],
    lookingFor: "Frontend + Design teammates",
  },
  {
    name: "Sneha Reddy",
    role: "Full Stack Developer",
    skills: ["Next.js", "PostgreSQL", "AWS"],
    lookingFor: "AI/ML + Mobile teammates",
  },
  {
    name: "Karthik Nair",
    role: "Backend Developer",
    skills: ["Go", "Kubernetes", "gRPC"],
    lookingFor: "Frontend + Product teammates",
  },
];

function FindTeammates() {
  return (
    <section
      id="teammates"
      className="
        border-y
        border-neutral-200
        bg-neutral-50
        px-6
        py-20

        dark:border-neutral-800
        dark:bg-neutral-950/50
      "
    >
      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-wide text-indigo-500">
            Team up
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
            Find the right teammates
          </h2>
          <p
            className="
              mt-3
              text-base
              leading-relaxed
              text-neutral-500

              dark:text-neutral-400
            "
          >
            Search by skills, tech stack, and interests. Build a team where everyone brings something different to the table.
          </p>
        </div>

        {/* Profiles grid */}
        <div
          className="
            mt-10
            grid
            gap-4

            sm:grid-cols-2
            lg:grid-cols-4
          "
        >
          {profiles.map((profile) => (
            <div
              key={profile.name}
              className="
                rounded-xl

                border
                border-neutral-200

                bg-white

                p-5

                transition-all
                duration-200

                hover:-translate-y-0.5
                hover:shadow-md
                hover:shadow-neutral-950/5

                dark:border-neutral-800
                dark:bg-neutral-900
                dark:hover:shadow-neutral-950/20
              "
            >
              {/* Avatar + name */}
              <div className="flex items-center gap-3">
                <div
                  className="
                    grid
                    h-10
                    w-10
                    shrink-0
                    place-items-center
                    rounded-full

                    bg-neutral-200
                    text-sm
                    font-semibold
                    text-neutral-600

                    dark:bg-neutral-800
                    dark:text-neutral-300
                  "
                >
                  {profile.name.split(" ").map((n) => n[0]).join("")}
                </div>

                <div className="min-w-0">
                  <p
                    className="
                      truncate
                      text-sm
                      font-semibold
                      text-neutral-900

                      dark:text-white
                    "
                  >
                    {profile.name}
                  </p>
                  <p
                    className="
                      truncate
                      text-xs
                      text-neutral-500

                      dark:text-neutral-400
                    "
                  >
                    {profile.role}
                  </p>
                </div>
              </div>

              {/* Skills */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profile.skills.map((skill) => (
                  <span
                    key={skill}
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
                    {skill}
                  </span>
                ))}
              </div>

              {/* Looking for */}
              <p
                className="
                  mt-3
                  text-xs
                  text-neutral-400

                  dark:text-neutral-500
                "
              >
                Looking for: {profile.lookingFor}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10">
          <a
            href="#teammates"
            className="
              inline-flex
              h-10
              items-center
              gap-2

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
              dark:hover:border-neutral-500
              dark:hover:text-white
            "
          >
            Browse all developers
            <svg
              className="h-3.5 w-3.5"
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
    </section>
  );
}

export default FindTeammates;
