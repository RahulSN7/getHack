import { HACKATHONS } from "../../../data/hackathons";
import HackathonCard from "./HackathonCard";

// Compute a human-readable deadline label from an ISO date string
function getDeadlineLabel(isoDate) {
  const now = new Date();
  const deadline = new Date(isoDate);
  const msLeft = deadline - now;
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  if (msLeft <= 0) return "Registration closed";
  if (daysLeft <= 1) return "Closes today";
  if (daysLeft <= 7) return `${daysLeft} days left`;
  if (daysLeft <= 14) return `${daysLeft} days left`;
  const formatted = deadline.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  return `Closes ${formatted}`;
}

// Show the first 6 hackathons on the landing page
const sampleHackathons = HACKATHONS.slice(0, 6).map((h) => ({
  name: h.name,
  organizer: h.organizer,
  mode: h.mode,
  deadline: getDeadlineLabel(h.registrationDeadline),
  prize: h.prize,
  participants: h.participants,
  tags: h.tags,
  accent: h.accent,
}));

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
            href="/hackathons"
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
            href="/hackathons"
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
