// ---------------------------------------------------------------------------
// AuthLayout.jsx — Standalone Layout for Authentication Routes
// Renders page-level "Back to landing page" navigation link & brand logo.
// ---------------------------------------------------------------------------

import { Link, Outlet } from "react-router-dom";

function AuthLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-neutral-900 transition-colors dark:bg-neutral-950 dark:text-neutral-100 flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8">
      {/* ── Top Header Navigation Bar ── */}
      <header className="mx-auto w-full max-w-[440px] pt-2">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/"
            className="
              group
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
              shadow-2xs
              transition-colors
              duration-150
              hover:border-neutral-300
              hover:bg-neutral-50
              hover:text-neutral-950
              dark:border-neutral-800
              dark:bg-neutral-900
              dark:text-neutral-300
              dark:hover:border-neutral-700
              dark:hover:bg-neutral-800/80
              dark:hover:text-white
            "
          >
            <svg
              className="h-3.5 w-3.5 transition-transform duration-150 group-hover:-translate-x-0.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Back</span>
          </Link>

          <Link to="/" className="inline-flex items-center gap-1.5 group">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-neutral-950 text-sm font-bold text-white transition-transform group-hover:scale-105 dark:bg-white dark:text-neutral-950">
              g
            </span>
            <span className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
              get<span className="text-indigo-500">Hack</span>
            </span>
          </Link>
        </div>
      </header>

      {/* ── Center Auth Content Area ── */}
      <main className="mx-auto w-full max-w-[440px] my-auto py-6">
        <Outlet />
      </main>

      {/* ── Bottom Subtle Footer ── */}
      <footer className="mx-auto w-full max-w-[440px] text-center text-[11px] font-medium tracking-wider text-neutral-400 dark:text-neutral-600">
        DISCOVER · CONNECT · COLLABORATE
      </footer>
    </div>
  );
}

export default AuthLayout;
