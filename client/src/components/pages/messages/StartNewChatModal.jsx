// ---------------------------------------------------------------------------
// StartNewChatModal.jsx — Modal for starting a new 1-to-1 chat with a connection
// Fetches established getHack connections dynamically via userService.getNetworkRequests
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef } from "react";
import { userService } from "../../../services/userService";

export default function StartNewChatModal({ isOpen, onClose, onSelectConnection }) {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setSearchQuery("");

    async function fetchConnections() {
      try {
        const data = await userService.getNetworkRequests();
        if (isMounted) {
          const connectionList = Array.isArray(data?.connections) ? data.connections : [];
          setConnections(connectionList);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to load connections for new chat:", err);
          setError("Failed to load connections. Please try again.");
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

  // Click outside modal content to close
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

  const filteredConnections = connections.filter((conn) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = (conn.name || "").toLowerCase().includes(q);
    const roleMatch = (conn.role || "").toLowerCase().includes(q);
    const skillsMatch = Array.isArray(conn.skills) && conn.skills.some((s) => s.toLowerCase().includes(q));
    return nameMatch || roleMatch || skillsMatch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        ref={modalRef}
        className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">
            Start a new chat
          </h2>
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

        {/* Search */}
        <div className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400"
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
              className="w-full rounded-xl border border-neutral-200 bg-white py-2 pl-9 pr-4 text-xs text-neutral-800 placeholder-neutral-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
              autoFocus
            />
          </div>
        </div>

        {/* Connections List */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            Your connections
          </div>

          {loading ? (
            <div className="space-y-2 py-3 px-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                  <div className="h-10 w-10 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-28 rounded bg-neutral-200 dark:bg-neutral-800" />
                    <div className="h-2.5 w-40 rounded bg-neutral-100 dark:bg-neutral-800/60" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center text-xs text-rose-500">
              {error}
            </div>
          ) : filteredConnections.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                {searchQuery ? "No matching connections found" : "No connections yet"}
              </p>
              <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                {searchQuery
                  ? `No connections match "${searchQuery}"`
                  : "Connect with developers on getHack to start chatting."}
              </p>
            </div>
          ) : (
            <div className="space-y-1 mt-1">
              {filteredConnections.map((conn) => {
                const initials = (conn.name || "User")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <button
                    key={conn.id || conn.userId}
                    type="button"
                    onClick={() => onSelectConnection(conn)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left hover:bg-indigo-50/60 dark:hover:bg-neutral-800/60 transition-colors group cursor-pointer"
                  >
                    {/* Avatar */}
                    {conn.avatar ? (
                      <img
                        src={conn.avatar}
                        alt={conn.name}
                        className="h-10 w-10 rounded-full object-cover border border-neutral-200 dark:border-neutral-700 shrink-0"
                      />
                    ) : (
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-neutral-200 dark:border-neutral-700 shrink-0">
                        {initials}
                      </div>
                    )}

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-neutral-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {conn.name}
                      </div>
                      {(conn.role || conn.bio) && (
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                          {conn.role || conn.bio}
                        </div>
                      )}
                    </div>

                    <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      Chat →
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
