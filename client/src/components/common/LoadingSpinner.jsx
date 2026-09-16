import React from "react";

/**
 * Reusable LoadingSpinner component for getHack
 * Supports small/medium/large sizes, theme colors, accessible status role, and optional text.
 */
export default function LoadingSpinner({
  size = "md",
  className = "",
  label = "Loading...",
  fullContainer = false,
}) {
  const sizeClasses = {
    sm: "h-4 w-4 stroke-[2.5]",
    md: "h-6 w-6 stroke-2",
    lg: "h-10 w-10 stroke-2",
  };

  const spinner = (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      className={`inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 ${className}`}
    >
      <svg
        className={`animate-spin ${sizeClasses[size] || sizeClasses.md}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {label && <span className="sr-only">{label}</span>}
    </div>
  );

  if (fullContainer) {
    return (
      <div className="flex min-h-[160px] w-full items-center justify-center p-6 text-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}
