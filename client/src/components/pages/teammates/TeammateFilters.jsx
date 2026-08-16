// ---------------------------------------------------------------------------
// TeammateFilters — filter popover for Find Teammates page
// Same popover pattern as HackathonFilters.jsx
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Render helper: radio-style option group (defined outside to avoid re-creation)
// ---------------------------------------------------------------------------

function OptionGroup({ label, options, value, onChange }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`
                rounded-md
                px-2.5
                py-1.5
                text-xs
                font-medium
                transition-all
                duration-150
                ${
                  active
                    ? "bg-indigo-500/10 text-indigo-600 ring-1 ring-indigo-500/30 dark:text-indigo-400 dark:ring-indigo-400/30"
                    : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100 dark:bg-neutral-800/60 dark:text-neutral-400 dark:hover:bg-neutral-800"
                }
              `}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter options
// ---------------------------------------------------------------------------

const ROLE_OPTIONS = [
  { id: "all", label: "All Roles" },
  { id: "frontend", label: "Frontend" },
  { id: "backend", label: "Backend" },
  { id: "fullstack", label: "Full Stack" },
  { id: "designer", label: "Designer" },
  { id: "ml", label: "ML / Data" },
  { id: "devops", label: "DevOps" },
  { id: "mobile", label: "Mobile" },
  { id: "blockchain", label: "Blockchain" },
  { id: "product", label: "Product" },
];

const EXPERIENCE_OPTIONS = [
  { id: "all", label: "All Levels" },
  { id: "Beginner", label: "Beginner" },
  { id: "Intermediate", label: "Intermediate" },
  { id: "Advanced", label: "Advanced" },
];

const AVAILABILITY_OPTIONS = [
  { id: "all", label: "All" },
  { id: "Available", label: "Available" },
  { id: "Not Available", label: "Not Available" },
];

const TEAM_STATUS_OPTIONS = [
  { id: "all", label: "All Teams" },
  { id: "Recruiting", label: "Looking for teammates" },
  { id: "Full", label: "Team complete" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function TeammateFilters({
  activeTab,
  roleFilter,
  experienceFilter,
  availabilityFilter,
  teamStatusFilter,
  onApply,
  onClear,
}) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);

  // Local draft state (only committed on Apply)
  const [draftRole, setDraftRole] = useState(roleFilter);
  const [draftExperience, setDraftExperience] = useState(experienceFilter);
  const [draftAvailability, setDraftAvailability] = useState(availabilityFilter);
  const [draftTeamStatus, setDraftTeamStatus] = useState(teamStatusFilter);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync drafts with props when popover opens
  const handleToggle = () => {
    if (!open) {
      setDraftRole(roleFilter);
      setDraftExperience(experienceFilter);
      setDraftAvailability(availabilityFilter);
      setDraftTeamStatus(teamStatusFilter);
    }
    setOpen((p) => !p);
  };

  const hasActiveFilters =
    activeTab === "members"
      ? roleFilter !== "all" || experienceFilter !== "all" || availabilityFilter !== "all"
      : teamStatusFilter !== "all";

  const handleApply = () => {
    onApply({
      roleFilter: draftRole,
      experienceFilter: draftExperience,
      availabilityFilter: draftAvailability,
      teamStatusFilter: draftTeamStatus,
    });
    setOpen(false);
  };

  const handleClear = () => {
    setDraftRole("all");
    setDraftExperience("all");
    setDraftAvailability("all");
    setDraftTeamStatus("all");
    onClear();
    setOpen(false);
  };

  return (
    <div ref={popoverRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={handleToggle}
        className={`
          inline-flex
          items-center
          gap-1.5
          rounded-lg
          border
          px-3
          py-1.5
          text-xs
          font-semibold
          transition-all
          duration-150
          ${
            hasActiveFilters
              ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:border-indigo-400/30 dark:text-indigo-400"
              : "border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-white"
          }
        `}
      >
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="8" y1="12" x2="20" y2="12" />
          <line x1="12" y1="18" x2="20" y2="18" />
        </svg>
        <span>Filters</span>
        {hasActiveFilters && (
          <span className="grid h-4 min-w-4 place-items-center rounded-full bg-indigo-500 px-1 text-[10px] font-bold text-white">
            {activeTab === "members"
              ? [roleFilter, experienceFilter, availabilityFilter].filter((f) => f !== "all").length
              : teamStatusFilter !== "all"
                ? 1
                : 0}
          </span>
        )}
      </button>

      {/* Popover */}
      {open && (
        <div
          className="
            absolute
            left-0
            top-[calc(100%+8px)]
            z-40
            w-72
            overflow-hidden
            rounded-xl
            border
            border-neutral-200
            bg-white
            shadow-lg
            shadow-neutral-950/8
            dark:border-neutral-800
            dark:bg-neutral-900
            dark:shadow-neutral-950/40
          "
        >
          <div className="space-y-4 p-4">
            {activeTab === "members" ? (
              <>
                <OptionGroup
                  label="Role"
                  options={ROLE_OPTIONS}
                  value={draftRole}
                  onChange={setDraftRole}
                />
                <OptionGroup
                  label="Experience"
                  options={EXPERIENCE_OPTIONS}
                  value={draftExperience}
                  onChange={setDraftExperience}
                />
                <OptionGroup
                  label="Availability"
                  options={AVAILABILITY_OPTIONS}
                  value={draftAvailability}
                  onChange={setDraftAvailability}
                />
              </>
            ) : (
              <OptionGroup
                label="Team Status"
                options={TEAM_STATUS_OPTIONS}
                value={draftTeamStatus}
                onChange={setDraftTeamStatus}
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-3 dark:border-neutral-800">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="rounded-lg bg-neutral-950 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeammateFilters;
