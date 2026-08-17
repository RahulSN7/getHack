// ---------------------------------------------------------------------------
// OrganizerHackathonsPage.jsx — Organizer Hackathons Management List
// Standardized container layout matching getHack design language.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { Link } from "react-router-dom";
import { ORGANIZER_HACKATHONS } from "../../data/organizerData";

function OrganizerHackathonsPage() {
  const [activeTab, setActiveTab] = useState("all"); // all | active | drafts | completed

  const filteredHackathons = ORGANIZER_HACKATHONS.filter((h) => {
    if (activeTab === "active") return h.status === "Active";
    if (activeTab === "drafts") return h.status === "Draft";
    if (activeTab === "completed") return h.status === "Completed";
    return true;
  });

  const activeCount = ORGANIZER_HACKATHONS.filter((h) => h.status === "Active").length;
  const draftCount = ORGANIZER_HACKATHONS.filter((h) => h.status === "Draft").length;
  const completedCount = ORGANIZER_HACKATHONS.filter((h) => h.status === "Completed").length;

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-indigo-500">
            ORGANIZER
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-white">
            My Hackathons
          </h1>
          <p className="mt-2 text-base text-neutral-500 dark:text-neutral-400">
            View and manage all your organized hackathons from one place.
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

      {/* ── Filter Tabs ── */}
      <div className="flex items-center gap-2 border-b border-neutral-200/80 pb-3 dark:border-neutral-800/80">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`
            inline-flex
            items-center
            gap-1.5
            rounded-md
            px-3
            py-1.5
            text-xs
            font-semibold
            transition-all
            duration-150
            ${
              activeTab === "all"
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800/60 dark:text-neutral-400 dark:hover:bg-neutral-800"
            }
          `}
        >
          <span>All</span>
          <span className="rounded px-1.5 py-0.2 text-[10px] font-bold bg-white/20">
            {ORGANIZER_HACKATHONS.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("active")}
          className={`
            inline-flex
            items-center
            gap-1.5
            rounded-md
            px-3
            py-1.5
            text-xs
            font-semibold
            transition-all
            duration-150
            ${
              activeTab === "active"
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800/60 dark:text-neutral-400 dark:hover:bg-neutral-800"
            }
          `}
        >
          <span>Active</span>
          <span className="rounded px-1.5 py-0.2 text-[10px] font-bold bg-white/20">
            {activeCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("drafts")}
          className={`
            inline-flex
            items-center
            gap-1.5
            rounded-md
            px-3
            py-1.5
            text-xs
            font-semibold
            transition-all
            duration-150
            ${
              activeTab === "drafts"
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800/60 dark:text-neutral-400 dark:hover:bg-neutral-800"
            }
          `}
        >
          <span>Drafts</span>
          <span className="rounded px-1.5 py-0.2 text-[10px] font-bold bg-white/20">
            {draftCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("completed")}
          className={`
            inline-flex
            items-center
            gap-1.5
            rounded-md
            px-3
            py-1.5
            text-xs
            font-semibold
            transition-all
            duration-150
            ${
              activeTab === "completed"
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800/60 dark:text-neutral-400 dark:hover:bg-neutral-800"
            }
          `}
        >
          <span>Completed</span>
          <span className="rounded px-1.5 py-0.2 text-[10px] font-bold bg-white/20">
            {completedCount}
          </span>
        </button>
      </div>

      {/* ── Hackathons List ── */}
      {filteredHackathons.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredHackathons.map((h) => (
            <div
              key={h.id}
              className="
                flex
                flex-col
                justify-between
                gap-4
                rounded-xl
                border
                border-neutral-200
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
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
                    {h.name}
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
                  <span className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    {h.registrationStatus}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                  <span>Dates: {h.hackathonDate}</span>
                  <span>Mode: {h.mode}</span>
                  <span>Prize Pool: {h.prizePool}</span>
                  <span>Registrations: {h.registrationsCount.toLocaleString()}</span>
                  <span>Teams: {h.teamsCount}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 pt-2 sm:pt-0">
                <Link
                  to={`/organizer/hackathons/${h.id}`}
                  className="
                    inline-flex
                    items-center
                    gap-1.5
                    rounded-lg
                    bg-neutral-950
                    px-4
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
                    px-3.5
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
                  <span>Public View</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
            No hackathons found
          </h3>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            There are no hackathons matching the selected filter.
          </p>
        </div>
      )}
    </main>
  );
}

export default OrganizerHackathonsPage;
