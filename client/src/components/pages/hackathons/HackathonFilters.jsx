// ---------------------------------------------------------------------------
// HackathonFilters — compact filter button with popover UI
// Combines Status & Format filtering into a restrained, popover-based UI.
// Supports active filter count display, draft states, clear & apply.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import { ACCENT_TEXT, ACCENT_BG_SOFT } from "../../../constants/themeTokens";

const STATUS_OPTIONS = [
  { id: "all", label: "All" },
  { id: "registration-open", label: "Registration Open" },
  { id: "registration-closed", label: "Registration Closed" },
];

const FORMAT_OPTIONS = [
  { id: "all", label: "All" },
  { id: "online", label: "Online" },
  { id: "offline", label: "Offline" },
];

function HackathonFilters({
  statusFilter = "all",
  formatFilter = "all",
  onApply,
  onClear,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState(statusFilter);
  const [draftFormat, setDraftFormat] = useState(formatFilter);

  const popoverRef = useRef(null);
  const triggerRef = useRef(null);

  // Sync draft state when popover opens or props change
  useEffect(() => {
    setDraftStatus(statusFilter);
    setDraftFormat(formatFilter);
  }, [statusFilter, formatFilter, isOpen]);

  // Calculate active filters count
  const activeCount =
    (statusFilter !== "all" ? 1 : 0) + (formatFilter !== "all" ? 1 : 0);
  const hasActiveFilters = activeCount > 0;

  // Close on outside click
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
      formatFilter: draftFormat,
    });
    setIsOpen(false);
  };

  const handleClear = () => {
    setDraftStatus("all");
    setDraftFormat("all");
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
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Filter hackathons${
          hasActiveFilters ? `, ${activeCount} filter active` : ""
        }`}
        className={`
          inline-flex
          h-9
          items-center
          gap-2
          rounded-lg
          border
          px-3.5
          text-xs
          font-semibold
          transition-all
          duration-150
          focus-visible:outline
          focus-visible:outline-2
          focus-visible:outline-indigo-500
          ${
            hasActiveFilters || isOpen
              ? `${accentBgSoft} ${accentText} border-indigo-500/30 dark:border-indigo-400/30`
              : `
                border-neutral-200
                bg-white
                text-neutral-700
                hover:border-neutral-300
                hover:text-neutral-900
                dark:border-neutral-800
                dark:bg-neutral-900
                dark:text-neutral-300
                dark:hover:border-neutral-700
                dark:hover:text-white
              `
          }
        `}
      >
        {/* Filter Icon */}
        <svg
          className="h-3.5 w-3.5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>

        <span>Filter</span>

        {/* Active Filter Count Indicator */}
        {hasActiveFilters && (
          <span
            className={`
              inline-flex
              h-4
              min-w-4
              items-center
              justify-center
              rounded-full
              bg-indigo-500
              px-1
              text-[10px]
              font-bold
              text-white
            `}
          >
            {activeCount}
          </span>
        )}

        {/* Chevron Icon */}
        <svg
          className={`h-3 w-3 transition-transform duration-150 ${
            isOpen ? "rotate-180" : ""
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
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
            w-72
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
            sm:w-80
          "
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3 dark:border-neutral-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
              FILTER
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
              <div className="mt-2 space-y-1.5">
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
                      <span className="flex items-center gap-2">
                        <span
                          className={`
                            grid
                            h-3.5
                            w-3.5
                            place-items-center
                            rounded-full
                            border
                            ${
                              isSelected
                                ? "border-indigo-500 bg-indigo-500 dark:border-indigo-400 dark:bg-indigo-400"
                                : "border-neutral-300 dark:border-neutral-600"
                            }
                          `}
                        >
                          {isSelected && (
                            <span className="h-1.5 w-1.5 rounded-full bg-white dark:bg-neutral-950" />
                          )}
                        </span>
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Format Section */}
            <div className="border-t border-neutral-100 pt-3 dark:border-neutral-800">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Format
              </label>
              <div className="mt-2 space-y-1.5">
                {FORMAT_OPTIONS.map((option) => {
                  const isSelected = draftFormat === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setDraftFormat(option.id)}
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
                      <span className="flex items-center gap-2">
                        <span
                          className={`
                            grid
                            h-3.5
                            w-3.5
                            place-items-center
                            rounded-full
                            border
                            ${
                              isSelected
                                ? "border-indigo-500 bg-indigo-500 dark:border-indigo-400 dark:bg-indigo-400"
                                : "border-neutral-300 dark:border-neutral-600"
                            }
                          `}
                        >
                          {isSelected && (
                            <span className="h-1.5 w-1.5 rounded-full bg-white dark:bg-neutral-950" />
                          )}
                        </span>
                        {option.label}
                      </span>
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
