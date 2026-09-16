import React from "react";
import Skeleton from "./Skeleton";

/**
 * Reusable PageLoader for full page transitions / route loading
 * Renders a clean getHack header placeholder + content skeleton grid
 */
export default function PageLoader({ title = "Loading page..." }) {
  return (
    <div
      role="status"
      aria-label={title}
      aria-busy="true"
      className="min-h-[60vh] w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8"
    >
      <span className="sr-only">{title}</span>

      {/* Hero / Header Skeleton */}
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-4 w-32 rounded-md" />
        <Skeleton className="h-10 w-3/4 rounded-xl" />
        <Skeleton className="h-5 w-full rounded-lg" />
      </div>

      {/* Grid Content Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-neutral-200/80 bg-white p-6 dark:border-neutral-800/80 dark:bg-neutral-900 space-y-4"
          >
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-3/4 rounded-md" />
                <Skeleton className="h-4 w-1/2 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-16 w-full rounded-xl" />
            <div className="flex justify-between items-center pt-2">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
