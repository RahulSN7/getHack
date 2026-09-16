import React from "react";
import Skeleton from "./Skeleton";

/**
 * Reusable Skeleton card variants matching getHack's visual design system.
 */

export function HackathonCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading hackathon card"
      aria-busy="true"
      className="flex flex-col justify-between rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="space-y-4">
        {/* Header line & logo */}
        <div className="flex items-start justify-between gap-4">
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        {/* Title & Organization */}
        <div className="space-y-2">
          <Skeleton className="h-6 w-4/5 rounded-lg" />
          <Skeleton className="h-4 w-1/2 rounded-md" />
        </div>
        {/* Tags */}
        <div className="flex flex-wrap gap-2 pt-1">
          <Skeleton className="h-6 w-16 rounded-md" />
          <Skeleton className="h-6 w-20 rounded-md" />
          <Skeleton className="h-6 w-14 rounded-md" />
        </div>
      </div>
      {/* Footer */}
      <div className="mt-6 flex items-center justify-between border-t border-neutral-100 pt-4 dark:border-neutral-800">
        <Skeleton className="h-4 w-28 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>
    </div>
  );
}

export function TeammateCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading teammate profile"
      aria-busy="true"
      className="flex flex-col justify-between rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full shrink-0" />
          <div className="space-y-2 flex-1 min-w-0">
            <Skeleton className="h-5 w-3/4 rounded-md" />
            <Skeleton className="h-4 w-1/2 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-5 w-14 rounded-md" />
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-5 w-12 rounded-md" />
        </div>
      </div>
      <div className="mt-6 flex gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
        <Skeleton className="h-9 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 4 }) {
  return (
    <tr role="status" aria-busy="true" className="border-b border-neutral-100 dark:border-neutral-800">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          <div className="space-y-1 flex-1">
            <Skeleton className="h-4 w-36 rounded-md" />
            <Skeleton className="h-3 w-20 rounded-md" />
          </div>
        </div>
      </td>
      {Array.from({ length: cols - 1 }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <Skeleton className="h-4 w-24 rounded-md" />
        </td>
      ))}
    </tr>
  );
}
