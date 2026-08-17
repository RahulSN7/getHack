// ---------------------------------------------------------------------------
// OrganizerDashboardPage.jsx — Dedicated Organizer Landing & Overview Page
// Standardized container layout matching getHack design language.
// ---------------------------------------------------------------------------

import { Link } from "react-router-dom";
import { ORGANIZER_HACKATHONS } from "../../data/organizerData";

function OrganizerDashboardPage() {
  const activeHackathons = ORGANIZER_HACKATHONS.filter((h) => h.status === "Active");
  const draftHackathons = ORGANIZER_HACKATHONS.filter((h) => h.status === "Draft");
  const completedHackathons = ORGANIZER_HACKATHONS.filter((h) => h.status === "Completed");

  const hasHackathons = ORGANIZER_HACKATHONS.length > 0;

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8 space-y-12">
      {/* ── Organizer Hero Section ── */}
      <div className="rounded-2xl border border-neutral-200/80 bg-white p-8 sm:p-10 shadow-xs dark:border-neutral-800 dark:bg-neutral-900/90">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">
            ORGANIZER · CREATE · MANAGE · GROW
          </p>

          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl dark:text-white">
            Build and manage hackathons that bring developers and creators together.
          </h1>

          <p className="text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
            Empower developer communities, manage team registrations, launch problem statements, and coordinate submissions seamlessly on getHack.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-4">
            <Link
              to="/organizer/create"
              className="
                inline-flex
                items-center
                gap-2
                rounded-lg
                bg-indigo-600
                px-5
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

            <Link
              to="/organizer/manage"
              className="
                inline-flex
                items-center
                gap-2
                rounded-lg
                border
                border-neutral-200
                bg-white
                px-5
                py-2.5
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
              <span>Manage Hackathons</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Your Hackathons Overview ── */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Your Hackathons
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              Overview of your active, draft, and completed hackathons.
            </p>
          </div>

          <Link
            to="/organizer/hackathons"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            View All →
          </Link>
        </div>

        {/* Status Grid Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            to="/organizer/manage"
            className="group rounded-xl border border-neutral-200 bg-white p-6 shadow-xs transition-all hover:border-indigo-500/50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-indigo-500/50"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Active
              </span>
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                {activeHackathons.length}
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold text-neutral-900 dark:text-white">
              Manage your active hackathons
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Ongoing registrations and active submissions
            </p>
          </Link>

          <Link
            to="/organizer/manage"
            className="group rounded-xl border border-neutral-200 bg-white p-6 shadow-xs transition-all hover:border-amber-500/50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-amber-500/50"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Drafts
              </span>
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                {draftHackathons.length}
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold text-neutral-900 dark:text-white">
              Continue working on unpublished hackathons
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Draft events ready for publishing
            </p>
          </Link>

          <Link
            to="/organizer/manage"
            className="group rounded-xl border border-neutral-200 bg-white p-6 shadow-xs transition-all hover:border-emerald-500/50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-emerald-500/50"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Completed
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                {completedHackathons.length}
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold text-neutral-900 dark:text-white">
              View your completed hackathons
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Past events and winners archive
            </p>
          </Link>
        </div>

        {/* Recent Hackathons List */}
        {hasHackathons ? (
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
              Recent Hackathons
            </h3>

            <div className="grid grid-cols-1 gap-3">
              {ORGANIZER_HACKATHONS.slice(0, 3).map((h) => (
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
                      <h4 className="text-base font-semibold text-neutral-900 dark:text-white">
                        {h.name}
                      </h4>
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
                        {h.status}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Mode: {h.mode} · Prize: {h.prizePool} · Registrations: {h.registrationsCount.toLocaleString()}
                    </p>
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
              You haven&apos;t created a hackathon yet.
            </h3>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Create your first hackathon and start building a community around it.
            </p>
            <Link
              to="/organizer/create"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              Create Hackathon
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

export default OrganizerDashboardPage;
