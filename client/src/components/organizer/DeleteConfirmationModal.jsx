// ---------------------------------------------------------------------------
// DeleteConfirmationModal.jsx — Hackathon Deletion Confirmation Modal
// ---------------------------------------------------------------------------

import { useEffect } from "react";

function DeleteConfirmationModal({ isOpen, onClose, onConfirm, hackathonTitle, isDeleting }) {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs transition-opacity"
        onClick={!isDeleting ? onClose : undefined}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900 z-10 space-y-5">
        <div className="flex items-start gap-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/80 dark:text-red-400">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              Delete this hackathon?
            </h3>
            <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
              Are you sure you want to delete <span className="font-semibold text-neutral-900 dark:text-white">&quot;{hackathonTitle}&quot;</span>? This action cannot be undone.
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="
              rounded-lg
              border
              border-neutral-200
              bg-white
              px-4
              py-2
              text-xs
              font-semibold
              text-neutral-700
              transition-colors
              hover:bg-neutral-50
              disabled:opacity-50
              dark:border-neutral-800
              dark:bg-neutral-900
              dark:text-neutral-300
              dark:hover:bg-neutral-800
            "
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="
              inline-flex
              items-center
              gap-2
              rounded-lg
              bg-red-600
              px-4
              py-2
              text-xs
              font-semibold
              text-white
              shadow-xs
              transition-colors
              hover:bg-red-500
              disabled:opacity-60
              dark:bg-red-600
              dark:hover:bg-red-500
            "
          >
            {isDeleting ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10" />
                </svg>
                <span>Deleting...</span>
              </>
            ) : (
              <span>Delete Hackathon</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmationModal;
