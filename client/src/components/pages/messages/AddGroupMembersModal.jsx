// ---------------------------------------------------------------------------
// AddGroupMembersModal.jsx — Modal to add eligible connections to an existing group
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef } from "react";
import { userService } from "../../../services/userService";
import { chatService } from "../../../services/chatService";

export default function AddGroupMembersModal({
  isOpen,
  onClose,
  groupId,
  existingMemberIds = [],
  onMembersAdded,
}) {
  const [connections, setConnections] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const modalRef = useRef(null);

  const existingMemberSet = new Set(
    existingMemberIds.map((id) => String(id))
  );

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setSelectedIds([]);
    setLoading(true);
    setError(null);
    setSearchQuery("");
    setIsSubmitting(false);

    async function fetchConnections() {
      try {
        const data = await userService.getNetworkRequests();
        if (isMounted) {
          const connectionList = Array.isArray(data?.connections) ? data.connections : [];
          setConnections(connectionList);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to load connections:", err);
          setError("Failed to load connections.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchConnections();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const eligibleConnections = connections.filter((conn) => {
    const connUserId = String(conn.userId || conn.id);
    return !existingMemberSet.has(connUserId);
  });

  const filteredConnections = eligibleConnections.filter((conn) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = (conn.name || "").toLowerCase().includes(q);
    const roleMatch = (conn.role || "").toLowerCase().includes(q);
    return nameMatch || roleMatch;
  });

  const toggleSelect = (userId) => {
    const idStr = String(userId);
    setSelectedIds((prev) =>
      prev.includes(idStr) ? prev.filter((id) => id !== idStr) : [...prev, idStr]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedIds.length === 0 || isSubmitting || !groupId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await chatService.addGroupMembers(groupId, selectedIds);
      if (res?.success && res.group) {
        if (onMembersAdded) onMembersAdded(res.group);
        onClose();
      } else {
        setError(res?.message || "Failed to add members.");
      }
    } catch (err) {
      console.error("Add members failed:", err);
      setError(err.message || "Failed to add members to group.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        ref={modalRef}
        className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="text-lg">👤+</span>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              Add members
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {error && (
            <div className="mx-5 mt-4 text-xs font-medium text-rose-500 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60">
              {error}
            </div>
          )}

          {/* Search Connections */}
          <div className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/50">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search connections..."
                className="w-full rounded-xl border border-neutral-200 bg-white py-2 pl-9 pr-3 text-xs text-neutral-800 placeholder-neutral-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
              />
            </div>
          </div>

          {/* Connection List */}
          <div className="flex-1 overflow-y-auto p-3">
            {loading ? (
              <div className="space-y-2 py-3 px-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                    <div className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 w-28 rounded bg-neutral-200 dark:bg-neutral-800" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConnections.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-400 dark:text-neutral-500">
                {searchQuery
                  ? "No matching connections found."
                  : eligibleConnections.length === 0
                  ? "All your connections are already members of this group."
                  : "No eligible connections."}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredConnections.map((conn) => {
                  const connUserId = String(conn.userId || conn.id);
                  const isSelected = selectedIds.includes(connUserId);
                  const initials = (conn.name || "User")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <div
                      key={connUserId}
                      onClick={() => toggleSelect(connUserId)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60"
                          : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50 border border-transparent"
                      }`}
                    >
                      {/* Custom Checkbox */}
                      <div
                        className={`h-4 w-4 rounded flex items-center justify-center border transition-colors ${
                          isSelected
                            ? "bg-indigo-600 border-indigo-600 text-white dark:bg-indigo-500 dark:border-indigo-500"
                            : "border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800"
                        }`}
                      >
                        {isSelected && (
                          <svg className="h-3 w-3 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>

                      {/* Avatar */}
                      {conn.avatar ? (
                        <img
                          src={conn.avatar}
                          alt={conn.name}
                          className="h-8 w-8 rounded-full object-cover border border-neutral-200 dark:border-neutral-700 shrink-0"
                        />
                      ) : (
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-neutral-200 dark:border-neutral-700 shrink-0">
                          {initials}
                        </div>
                      )}

                      {/* Name & Role */}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                          {conn.name}
                        </div>
                        {conn.role && (
                          <div className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                            {conn.role}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedIds.length === 0 || isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10" />
                  </svg>
                  <span>Adding...</span>
                </>
              ) : (
                <span>Add Members</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
