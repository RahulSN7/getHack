// ---------------------------------------------------------------------------
// OrganizerDashboardPage.jsx — Organizer Overview Dashboard
// Standardized container layout matching getHack design language.
// ---------------------------------------------------------------------------

import { Link } from "react-router-dom";
import { ORGANIZER_HACKATHONS, ORGANIZER_PROFILE } from "../../data/organizerData";

function OrganizerDashboardPage() {
  const activeHackathons = ORGANIZER_HACKATHONS.filter((h) => h.status === "Active");
  const draftHackathons = ORGANIZER_HACKATHONS.filter((h) => h.status === "Draft");
  const completedHackathons = ORGANIZER_HACKATHONS.filter((h) => h.status === "Completed");

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* ── Page Header & Action Row ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-indigo-500">
            ORGANIZER
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-white">
            Dashboard
          </h1>
          <p className="mt-2 text-base text-neutral-500 dark:text-neutral-400">
            Manage your hackathons, participants, teams, and submissions.
          </p>
        </div>

        <Link
          to="/organizer/hackathons/create"
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

      {/* ── Summary Stats Grid ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Total Hackathons</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {ORGANIZER_PROFILE.totalHackathons}
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Active</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
            {activeHackathons.length}
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Drafts</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
            {draftHackathons.length}
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Completed</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {completedHackathons.length}
          </p>
        </div>
      </div>

      {/* ── Active & Recent Hackathons Section ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-white">
            Recent Hackathons
          </h2>
          <Link
            to="/organizer/hackathons"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            View All →
          </Link>
        </div>

        <div className="space-y-3">
          {ORGANIZER_HACKATHONS.slice(0, 4).map((h) => (
            <div
              key={h.id}
              className="
                flex
                flex-wrap
                items-center
                justify-between
                gap-4
                rounded-xl
                border
                border-neutral-200
                bg-white
                p-5
                shadow-xs
                transition-all
                hover:border-neutral-300
                dark:border-neutral-800
                dark:bg-neutral-900
                dark:hover:border-neutral-700
              "
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                    {h.name}
                  </h3>
                  <span
                    className={`
                      rounded-md
                      px-2
                      py-0.5
                      text-[10px]
                      font-bold
                      uppercase
                      tracking-wide
                      ${
                        h.status === "Active"
                          ? "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
                          : h.status === "Draft"
                          ? "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                          : "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                      }
                    `}
                  >
                    {h.status} · {h.registrationStatus}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                  <span>Mode: {h.mode}</span>
                  <span>Prize: {h.prizePool}</span>
                  <span>Registrations: {h.registrationsCount.toLocaleString()}</span>
                  <span>Teams: {h.teamsCount}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to={`/organizer/hackathons/${h.id}`}
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
                  <span>Manage</span>
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </Link>

                <Link
                  to={`/hackathons/${h.id}`}
                  target="_blank"
                  className="
                    inline-flex
                    items-center
                    gap-1
                    rounded-lg
                    border
                    border-neutral-200
                    px-3
                    py-2
                    text-xs
                    font-semibold
                    text-neutral-600
                    transition-colors
                    hover:bg-neutral-50
                    dark:border-neutral-800
                    dark:text-neutral-400
                    dark:hover:bg-neutral-800
                  "
                >
                  <span>View Public</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export default OrganizerDashboardPage;
