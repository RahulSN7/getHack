// ---------------------------------------------------------------------------
// OrganizerLayout.jsx — Dedicated Layout & Navigation for Organizer Portal
// Standardized container layout matching getHack design language.
// ---------------------------------------------------------------------------

import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

function OrganizerLayout() {
  const location = useLocation();

  // Helper to check if current route matches
  const isDashboardActive = location.pathname === "/organizer";
  const isHackathonsActive =
    location.pathname === "/organizer/hackathons" ||
    location.pathname.startsWith("/organizer/hackathons/");
  const isCreateActive = location.pathname === "/organizer/hackathons/create";
  const isProfileActive = location.pathname === "/organizer/profile";

  return (
    <div className="min-h-screen bg-slate-50 text-neutral-900 transition-colors dark:bg-neutral-950 dark:text-neutral-100">
      {/* ── Organizer Header Banner ── */}
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mx-auto max-w-7xl px-5 pt-5 pb-0 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">
                ORGANIZER PORTAL
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <Link
                  to="/organizer"
                  className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white"
                >
                  get<span className="text-indigo-500">Hack</span>{" "}
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 rounded px-2 py-0.5 ml-1">
                    Organizer
                  </span>
                </Link>
              </div>
            </div>

            {/* Right Action: Switch to Participant View */}
            <div className="flex items-center gap-3">
              <Link
                to="/hackathons"
                className="
                  inline-flex
                  items-center
                  gap-1.5
                  rounded-lg
                  border
                  border-neutral-200
                  bg-white
                  px-3.5
                  py-1.5
                  text-xs
                  font-semibold
                  text-neutral-700
                  transition-colors
                  hover:bg-neutral-50
                  hover:text-neutral-900
                  dark:border-neutral-800
                  dark:bg-neutral-900
                  dark:text-neutral-300
                  dark:hover:bg-neutral-800
                  dark:hover:text-white
                "
              >
                <span>Participant View</span>
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </Link>
            </div>
          </div>

          {/* ── Primary Navigation Tabs ── */}
          <nav className="flex items-center gap-1 overflow-x-auto pt-2">
            <NavLink
              to="/organizer"
              end
              className={({ isActive }) =>
                `inline-flex items-center gap-2 border-b-2 px-3 pb-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                  isActive || isDashboardActive
                    ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                    : "border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                }`
              }
            >
              <span>Dashboard</span>
            </NavLink>

            <NavLink
              to="/organizer/hackathons"
              className={({ isActive }) =>
                `inline-flex items-center gap-2 border-b-2 px-3 pb-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                  isActive || (isHackathonsActive && !isCreateActive)
                    ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                    : "border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                }`
              }
            >
              <span>Hackathons</span>
            </NavLink>

            <NavLink
              to="/organizer/hackathons/create"
              className={({ isActive }) =>
                `inline-flex items-center gap-2 border-b-2 px-3 pb-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                  isActive || isCreateActive
                    ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                    : "border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                }`
              }
            >
              <span>Create Hackathon</span>
            </NavLink>

            <NavLink
              to="/organizer/profile"
              className={({ isActive }) =>
                `inline-flex items-center gap-2 border-b-2 px-3 pb-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                  isActive || isProfileActive
                    ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                    : "border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                }`
              }
            >
              <span>Profile</span>
            </NavLink>
          </nav>
        </div>
      </header>

      {/* ── Main Organizer Content Area ── */}
      <Outlet />
    </div>
  );
}

export default OrganizerLayout;
