// ---------------------------------------------------------------------------
// AuthLayout.jsx — Standalone Layout for Authentication Routes
// Renders minimal brand header without main website Header, nav, or theme toggle.
// ---------------------------------------------------------------------------

import { Link, Outlet } from "react-router-dom";

function AuthLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-neutral-900 transition-colors dark:bg-neutral-950 dark:text-neutral-100 flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8">
      {/* ── Top Subtle Brand Header ── */}
      <header className="mx-auto w-full max-w-[440px] text-center pt-2">
        <Link to="/" className="inline-flex items-center gap-2 group">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-neutral-950 text-base font-bold text-white transition-transform group-hover:scale-105 dark:bg-white dark:text-neutral-950">
            g
          </span>
          <span className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
            get<span className="text-indigo-500">Hack</span>
          </span>
        </Link>
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
