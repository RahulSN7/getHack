import { Link } from "react-router-dom";
import { HACKATHONS } from "../../../data/hackathons";
import HackathonCard from "../hackathons/HackathonCard";

function FeaturedHackathons() {
  // Use the same raw dataset objects directly with the shared HackathonCard
  const featuredList = HACKATHONS.slice(0, 6);

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
              Featured hackathons
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
              Hand-picked opportunities worth exploring. Find the right challenge for your skills and interests.
            </p>
          </div>

          <Link
            to="/hackathons"
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
          </Link>
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
          {featuredList.map((hackathon) => (
            <HackathonCard key={hackathon.id || hackathon.name} hackathon={hackathon} />
          ))}
        </div>

        {/* Mobile "View all" */}
        <div className="mt-8 text-center sm:hidden">
          <Link
            to="/hackathons"
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
          </Link>
        </div>
      </div>
    </section>
  );
}

export default FeaturedHackathons;
