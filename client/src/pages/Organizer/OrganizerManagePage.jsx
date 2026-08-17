// ---------------------------------------------------------------------------
// OrganizerManagePage.jsx — Organizer Hackathon Management Portal
// Standardized container layout matching getHack design language.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { Link } from "react-router-dom";
import { ORGANIZER_HACKATHONS } from "../../data/organizerData";

function OrganizerManagePage() {
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
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-indigo-500">
            ORGANIZER
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-white">
            Manage Hackathons
          </h1>
          <p className="mt-2 text-base text-neutral-500 dark:text-neutral-400">
            Monitor status, manage registrations, update schedules, and access organizer tools.
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

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200/80 pb-3 dark:border-neutral-800/80">
        {[
          { key: "all", label: "All", count: ORGANIZER_HACKATHONS.length },
          { key: "active", label: "Active", count: activeCount },
          { key: "drafts", label: "Drafts", count: draftCount },
          { key: "completed", label: "Completed", count: completedCount },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
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
                activeTab === tab.key
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800/60 dark:text-neutral-400 dark:hover:bg-neutral-800"
              }
            `}
          >
            <span>{tab.label}</span>
            <span className="rounded px-1.5 py-0.2 text-[10px] font-bold bg-white/20">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Hackathons Table / Cards */}
      {filteredHackathons.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500 uppercase tracking-wider dark:border-neutral-800 dark:bg-neutral-950/60 dark:text-neutral-400">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Hackathon Name</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                  <th className="px-6 py-3.5 font-semibold">Registration Deadline</th>
                  <th className="px-6 py-3.5 font-semibold">Participants</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/70 dark:divide-neutral-800/70">
                {filteredHackathons.map((h) => (
                  <tr key={h.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <Link
                          to={`/organizer/hackathons/${h.id}`}
                          className="font-bold text-neutral-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400 text-sm"
                        >
                          {h.name}
                        </Link>
                        <p className="mt-0.5 text-neutral-500 dark:text-neutral-400 text-[11px]">
                          {h.mode} · {h.prizePool}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`
                          inline-flex
                          items-center
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
                    </td>
                    <td className="px-6 py-4 text-neutral-600 dark:text-neutral-300 font-medium">
                      {h.hackathonDate}
                    </td>
                    <td className="px-6 py-4 text-neutral-600 dark:text-neutral-300 font-medium">
                      {h.registrationsCount > 0 ? (
                        <span>{h.registrationsCount.toLocaleString()} registered</span>
                      ) : (
                        <span className="text-neutral-400">0 registered</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/hackathons/${h.id}`}
                          target="_blank"
                          className="
                            rounded-lg
                            border
                            border-neutral-200
                            px-3
                            py-1.5
                            text-xs
                            font-semibold
                            text-neutral-600
                            transition-colors
                            hover:bg-neutral-100
                            dark:border-neutral-800
                            dark:text-neutral-400
                            dark:hover:bg-neutral-800
                          "
                        >
                          View
                        </Link>
                        <Link
                          to={`/organizer/hackathons/${h.id}`}
                          className="
                            rounded-lg
                            bg-neutral-950
                            px-3
                            py-1.5
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
                          Manage
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
            No hackathons in this state
          </h3>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Create your first hackathon or change your filter.
          </p>
          <Link
            to="/organizer/create"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            Create Hackathon
          </Link>
        </div>
      )}
    </main>
  );
}

export default OrganizerManagePage;
