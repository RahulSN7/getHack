import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import HackathonCard from "../hackathons/HackathonCard";
import { hackathonService } from "../../../services/hackathonService";

function normalizeHackathon(h) {
  const sourcePlatform = h.source?.platform || h.platform || "gethack";
  const externalUrl = h.source?.externalUrl || h.registration?.url || h.registrationUrl || h.url || "#";

  return {
    ...h,
    id: h.id || h._id,
    name: h.title || h.name,
    organizer: h.organizerName || (typeof h.organizer === "object" ? h.organizer?.name : h.organizer) || "Organizer",
    mode: h.event?.mode || h.format || h.mode || "Online",
    location: h.location?.city ? `${h.location.city}${h.location.country ? ", " + h.location.country : ""}` : (h.event?.venue || h.location || null),
    registrationDeadline: h.registration?.deadline || h.registrationDeadline,
    hackathonDate: h.event?.startDate || h.startDate || h.hackathonDate,
    eventEndDate: h.event?.endDate || h.endDate || h.eventEndDate,
    registrationOpen: h.registration?.deadline ? new Date(h.registration.deadline) > new Date() : (h.registrationDeadline ? new Date(h.registrationDeadline) > new Date() : true),
    prize: h.prizePool?.description || h.prizes || (h.prizePool?.amount ? `$${h.prizePool.amount.toLocaleString()}` : null) || h.prize || "Free",
    prizeValue: h.prizePool?.amount || 0,
    tags: h.skills?.length ? h.skills : h.tags || ["Hackathon"],
    themes: h.themes?.length ? h.themes : h.tags || [],
    url: externalUrl,
    description: h.shortDescription || h.description || "",
    source: h.source || { platform: sourcePlatform, externalUrl },
    platform: sourcePlatform,
    accent: "indigo",
  };
}

function FeaturedHackathons() {
  const [featuredList, setFeaturedList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadFeatured() {
      try {
        setLoading(true);
        const data = await hackathonService.getPublicHackathons({ limit: 6 });
        const items = data.data || data.hackathons || [];
        if (isMounted) {
          setFeaturedList(items.map(normalizeHackathon));
        }
      } catch (err) {
        console.error("Failed to load featured hackathons:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadFeatured();
    return () => {
      isMounted = false;
    };
  }, []);

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
        {loading ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
                    <div className="h-3 w-1/2 rounded bg-neutral-200 dark:bg-neutral-800" />
                  </div>
                </div>
                <div className="mt-4 flex justify-between">
                  <div className="h-3 w-1/3 rounded bg-neutral-200 dark:bg-neutral-800" />
                  <div className="h-3 w-1/4 rounded bg-neutral-200 dark:bg-neutral-800" />
                </div>
              </div>
            ))}
          </div>
        ) : (
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
        )}

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
