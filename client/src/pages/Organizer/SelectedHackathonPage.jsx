// ---------------------------------------------------------------------------
// SelectedHackathonPage.jsx — Selected Hackathon Context Layout & Sub-Tabs
// Standardized container layout matching getHack design language.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  HACKATHON_ANNOUNCEMENTS,
  HACKATHON_SETTINGS,
  HACKATHON_SUBMISSIONS,
  HACKATHON_TIMELINE,
  ORGANIZER_HACKATHONS,
} from "../../data/organizerData";

function SelectedHackathonPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("overview"); // overview | submissions | timeline | announcements | settings

  // Match selected hackathon or fallback
  const hackathon =
    ORGANIZER_HACKATHONS.find((h) => h.id === id) || ORGANIZER_HACKATHONS[0];

  const submissions = HACKATHON_SUBMISSIONS[hackathon.id] || HACKATHON_SUBMISSIONS["hack-for-good-2025"] || [];
  const timeline = HACKATHON_TIMELINE[hackathon.id] || HACKATHON_TIMELINE["hack-for-good-2025"] || [];
  const announcements = HACKATHON_ANNOUNCEMENTS[hackathon.id] || HACKATHON_ANNOUNCEMENTS["hack-for-good-2025"] || [];
  const settings = HACKATHON_SETTINGS[hackathon.id] || HACKATHON_SETTINGS["hack-for-good-2025"];

  return (
    <div>
      {/* ── Contextual Selected Hackathon Header ── */}
      <div className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mx-auto max-w-7xl px-5 pt-5 pb-0 sm:px-6 lg:px-8">
          <Link
            to="/organizer/hackathons"
            className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white mb-2"
          >
            <span>← Back to Hackathons</span>
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-4 pb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl dark:text-white">
                  {hackathon.name}
                </h1>
                <span className="rounded-md bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                  {hackathon.status} · {hackathon.registrationStatus}
                </span>
              </div>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Dates: {hackathon.hackathonDate} · Prize: {hackathon.prizePool}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className="
                  inline-flex
                  items-center
                  gap-1.5
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
                Edit Hackathon
              </button>

              <Link
                to={`/hackathons/${hackathon.id}`}
                target="_blank"
                className="
                  inline-flex
                  items-center
                  gap-1
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
                <span>View Public Page</span>
              </Link>
            </div>
          </div>

          {/* ── Sub-Navigation Tabs ── */}
          <nav className="flex items-center gap-1 overflow-x-auto pt-2">
            {[
              { id: "overview", label: "Overview" },
              { id: "submissions", label: `Submissions (${submissions.length})` },
              { id: "timeline", label: "Timeline" },
              { id: "announcements", label: `Announcements (${announcements.length})` },
              { id: "settings", label: "Settings" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`
                  inline-flex
                  items-center
                  gap-2
                  border-b-2
                  px-3
                  pb-3
                  text-xs
                  font-semibold
                  transition-colors
                  whitespace-nowrap
                  ${
                    activeTab === tab.id
                      ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                      : "border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                  }
                `}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* ── Tab Contents ── */}
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* ── TAB 1: OVERVIEW ── */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Event Schedule</p>
                <p className="mt-2 text-base font-bold tracking-tight text-neutral-900 dark:text-white">
                  {hackathon.hackathonDate}
                </p>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Prize Pool</p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
                  {hackathon.prizePool}
                </p>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Project Submissions</p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {hackathon.submissionsCount}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-4">
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Quick Actions</h2>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("submissions")}
                  className="rounded-lg bg-neutral-100 px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                >
                  View Submissions
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("announcements")}
                  className="rounded-lg bg-neutral-100 px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                >
                  Post Announcement
                </button>
              </div>
            </div>
          </div>
        )}



        {/* ── TAB 4: SUBMISSIONS ── */}
        {activeTab === "submissions" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
              Project Submissions ({submissions.length})
            </h2>

            <div className="grid grid-cols-1 gap-4">
              {submissions.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-neutral-900 dark:text-white">{s.projectName}</h3>
                      <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">By Team {s.teamName}</p>
                    </div>
                    <span className="rounded-md bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                      {s.status}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-600 dark:text-neutral-300">{s.description}</p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {s.techStack.map((tech) => (
                      <span
                        key={tech}
                        className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 5: TIMELINE ── */}
        {activeTab === "timeline" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
              Event Timeline
            </h2>

            <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
              {timeline.map((item, idx) => (
                <div key={idx} className="flex items-start gap-4 pb-4 border-b border-neutral-100 last:border-0 last:pb-0 dark:border-neutral-800">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-indigo-500/10 text-xs font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                    {idx + 1}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">{item.title}</h3>
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{item.date}</p>
                    <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 6: ANNOUNCEMENTS ── */}
        {activeTab === "announcements" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
                Announcements ({announcements.length})
              </h2>
              <button
                type="button"
                className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
              >
                + Post Announcement
              </button>
            </div>

            <div className="space-y-3">
              {announcements.map((ann) => (
                <div key={ann.id} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">{ann.title}</h3>
                    <span className="text-xs text-neutral-400">{ann.date}</span>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300">{ann.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 7: SETTINGS ── */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
              Hackathon Settings
            </h2>

            <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-4">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">General Settings</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Visibility</label>
                  <select defaultValue={settings.visibility} className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white">
                    <option value="Public">Public (Visible to everyone)</option>
                    <option value="Unlisted">Unlisted (Invite only)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Registration Limit</label>
                  <input type="number" defaultValue={settings.maxParticipants} className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-red-200/60 bg-red-50/50 p-6 dark:border-red-900/30 dark:bg-red-950/20 space-y-3">
              <h3 className="text-sm font-bold text-red-600 dark:text-red-400">Danger Zone</h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">Cancel or unpublish this hackathon. This will prevent new registrations.</p>
              <button type="button" className="rounded-lg border border-red-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-800 dark:bg-neutral-900 dark:text-red-400 dark:hover:bg-red-950/50">
                Cancel Hackathon
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default SelectedHackathonPage;
