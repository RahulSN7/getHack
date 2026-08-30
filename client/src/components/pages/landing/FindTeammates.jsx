// ---------------------------------------------------------------------------
// client/src/components/pages/landing/FindTeammates.jsx
// Dynamic Find Teammates section for Landing Page — backed by MongoDB API
// ---------------------------------------------------------------------------

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../context/useAuth";
import { userService } from "../../../services/userService";
import TeammateCard from "../teammates/TeammateCard";

function FindTeammates() {
  const { user: currentUser } = useAuth();

  // Dynamic state
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchParticipants = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userService.getParticipants({ limit: 3 });
      if (data?.participants) {
        const currentId = currentUser?.id || currentUser?._id;
        const normalized = data.participants
          .filter((p) => (p.id || p._id) !== currentId)
          .map((p) => ({
            id: p.id || p._id,
            _id: p.id || p._id,
            name: p.name,
            bio: p.profile?.bio || "",
            skills: Array.isArray(p.profile?.skills) ? p.profile.skills : [],
            experience: p.profile?.experienceLevel || "Intermediate",
            location: p.profile?.location || "",
            availability: p.profile?.availability || "",
            username: p.profile?.handle?.replace(/^@/, "") || `user_${(p.id || p._id || "").slice(-4)}`,
            avatar: p.profile?.avatar || "",
            interests: p.profile?.interests || [],
            domain: p.profile?.domain || "",
            profile: p.profile,
          }));
        setMembers(normalized);
      } else {
        setMembers([]);
      }
    } catch (err) {
      console.error("Failed to load landing teammates:", err);
      setError("Unable to load teammates. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, [currentUser]);

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
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
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

          <div className="shrink-0">
            <Link
              to="/teammates"
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
              <span>Browse all developers</span>
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
            </Link>
          </div>
        </div>

        {/* Dynamic Content Grid / Loading / Error / Empty State */}
        {loading ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-28 rounded bg-neutral-200 dark:bg-neutral-800" />
                    <div className="h-3 w-16 rounded bg-neutral-200 dark:bg-neutral-800" />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-3 w-full rounded bg-neutral-200 dark:bg-neutral-800" />
                  <div className="h-3 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
                </div>
                <div className="mt-4 flex gap-2">
                  <div className="h-5 w-14 rounded bg-neutral-200 dark:bg-neutral-800" />
                  <div className="h-5 w-14 rounded bg-neutral-200 dark:bg-neutral-800" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="mt-10 rounded-xl border border-red-200 bg-red-50/50 p-6 text-center dark:border-red-900/50 dark:bg-red-950/20">
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">
              {error}
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Check back in a moment or click retry.
            </p>
            <button
              type="button"
              onClick={fetchParticipants}
              className="mt-3 inline-flex items-center rounded-lg bg-neutral-900 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Retry
            </button>
          </div>
        ) : members.length === 0 ? (
          <div className="mt-10 rounded-xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">
              No teammates available right now.
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Check back soon as developers join the platform.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <TeammateCard
                key={member.id || member._id}
                teammate={member}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default FindTeammates;
