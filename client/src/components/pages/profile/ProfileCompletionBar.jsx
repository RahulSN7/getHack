// ---------------------------------------------------------------------------
// ProfileCompletionBar.jsx — Profile Completion Percentage Indicator Component
// Visual progress bar calculating real stored profile completeness
// ---------------------------------------------------------------------------

import React from "react";

const FIELD_LABELS = {
  name: "Name",
  avatar: "Profile Photo",
  role: "Role / Headline",
  bio: "Bio (min 10 chars)",
  skills: "At least 1 Skill",
  availability: "Availability",
  education: "Education / College",
  links: "GitHub, LinkedIn or Portfolio",
};

export default function ProfileCompletionBar({ profileCompletion, onEditClick }) {
  if (!profileCompletion) return null;

  const { percentage = 0, isComplete = false, missingFields = [] } = profileCompletion;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              Profile completion
            </h3>
            {isComplete ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                ✓ 100% Complete
              </span>
            ) : (
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {percentage}%
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {isComplete
              ? "Your profile is complete! You can send connection requests to teammates."
              : "Complete your profile to connect with teammates and improve matching recommendations."}
          </p>
        </div>

        {onEditClick && (
          <button
            type="button"
            onClick={onEditClick}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            <span>{isComplete ? "Edit Profile" : "Complete Profile"}</span>
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div
          className={`h-full transition-all duration-500 ${
            isComplete ? "bg-emerald-500" : "bg-indigo-600 dark:bg-indigo-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Missing Fields Checklist */}
      {!isComplete && missingFields.length > 0 && (
        <div className="mt-3.5 border-t border-neutral-100 pt-3 dark:border-neutral-800">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            Missing required items to complete profile:
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {missingFields.map((field) => (
              <span
                key={field}
                className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
              >
                <span>✗</span>
                <span>{FIELD_LABELS[field] || field}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
