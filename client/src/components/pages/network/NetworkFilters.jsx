// ---------------------------------------------------------------------------
// NetworkFilters — filter popover for My Network / Collaborate page
// Same popover pattern as TeammateFilters.jsx & HackathonFilters.jsx
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// OptionGroup helper for radio-style filter choices
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
// MultiSelectSkills helper for multi-skill selection
// ---------------------------------------------------------------------------

function MultiSelectSkills({ label, skills, selectedSkills, onChange }) {
  if (!skills || skills.length === 0) return null;

  const toggleSkill = (skill) => {
    if (selectedSkills.includes(skill)) {
      onChange(selectedSkills.filter((s) => s !== skill));
    } else {
      onChange([...selectedSkills, skill]);
    }
  };

  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
        {label}
      </p>
      <div className="max-h-36 overflow-y-auto pr-1 flex flex-wrap gap-1.5 no-scrollbar">
        {skills.map((skill) => {
          const active = selectedSkills.includes(skill);
          return (
            <button
              key={skill}
              type="button"
              onClick={() => toggleSkill(skill)}
              className={`
                inline-flex
                items-center
                gap-1
                rounded-md
                px-2.5
                py-1
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
              <span>{skill}</span>
              {active && <span className="text-[10px] font-bold">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter Options Data
// ---------------------------------------------------------------------------

const AVAILABILITY_OPTIONS = [
  { id: "all", label: "All" },
  { id: "Available", label: "Available" },
  { id: "Not Available", label: "Not Available" },
];

const AGE_OPTIONS = [
  { id: "all", label: "All Time" },
  { id: "recent", label: "Recent (≤ 7 days)" },
  { id: "older", label: "Older (> 7 days)" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function NetworkFilters({
  activeTab,
  connAvailability,
  connRole,
  connSkills,
  availableRoles,
  availableSkills,
  requestAge,
  sentAge,
  onApply,
  onClear,
}) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);

  // Local draft states
  const [draftAvailability, setDraftAvailability] = useState(connAvailability);
  const [draftRole, setDraftRole] = useState(connRole);
  const [draftSkills, setDraftSkills] = useState(connSkills);
  const [draftRequestAge, setDraftRequestAge] = useState(requestAge);
  const [draftSentAge, setDraftSentAge] = useState(sentAge);

  // Close on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Sync draft states when opening popover
  const handleToggle = () => {
    if (!open) {
      setDraftAvailability(connAvailability);
      setDraftRole(connRole);
      setDraftSkills(connSkills);
      setDraftRequestAge(requestAge);
      setDraftSentAge(sentAge);
    }
    setOpen((p) => !p);
  };

  // Active filter count
  const activeCount =
    activeTab === "connections"
      ? (connAvailability !== "all" ? 1 : 0) +
        (connRole !== "all" ? 1 : 0) +
        connSkills.length
      : activeTab === "requests"
      ? requestAge !== "all"
        ? 1
        : 0
      : sentAge !== "all"
      ? 1
      : 0;

  const hasActiveFilters = activeCount > 0;

  // Role options derived safely
  const roleOptions = [
    { id: "all", label: "All Roles" },
    ...availableRoles.map((r) => ({ id: r, label: r })),
  ];

  const handleApply = () => {
    onApply({
      connAvailability: draftAvailability,
      connRole: draftRole,
      connSkills: draftSkills,
      requestAge: draftRequestAge,
      sentAge: draftSentAge,
    });
    setOpen(false);
  };

  const handleClear = () => {
    setDraftAvailability("all");
    setDraftRole("all");
    setDraftSkills([]);
    setDraftRequestAge("all");
    setDraftSentAge("all");
    onClear();
    setOpen(false);
  };

  return (
    <div ref={popoverRef} className="relative">
      {/* Trigger Button */}
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
        <span>Filter</span>
        {hasActiveFilters && (
          <span className="grid h-4 min-w-4 place-items-center rounded-full bg-indigo-500 px-1 text-[10px] font-bold text-white">
            {activeCount}
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
            {activeTab === "connections" && (
              <>
                <OptionGroup
                  label="Availability"
                  options={AVAILABILITY_OPTIONS}
                  value={draftAvailability}
                  onChange={setDraftAvailability}
                />
                <OptionGroup
                  label="Role"
                  options={roleOptions}
                  value={draftRole}
                  onChange={setDraftRole}
                />
                <MultiSelectSkills
                  label="Skills"
                  skills={availableSkills}
                  selectedSkills={draftSkills}
                  onChange={setDraftSkills}
                />
              </>
            )}

            {activeTab === "requests" && (
              <OptionGroup
                label="Request Age"
                options={AGE_OPTIONS}
                value={draftRequestAge}
                onChange={setDraftRequestAge}
              />
            )}

            {activeTab === "sent" && (
              <OptionGroup
                label="Request Age"
                options={AGE_OPTIONS}
                value={draftSentAge}
                onChange={setDraftSentAge}
              />
            )}
          </div>

          {/* Popover Footer Actions */}
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

export default NetworkFilters;
