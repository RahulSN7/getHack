import HackathonCard from "./HackathonCard";

const sampleHackathons = [
  {
    name: "HackForGood 2025",
    organizer: "TechCommunity India",
    mode: "Online",
    deadline: "3 days left",
    prize: "₹50,000",
    participants: 342,
    tags: ["React", "Node.js", "Social Impact"],
    accent: "indigo",
  },
  {
    name: "BuildWithAI",
    organizer: "Google Developer Groups",
    mode: "Hybrid",
    deadline: "1 week left",
    prize: "$2,500",
    participants: 578,
    tags: ["AI/ML", "Python", "TensorFlow"],
    accent: "emerald",
  },
  {
    name: "DevSprint Bangalore",
    organizer: "Startup Karnataka",
    mode: "Offline",
    deadline: "12 days left",
    prize: "₹1,00,000",
    participants: 210,
    tags: ["Full Stack", "Cloud", "DevOps"],
    accent: "amber",
  },
  {
    name: "HealthTech Hack",
    organizer: "MedTech Alliance",
    mode: "Online",
    deadline: "5 days left",
    prize: "$5,000",
    participants: 189,
    tags: ["Healthcare", "React", "APIs"],
    accent: "rose",
  },
  {
    name: "Open Source Sprint",
    organizer: "FOSS United",
    mode: "Online",
    deadline: "2 weeks left",
    prize: "Swag + Mentorship",
    participants: 425,
    tags: ["Open Source", "Rust", "Go"],
    accent: "sky",
  },
  {
    name: "FinTech Challenge",
    organizer: "Razorpay Community",
    mode: "Hybrid",
    deadline: "9 days left",
    prize: "₹75,000",
    participants: 296,
    tags: ["FinTech", "TypeScript", "PostgreSQL"],
    accent: "violet",
  },
];

function FeaturedHackathons() {
  return (
    <section id="hackathons" className="px-6 py-20">
      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <div className="flex items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold tracking-wide text-indigo-500">
              Explore
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
              Discover hackathons
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
              Browse by technology, domain, location, and format. Find the right challenge for your skills and interests.
            </p>
          </div>

          <a
            href="#hackathons"
            className="
              hidden
              shrink-0
              text-sm
              font-medium
              text-indigo-500

              transition-colors
              hover:text-indigo-600

              dark:text-indigo-400
              dark:hover:text-indigo-300

              sm:block
            "
          >
            View all →
          </a>
        </div>

        {/* Card grid */}
        <div
          className="
            mt-10
            grid
            gap-5

            sm:grid-cols-2
            lg:grid-cols-3
          "
        >
          {sampleHackathons.map((hackathon) => (
            <HackathonCard key={hackathon.name} hackathon={hackathon} />
          ))}
        </div>

        {/* Mobile "View all" */}
        <div className="mt-8 text-center sm:hidden">
          <a
            href="#hackathons"
            className="
              text-sm
              font-medium
              text-indigo-500

              hover:text-indigo-600

              dark:text-indigo-400
              dark:hover:text-indigo-300
            "
          >
            View all hackathons →
          </a>
        </div>
      </div>
    </section>
  );
}

export default FeaturedHackathons;
