// ---------------------------------------------------------------------------
// OrganizerProfilePage.jsx — Organizer Organization Profile Page
// Standardized container layout matching getHack design language.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { ORGANIZER_PROFILE } from "../../data/organizerData";

function OrganizerProfilePage() {
  const [profile, setProfile] = useState(ORGANIZER_PROFILE);
  const [isEditing, setIsEditing] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    setIsEditing(false);
    setToastMessage("Profile details updated successfully!");
    setTimeout(() => setToastMessage(""), 2000);
  };

  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-indigo-500">
            ORGANIZER
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-white">
            Organizer Profile
          </h1>
          <p className="mt-2 text-base text-neutral-500 dark:text-neutral-400">
            Manage your organization details, contact info, and public presence.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsEditing((p) => !p)}
          className="
            inline-flex
            items-center
            gap-1.5
            rounded-lg
            border
            border-neutral-200
            bg-white
            px-4
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
          {isEditing ? "Cancel" : "Edit Profile"}
        </button>
      </div>

      {toastMessage && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-xs font-semibold text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/60 dark:text-indigo-300">
          {toastMessage}
        </div>
      )}

      {/* ── Organization Card / Form ── */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-6">
        {!isEditing ? (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {profile.name}
                </h2>
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  {profile.organization} · {profile.location}
                </p>
              </div>
              <span className="rounded-md bg-indigo-500/10 px-2.5 py-1 text-xs font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                Verified Organizer
              </span>
            </div>

            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              {profile.description}
            </p>

            <div className="grid grid-cols-1 gap-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 sm:grid-cols-3 text-xs">
              <div>
                <span className="block font-medium text-neutral-400">Email Contact</span>
                <span className="font-semibold text-neutral-900 dark:text-white">{profile.email}</span>
              </div>
              <div>
                <span className="block font-medium text-neutral-400">Website</span>
                <a href={profile.website} target="_blank" rel="noreferrer" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
                  {profile.website}
                </a>
              </div>
              <div>
                <span className="block font-medium text-neutral-400">Organized Hackathons</span>
                <span className="font-semibold text-neutral-900 dark:text-white">{profile.totalHackathons} events</span>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Organization Name
              </label>
              <input
                id="name"
                type="text"
                name="name"
                value={profile.name}
                onChange={handleChange}
                className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 outline-none focus:border-indigo-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={profile.email}
                onChange={handleChange}
                className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 outline-none focus:border-indigo-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Organization Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={profile.description}
                onChange={handleChange}
                className="w-full rounded-lg border border-neutral-200 bg-white p-3.5 text-sm text-neutral-900 outline-none focus:border-indigo-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
              >
                Save Profile Changes
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

export default OrganizerProfilePage;
