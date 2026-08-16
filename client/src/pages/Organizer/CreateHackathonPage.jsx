// ---------------------------------------------------------------------------
// CreateHackathonPage.jsx — Multi-section Hackathon Creation Form
// Standardized container layout matching getHack design language.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function CreateHackathonPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    organizer: "TechCommunity India",
    shortDescription: "",
    fullDescription: "",
    registrationStart: "",
    registrationDeadline: "",
    eventStart: "",
    eventEnd: "",
    mode: "Online",
    location: "",
    prizePool: "",
    prizeDetails: "",
    themes: "",
    eligibility: "Open to developers, designers, and tech enthusiasts.",
    registrationUrl: "",
  });

  const [toastMessage, setToastMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveDraft = (e) => {
    e.preventDefault();
    setToastMessage("Hackathon draft saved successfully!");
    setTimeout(() => {
      setToastMessage("");
      navigate("/organizer/hackathons");
    }, 1500);
  };

  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* ── Page Header ── */}
      <div>
        <Link
          to="/organizer/hackathons"
          className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white mb-2"
        >
          <span>← Back to Hackathons</span>
        </Link>
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">
          ORGANIZER
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-white">
          Create Hackathon
        </h1>
        <p className="mt-2 text-base text-neutral-500 dark:text-neutral-400">
          Fill in the details to set up a new hackathon.
        </p>
      </div>

      {toastMessage && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-xs font-semibold text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/60 dark:text-indigo-300">
          {toastMessage}
        </div>
      )}

      {/* ── Multi-Section Form ── */}
      <form onSubmit={handleSaveDraft} className="space-y-8">
        {/* Section 1: Basic Information */}
        <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">
            1. Basic Information
          </h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Hackathon Name *
              </label>
              <input
                id="name"
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. AI Innovation Challenge 2026"
                className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white dark:focus:border-indigo-400"
              />
            </div>

            <div>
              <label htmlFor="organizer" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Organizer Name *
              </label>
              <input
                id="organizer"
                type="text"
                name="organizer"
                required
                value={formData.organizer}
                onChange={handleChange}
                className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white dark:focus:border-indigo-400"
              />
            </div>

            <div>
              <label htmlFor="shortDescription" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Short Description
              </label>
              <input
                id="shortDescription"
                type="text"
                name="shortDescription"
                value={formData.shortDescription}
                onChange={handleChange}
                placeholder="Brief one-line summary for hackathon cards"
                className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white dark:focus:border-indigo-400"
              />
            </div>

            <div>
              <label htmlFor="fullDescription" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Full Description
              </label>
              <textarea
                id="fullDescription"
                name="fullDescription"
                rows={4}
                value={formData.fullDescription}
                onChange={handleChange}
                placeholder="Detailed explanation of goals, tracks, guidelines, and benefits"
                className="w-full rounded-lg border border-neutral-200 bg-white p-3.5 text-sm text-neutral-900 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white dark:focus:border-indigo-400"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Event & Schedule */}
        <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">
            2. Event & Schedule
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="registrationDeadline" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Registration Deadline *
              </label>
              <input
                id="registrationDeadline"
                type="date"
                name="registrationDeadline"
                value={formData.registrationDeadline}
                onChange={handleChange}
                className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 outline-none transition-colors focus:border-indigo-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="mode" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Event Mode
              </label>
              <select
                id="mode"
                name="mode"
                value={formData.mode}
                onChange={handleChange}
                className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none transition-colors focus:border-indigo-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
              >
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>

            <div>
              <label htmlFor="eventStart" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Event Start Date
              </label>
              <input
                id="eventStart"
                type="date"
                name="eventStart"
                value={formData.eventStart}
                onChange={handleChange}
                className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 outline-none transition-colors focus:border-indigo-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="eventEnd" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Event End Date
              </label>
              <input
                id="eventEnd"
                type="date"
                name="eventEnd"
                value={formData.eventEnd}
                onChange={handleChange}
                className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 outline-none transition-colors focus:border-indigo-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Prizes & Themes */}
        <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">
            3. Prizes & Themes
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="prizePool" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Total Prize Pool
              </label>
              <input
                id="prizePool"
                type="text"
                name="prizePool"
                value={formData.prizePool}
                onChange={handleChange}
                placeholder="e.g. ₹1,000,000 or $5,000"
                className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 outline-none transition-colors focus:border-indigo-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="themes" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Themes & Tracks
              </label>
              <input
                id="themes"
                type="text"
                name="themes"
                value={formData.themes}
                onChange={handleChange}
                placeholder="e.g. Generative AI, Web3, Climate Tech"
                className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 outline-none transition-colors focus:border-indigo-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* ── Form Action Buttons ── */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <button
            type="submit"
            className="
              inline-flex
              items-center
              gap-2
              rounded-lg
              border
              border-neutral-200
              bg-white
              px-4
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
            Save Draft
          </button>

          <button
            type="submit"
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
            Publish Hackathon
          </button>
        </div>
      </form>
    </main>
  );
}

export default CreateHackathonPage;
