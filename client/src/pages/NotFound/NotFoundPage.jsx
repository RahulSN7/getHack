import { Link } from "react-router-dom";
import useSEO from "../../utils/useSEO";

function NotFoundPage() {
  useSEO(
    "Page Not Found — getHack",
    "The page you're looking for doesn't exist or may have been moved."
  );
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-slate-50 text-neutral-900 transition-colors dark:bg-neutral-950 dark:text-neutral-100">
      {/* 404 Main Body */}
      <main className="flex w-full flex-1 items-center justify-center px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="w-full max-w-md text-center">
          {/* Subtle 404 badge */}
          <div className="mb-4 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 dark:border-blue-500/20 dark:bg-blue-500/10">
            <span className="text-xs font-bold tracking-widest text-blue-600 uppercase dark:text-blue-400">
              404 Error
            </span>
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight text-neutral-900 sm:text-6xl dark:text-white">
            404
          </h1>

          <h2 className="mt-4 text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl dark:text-white">
            Looks like you’re off the hackathon map.
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            The page you’re looking for doesn’t exist or may have been moved.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/"
              className="inline-flex w-full items-center justify-center rounded-xl bg-[#2563EB] px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 sm:w-auto"
            >
              Back to Home
            </Link>

            <Link
              to="/hackathons"
              className="inline-flex w-full items-center justify-center rounded-xl border border-neutral-300 bg-white px-5 py-2.5 text-xs font-semibold text-neutral-700 shadow-2xs transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white sm:w-auto"
            >
              Browse Hackathons
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default NotFoundPage;
