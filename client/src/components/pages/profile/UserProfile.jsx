// ---------------------------------------------------------------------------
// UserProfile — Professional Developer Profile Component (/profile/:id)
// Production-quality community profile for Find Teammates members
// ---------------------------------------------------------------------------

import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { TEAMMATES } from "../../../data/teammates";
import { ACCENT_TEXT, ACCENT_BG_SOFT } from "../../../constants/themeTokens";

// ---------------------------------------------------------------------------
// Availability badge rendering (strictly 2 states)
// ---------------------------------------------------------------------------

function AvailabilityBadge({ availability }) {
  const isAvailable = availability === "Available";

  if (isAvailable) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Available
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
      <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500" />
      Not Available
    </span>
  );
}

// ---------------------------------------------------------------------------
// UserProfile Component
// ---------------------------------------------------------------------------

function UserProfile() {
  const { id } = useParams();
  const [connected, setConnected] = useState(false);

  // Find user by ID or username
  const user = TEAMMATES.find(
    (m) => m.id === id || (m.username && m.username.toLowerCase() === id.toLowerCase())
  );

  // ---------------------------------------------------------------------------
  // Profile Not Found Fallback (404)
  // ---------------------------------------------------------------------------

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <div className="mx-auto max-w-7xl px-5 py-16 text-center sm:px-6 lg:px-8">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
              <line x1="18" y1="8" x2="23" y2="13" />
              <line x1="23" y1="8" x2="18" y2="13" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Profile not found
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            The profile you're looking for doesn't exist or is no longer available.
          </p>
          <div className="mt-6">
            <Link
              to="/teammates"
              className="inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5" />
                <path d="m12 19-7-7 7-7" />
              </svg>
              <span>Back to Find Members</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const {
    name,
    username,
    headline,
    role,
    skills = [],
    interests = [],
    experience,
    bio,
    location,
    email,
    showEmail,
    availability,
    hackathonsCompleted = 0,
    accent = "indigo",
    github,
    linkedin,
    portfolio,
  } = user;

  const accentText = ACCENT_TEXT[accent] || ACCENT_TEXT.indigo;
  const accentBgSoft = ACCENT_BG_SOFT[accent] || ACCENT_BG_SOFT.indigo;
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div className="min-h-screen bg-slate-50 text-neutral-900 transition-colors dark:bg-neutral-950 dark:text-neutral-100">
      {/* ── Top Navigation Bar ── */}
      <div className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mx-auto max-w-3xl px-5 py-4 sm:px-6 lg:px-8">
          <Link
            to="/teammates"
            className="
              inline-flex
              items-center
              gap-1.5
              text-xs
              font-semibold
              text-neutral-500
              transition-colors
              hover:text-neutral-900
              dark:text-neutral-400
              dark:hover:text-white
            "
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
            <span>Back to Find Members</span>
          </Link>
        </div>
      </div>

      {/* ── Main Profile Body (Single Column, Editorial Spacing) ── */}
      <main className="mx-auto max-w-3xl px-5 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* ── 1. Profile Header ── */}
        <section className="space-y-4">
          <div className="flex items-start gap-4 sm:gap-5">
            {/* Avatar */}
            <div
              className={`
                grid
                h-16
                w-16
                shrink-0
                place-items-center
                rounded-2xl
                text-xl
                font-bold
                ${accentBgSoft}
                ${accentText}
              `}
            >
              {initials}
            </div>

            {/* Identity & Headline */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
                  {name}
                </h1>
                {username && (
                  <span className="text-xs font-mono font-medium text-neutral-400 dark:text-neutral-500">
                    @{username}
                  </span>
                )}
              </div>

              <p className="mt-1 text-sm font-medium text-neutral-600 dark:text-neutral-300">
                {headline || role}
              </p>

              {/* Status & Location Meta */}
              <div className="mt-3 flex flex-wrap items-center gap-2.5 text-xs">
                <AvailabilityBadge availability={availability} />
                {location ? (
                  <>
                    <span className="text-neutral-300 dark:text-neutral-700">·</span>
                    <span className="inline-flex items-center gap-1 font-medium text-neutral-600 dark:text-neutral-400">
                      <svg
                        className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <span>{location}</span>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-neutral-300 dark:text-neutral-700">·</span>
                    <span className="font-medium text-neutral-500 dark:text-neutral-400">
                      Remote
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Social & Contact Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {github && (
              <a
                href={github}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${name}'s GitHub profile`}
                className="
                  inline-flex
                  items-center
                  gap-1.5
                  rounded-lg
                  border
                  border-neutral-200
                  bg-white
                  px-3
                  py-1.5
                  text-xs
                  font-semibold
                  text-neutral-700
                  transition-colors
                  hover:border-neutral-300
                  hover:text-neutral-900
                  dark:border-neutral-800
                  dark:bg-neutral-900
                  dark:text-neutral-300
                  dark:hover:border-neutral-700
                  dark:hover:text-white
                "
              >
                <span>GitHub</span>
                <svg
                  className="h-3 w-3 text-neutral-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            )}

            {linkedin && (
              <a
                href={linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${name}'s LinkedIn profile`}
                className="
                  inline-flex
                  items-center
                  gap-1.5
                  rounded-lg
                  border
                  border-neutral-200
                  bg-white
                  px-3
                  py-1.5
                  text-xs
                  font-semibold
                  text-neutral-700
                  transition-colors
                  hover:border-neutral-300
                  hover:text-neutral-900
                  dark:border-neutral-800
                  dark:bg-neutral-900
                  dark:text-neutral-300
                  dark:hover:border-neutral-700
                  dark:hover:text-white
                "
              >
                <span>LinkedIn</span>
                <svg
                  className="h-3 w-3 text-neutral-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            )}

            {portfolio && (
              <a
                href={portfolio}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${name}'s Portfolio`}
                className="
                  inline-flex
                  items-center
                  gap-1.5
                  rounded-lg
                  border
                  border-neutral-200
                  bg-white
                  px-3
                  py-1.5
                  text-xs
                  font-semibold
                  text-neutral-700
                  transition-colors
                  hover:border-neutral-300
                  hover:text-neutral-900
                  dark:border-neutral-800
                  dark:bg-neutral-900
                  dark:text-neutral-300
                  dark:hover:border-neutral-700
                  dark:hover:text-white
                "
              >
                <span>Portfolio</span>
                <svg
                  className="h-3 w-3 text-neutral-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            )}

            {showEmail && email && (
              <a
                href={`mailto:${email}`}
                aria-label={`Send email to ${name}`}
                className="
                  inline-flex
                  items-center
                  gap-1.5
                  rounded-lg
                  border
                  border-neutral-200
                  bg-white
                  px-3
                  py-1.5
                  text-xs
                  font-semibold
                  text-neutral-700
                  transition-colors
                  hover:border-neutral-300
                  hover:text-neutral-900
                  dark:border-neutral-800
                  dark:bg-neutral-900
                  dark:text-neutral-300
                  dark:hover:border-neutral-700
                  dark:hover:text-white
                "
              >
                <svg
                  className="h-3.5 w-3.5 text-neutral-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <span>Email</span>
              </a>
            )}
          </div>
        </section>

        <div className="border-t border-neutral-200 dark:border-neutral-800" />

        {/* ── 2. ABOUT ── */}
        {bio && (
          <section className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              ABOUT
            </h2>
            <p className="text-sm sm:text-base leading-relaxed text-neutral-700 dark:text-neutral-300">
              {bio}
            </p>
          </section>
        )}

        {/* ── 3. SKILLS ── */}
        {skills.length > 0 && (
          <section className="space-y-2.5 border-t border-neutral-100 pt-8 dark:border-neutral-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              SKILLS
            </h2>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className={`inline-flex items-center rounded-md px-3 py-1 text-xs font-semibold ${accentBgSoft} ${accentText}`}
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* ── 4. INTERESTED IN ── */}
        {interests.length > 0 && (
          <section className="space-y-2.5 border-t border-neutral-100 pt-8 dark:border-neutral-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              INTERESTED IN
            </h2>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => (
                <span
                  key={interest}
                  className="inline-flex items-center rounded-md border border-neutral-200/90 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
                >
                  {interest}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* ── 5. HACKATHON EXPERIENCE ── */}
        {hackathonsCompleted > 0 && (
          <section className="space-y-2 border-t border-neutral-100 pt-8 dark:border-neutral-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              HACKATHON EXPERIENCE
            </h2>
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              {hackathonsCompleted} {hackathonsCompleted === 1 ? "Hackathon" : "Hackathons"} completed
            </p>
          </section>
        )}

        {/* ── 6. EXPERIENCE ── */}
        {experience && (
          <section className="space-y-2 border-t border-neutral-100 pt-8 dark:border-neutral-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              EXPERIENCE
            </h2>
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              {experience}
            </p>
          </section>
        )}

        {/* ── 9. EMAIL CONTACT (conditional) ── */}
        {showEmail && email && (
          <section className="space-y-2 border-t border-neutral-100 pt-8 dark:border-neutral-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              EMAIL
            </h2>
            <a
              href={`mailto:${email}`}
              className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              {email}
            </a>
          </section>
        )}

        {/* ── 10. CONNECT CTA ── */}
        <section className="border-t border-neutral-100 pt-8 dark:border-neutral-800">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Want to team up? Send a connection request to start collaborating.
            </p>

            <button
              type="button"
              onClick={() => setConnected(true)}
              className={`
                inline-flex
                w-full
                sm:w-auto
                items-center
                justify-center
                gap-2
                rounded-lg
                px-6
                py-2.5
                text-xs
                font-semibold
                shadow-xs
                transition-all
                duration-150
                focus-visible:outline
                focus-visible:outline-2
                focus-visible:outline-indigo-500
                ${
                  connected
                    ? "bg-emerald-600 text-white dark:bg-emerald-500 hover:bg-emerald-700"
                    : "bg-indigo-600 text-white hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                }
              `}
            >
              {connected ? (
                <>
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Request Sent</span>
                </>
              ) : (
                <span>Connect</span>
              )}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default UserProfile;
