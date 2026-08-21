// ---------------------------------------------------------------------------
// HackathonFilters — compact filter button with popover UI
// Combines Status, Format & Platform filtering into a restrained popover UI.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import { ACCENT_TEXT, ACCENT_BG_SOFT } from "../../../constants/themeTokens";

const STATUS_OPTIONS = [
  { id: "all", label: "All Statuses" },
  { id: "registration-open", label: "Registration Open" },
  { id: "upcoming", label: "Upcoming" },
  { id: "live", label: "Live / Ongoing" },
  { id: "registration-closed", label: "Registration Closed" },
];

const PLATFORM_OPTIONS = [
  { id: "all", label: "All Platforms" },
  { id: "devpost", label: "Devpost" },
  { id: "devfolio", label: "Devfolio" },
  { id: "mlh", label: "MLH" },
  { id: "unstop", label: "Unstop" },
  { id: "dorahacks", label: "DoraHacks" },
  { id: "kaggle", label: "Kaggle" },
  { id: "hack2skill", label: "Hack2Skill" },
];

function HackathonFilters({
  statusFilter = "all",
  platformFilter = "all",
  onApply,
  onClear,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState(statusFilter);
  const [draftPlatform, setDraftPlatform] = useState(platformFilter);

  const popoverRef = useRef(null);
  const triggerRef = useRef(null);

  const handleToggleOpen = () => {
    if (!isOpen) {
      setDraftStatus(statusFilter);
      setDraftPlatform(platformFilter);
    }
    setIsOpen((prev) => !prev);
  };

  const activeCount =
    (statusFilter !== "all" ? 1 : 0) +
    (platformFilter !== "all" ? 1 : 0);
  const hasActiveFilters = activeCount > 0;

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleApply = () => {
    onApply({
      statusFilter: draftStatus,
      platformFilter: draftPlatform,
    });
    setIsOpen(false);
  };

  const handleClear = () => {
    setDraftStatus("all");
    setDraftPlatform("all");
    onClear();
    setIsOpen(false);
  };

  const accentText = ACCENT_TEXT.indigo;
  const accentBgSoft = ACCENT_BG_SOFT.indigo;

  return (
    <div className="relative inline-block text-left">
      {/* ── Trigger Button ── */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggleOpen}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Filter hackathons${
          hasActiveFilters ? `, ${activeCount} filter active` : ""
        }`}
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
            hasActiveFilters || isOpen
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
            {activeCount}
          </span>
        )}
      </button>

      {/* ── Popover Panel ── */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="
            absolute
            left-0
            z-30
            mt-2
            w-80
            max-h-[85vh]
            overflow-y-auto
            rounded-xl
            border
            border-neutral-200
            bg-white
            p-4
            shadow-xl
            shadow-neutral-950/10
            dark:border-neutral-800
            dark:bg-neutral-900
            dark:shadow-neutral-950/50
          "
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3 dark:border-neutral-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
              FILTERS
            </h3>
            {hasActiveFilters && (
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {activeCount} active
              </span>
            )}
          </div>

          <div className="mt-3.5 space-y-4">
            {/* Status Section */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Status
              </label>
              <div className="mt-2 space-y-1">
                {STATUS_OPTIONS.map((option) => {
                  const isSelected = draftStatus === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setDraftStatus(option.id)}
                      className={`
                        flex
                        w-full
                        items-center
                        justify-between
                        rounded-lg
                        px-2.5
                        py-1.5
                        text-xs
                        font-medium
                        transition-colors
                        duration-150
                        ${
                          isSelected
                            ? `${accentBgSoft} ${accentText}`
                            : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                        }
                      `}
                    >
                      <span>{option.label}</span>
                      {isSelected && (
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Platform Section */}
            <div className="border-t border-neutral-100 pt-3 dark:border-neutral-800">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Platform
              </label>
              <div className="mt-2 grid grid-cols-2 gap-1">
                {PLATFORM_OPTIONS.map((option) => {
                  const isSelected = draftPlatform === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setDraftPlatform(option.id)}
                      className={`
                        rounded-lg
                        px-2
                        py-1.5
                        text-left
                        text-xs
                        font-medium
                        transition-colors
                        duration-150
                        ${
                          isSelected
                            ? `${accentBgSoft} ${accentText}`
                            : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                        }
                      `}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
            <button
              type="button"
              onClick={handleClear}
              className="
                rounded-lg
                px-3
                py-1.5
                text-xs
                font-medium
                text-neutral-500
                transition-colors
                hover:bg-neutral-100
                hover:text-neutral-800
                dark:text-neutral-400
                dark:hover:bg-neutral-800
                dark:hover:text-neutral-200
              "
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="
                rounded-lg
                bg-indigo-600
                px-3.5
                py-1.5
                text-xs
                font-semibold
                text-white
                shadow-sm
                transition-colors
                hover:bg-indigo-500
                focus-visible:outline
                focus-visible:outline-2
                focus-visible:outline-indigo-500
                dark:bg-indigo-500
                dark:hover:bg-indigo-400
              "
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default HackathonFilters;
