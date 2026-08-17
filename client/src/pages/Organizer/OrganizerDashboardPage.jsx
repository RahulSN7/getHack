// ---------------------------------------------------------------------------
// OrganizerDashboardPage.jsx — Clean, Polished Organizer Dashboard
// Fetches real organizer hackathons, displays status breakdown & recent hackathons.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { hackathonService } from "../../services/hackathonService";

// Helper to format date string
function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
  } catch {
    return dateStr;
  }
}

// Helper to compute status badge styles
function getStatusBadge(status) {
  switch (status) {
    case "Registration Open":
    case "Active":
    case "Ongoing":
      return {
        label: status,
        className: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20",
      };
    case "Upcoming":
      return {
        label: "Upcoming",
        className: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-500/20",
      };
    case "Draft":
      return {
        label: "Draft",
        className: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-500/20",
      };
    case "Registration Closed":
    case "Completed":
      return {
        label: status,
        className: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700",
      };
    default:
      return {
        label: status || "Published",
        className: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400",
      };
  }
}

function OrganizerDashboardPage() {
  const { user } = useAuth();
  const [hackathons, setHackathons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchMyHackathons() {
      try {
        setLoading(true);
        const data = await hackathonService.getMyHackathons();
        if (isMounted) {
          setHackathons(data?.hackathons || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load dashboard hackathons.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    fetchMyHackathons();
    return () => {
      isMounted = false;
    };
  }, []);

  const totalCount = hackathons.length;
  const activeCount = hackathons.filter(
    (h) => h.status === "Registration Open" || h.status === "Ongoing" || h.status === "Active"
  ).length;
  const upcomingCount = hackathons.filter((h) => h.status === "Upcoming").length;
  const completedCount = hackathons.filter(
    (h) => h.status === "Completed" || h.status === "Registration Closed"
  ).length;

  const recentHackathons = hackathons.slice(0, 5);

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* ── Welcome Banner ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-200/80 bg-white p-6 sm:p-8 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <div className="space-y-1 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            ORGANIZER PORTAL
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl dark:text-white">
            Welcome back, {user?.name || "Organizer"}
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Create and manage your hackathons from one place.
          </p>
        </div>

        <div>
          <Link
            to="/organizer/create"
            className="
              inline-flex
              items-center
              gap-2
              rounded-xl
              bg-indigo-600
              px-5
              py-2.5
              text-xs
              font-semibold
              text-white
              shadow-sm
              transition-colors
              hover:bg-indigo-500
              dark:bg-indigo-500
              dark:hover:bg-indigo-400
            "
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Create Hackathon</span>
          </Link>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-600 dark:border-red-900/50 dark:bg-red-950/60 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800/60" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800/60" />
        </div>
      ) : (
        <>
          {/* Status Breakdown Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-neutral-200/80 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                Total Organized
              </span>
              <p className="mt-2 text-2xl font-extrabold text-neutral-900 dark:text-white">
                {totalCount}
              </p>
            </div>

            <div className="rounded-xl border border-neutral-200/80 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Open / Active
              </span>
              <p className="mt-2 text-2xl font-extrabold text-neutral-900 dark:text-white">
                {activeCount}
              </p>
            </div>

            <div className="rounded-xl border border-neutral-200/80 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Upcoming
              </span>
              <p className="mt-2 text-2xl font-extrabold text-neutral-900 dark:text-white">
                {upcomingCount}
              </p>
            </div>

            <div className="rounded-xl border border-neutral-200/80 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Completed
              </span>
              <p className="mt-2 text-2xl font-extrabold text-neutral-900 dark:text-white">
                {completedCount}
              </p>
            </div>
          </div>

          {/* Recent Hackathons Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
                  Recent Hackathons
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Your most recently published hackathons.
                </p>
              </div>

              {totalCount > 0 && (
                <Link
                  to="/organizer/hackathons"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  View All ({totalCount}) →
                </Link>
              )}
            </div>

            {recentHackathons.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {recentHackathons.map((h) => {
                  const badge = getStatusBadge(h.status);

                  return (
                    <div
                      key={h.id}
                      className="
                        flex
                        flex-col
                        justify-between
                        gap-4
                        rounded-2xl
                        border
                        border-neutral-200/90
                        bg-white
                        p-6
                        shadow-xs
                        transition-all
                        hover:border-neutral-300
                        dark:border-neutral-800
                        dark:bg-neutral-900
                        dark:hover:border-neutral-700
                        sm:flex-row
                        sm:items-center
                      "
                    >
                      <div className="space-y-2 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h3 className="text-base font-bold tracking-tight text-neutral-900 dark:text-white">
                            {h.title || h.name}
                          </h3>
                          <span
                            className={`
                              rounded-md
                              px-2.5
                              py-0.5
                              text-[10px]
                              font-bold
                              uppercase
                              tracking-wide
                              ${badge.className}
                            `}
                          >
                            {badge.label}
                          </span>
                          <span className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                            {h.format || h.mode || "Online"}
                          </span>
                        </div>

                        <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
                          {h.shortDescription || h.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-neutral-500 dark:text-neutral-400 pt-1">
                          <span>Deadline: {formatDate(h.registrationDeadline)}</span>
                          <span>Start: {formatDate(h.startDate || h.hackathonDate)}</span>
                          <span>End: {formatDate(h.endDate || h.eventEndDate)}</span>
                          {h.createdAt && <span>Created: {formatDate(h.createdAt)}</span>}
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                        <Link
                          to={`/hackathons/${h.id}`}
                          className="
                            inline-flex
                            items-center
                            gap-1
                            rounded-lg
                            border
                            border-neutral-200
                            bg-white
                            px-3.5
                            py-2
                            text-xs
                            font-semibold
                            text-neutral-700
                            transition-colors
                            hover:bg-neutral-50
                            dark:border-neutral-800
                            dark:bg-neutral-900
                            dark:text-neutral-300
                            dark:hover:bg-neutral-800
                          "
                        >
                          <span>View</span>
                        </Link>

                        <Link
                          to={`/organizer/hackathons/${h.id}/edit`}
                          className="
                            inline-flex
                            items-center
                            gap-1.5
                            rounded-lg
                            bg-neutral-950
                            px-3.5
                            py-2
                            text-xs
                            font-semibold
                            text-white
                            transition-colors
                            hover:bg-neutral-800
                            dark:bg-white
                            dark:text-neutral-950
                            dark:hover:bg-neutral-200
                          "
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          <span>Edit</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Empty State */
              <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-10 text-center dark:border-neutral-800 dark:bg-neutral-900 space-y-4">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                    Create your first hackathon
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                    Publish your hackathon on getHack and help developers discover it.
                  </p>
                </div>

                <Link
                  to="/organizer/create"
                  className="
                    inline-flex
                    items-center
                    gap-2
                    rounded-lg
                    bg-indigo-600
                    px-4
                    py-2.5
                    text-xs
                    font-semibold
                    text-white
                    shadow-xs
                    transition-colors
                    hover:bg-indigo-500
                    dark:bg-indigo-500
                    dark:hover:bg-indigo-400
                  "
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Create Hackathon</span>
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}

export default OrganizerDashboardPage;
