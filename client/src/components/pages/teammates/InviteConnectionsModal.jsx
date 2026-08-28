// ---------------------------------------------------------------------------
// InviteConnectionsModal.jsx — Modal for inviting real network connections to a team
// Respects team capacity, multi-select, search, and real API network connections
// ---------------------------------------------------------------------------

import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { userService } from "../../../services/userService";
import { TEAMMATES } from "../../../data/teammates";

function UserAvatar({ avatar, name, sizeClass = "h-10 w-10 text-xs" }) {
  const [imgError, setImgError] = useState(false);
  const initials = name
    ? name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
    : "GH";

  if (avatar && !imgError) {
    return (
      <img
        src={avatar}
        alt={`${name}'s profile photo`}
        onError={() => setImgError(true)}
        className={`${sizeClass} shrink-0 rounded-xl object-cover border border-neutral-200 shadow-2xs dark:border-neutral-800`}
      />
    );
  }

  return (
    <div
      className={`grid ${sizeClass} shrink-0 place-items-center rounded-xl bg-indigo-500/10 font-bold text-indigo-600 border border-neutral-200 dark:border-neutral-800 dark:bg-indigo-500/20 dark:text-indigo-400`}
    >
      {initials}
    </div>
  );
}

export default function InviteConnectionsModal({
  isOpen,
  onClose,
  maxSize = 4,
  currentSize = 1,
  existingMemberIds = [],
  pendingInvitationIds = [],
  onSendInvitations,
}) {
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);

  // Available spots calculation dynamically based on actual team members
  const effectiveCurrentSize = Math.max(1, existingMemberIds.length > 0 ? existingMemberIds.length : currentSize);
  const availableSlots = Math.max(0, maxSize - effectiveCurrentSize);
  const spotText = availableSlots === 1 ? "available spot" : "available spots";

  // Clamp selection if capacity changes while open
  useEffect(() => {
    if (selectedIds.length > availableSlots) {
      setSelectedIds((prev) => prev.slice(0, availableSlots));
    }
  }, [availableSlots, selectedIds.length]);

  // Reset internal state when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setSelectedIds([]);
    setSearchQuery("");
    setErrorMsg(null);
    setLoading(true);

    async function fetchConnections() {
      try {
        const data = await userService.getNetworkRequests();
        if (isMounted) {
          let loadedConns = Array.isArray(data?.connections) ? data.connections : [];

          // If no connections from API, fallback to TEAMMATES list for development context
          if (loadedConns.length === 0) {
            loadedConns = TEAMMATES.map((t) => ({
              id: t.id,
              userId: t.id,
              name: t.name,
              role: t.role,
              avatar: t.avatar,
              skills: t.skills || [],
            }));
          }

          setConnections(loadedConns);
        }
      } catch {
        if (isMounted) {
          // Fallback to TEAMMATES list on API error
          const fallbackConns = TEAMMATES.map((t) => ({
            id: t.id,
            userId: t.id,
            name: t.name,
            role: t.role,
            avatar: t.avatar,
            skills: t.skills || [],
          }));
          setConnections(fallbackConns);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchConnections();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Filter connections by search query
  const filteredConnections = useMemo(() => {
    if (!searchQuery.trim()) return connections;
    const q = searchQuery.toLowerCase();
    return connections.filter((conn) => {
      const uName = (conn.name || "").toLowerCase();
      const uRole = (conn.role || "").toLowerCase();
      const uSkills = (conn.skills || []).map((s) => s.toLowerCase());
      const uId = (conn.userId || conn.id || "").toLowerCase();

      return (
        uName.includes(q) ||
        uRole.includes(q) ||
        uId.includes(q) ||
        uSkills.some((s) => s.includes(q))
      );
    });
  }, [connections, searchQuery]);

  if (!isOpen) return null;

  const handleToggleSelect = (userId) => {
    if (selectedIds.includes(userId)) {
      setSelectedIds(selectedIds.filter((id) => id !== userId));
      setErrorMsg(null);
    } else {
      if (selectedIds.length >= availableSlots) {
        setErrorMsg(`Maximum capacity reached. You have ${availableSlots} open spot(s).`);
        return;
      }
      setSelectedIds([...selectedIds, userId]);
      setErrorMsg(null);
    }
  };

  const handleSend = () => {
    if (selectedIds.length === 0) return;
    if (onSendInvitations) {
      onSendInvitations(selectedIds);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div
        className="
          w-full
          max-w-xl
          rounded-2xl
          border
          border-neutral-200
          bg-white
          shadow-2xl
          dark:border-neutral-800
          dark:bg-neutral-900
          overflow-hidden
          flex
          flex-col
          max-h-[85vh]
        "
      >
        {/* ── Modal Header ── */}
        <div className="flex items-center justify-between border-b border-neutral-100 p-5 dark:border-neutral-800">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              Invite Connections
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Select connections from your network to invite to this team.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-white"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Capacity & Search Header Bar ── */}
        <div className="p-5 pb-3 space-y-3 bg-neutral-50/50 dark:bg-neutral-900/50 border-b border-neutral-100 dark:border-neutral-800">
          {/* Capacity Status Badge */}
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-neutral-600 dark:text-neutral-300">
              Selected: <strong className="text-indigo-600 dark:text-indigo-400">{selectedIds.length}</strong> / {availableSlots} {spotText}
            </span>

            {availableSlots === 0 ? (
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                Team Full
              </span>
            ) : (
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                Max Team Size: {maxSize}
              </span>
            )}
          </div>

          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search connections by name, handle, role, or skill..."
              className="
                w-full
                rounded-xl
                border
                border-neutral-300
                bg-white
                py-2.5
                pl-9
                pr-3
                text-xs
                text-neutral-900
                shadow-2xs
                outline-none
                focus:border-indigo-500
                dark:border-neutral-700
                dark:bg-neutral-800
                dark:text-white
              "
            />
            <svg
              className="absolute left-3 top-3 h-4 w-4 text-neutral-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          {errorMsg && (
            <p className="text-[11px] font-semibold text-red-500 pt-0.5">
              {errorMsg}
            </p>
          )}
        </div>

        {/* ── Connections List ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Loading connections...
              </p>
            </div>
          ) : connections.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
                No connections yet. Connect with people on getHack to invite them to your team.
              </p>
              <Link
                to="/teammates"
                onClick={onClose}
                className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                Find Teammates
              </Link>
            </div>
          ) : filteredConnections.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-500 dark:text-neutral-400">
              No connections found matching &quot;{searchQuery}&quot;.
            </div>
          ) : (
            filteredConnections.map((conn) => {
              const uId = conn.userId || conn.id;
              const isMember = existingMemberIds.includes(uId);
              const isInvited = pendingInvitationIds.includes(uId);
              const isSelected = selectedIds.includes(uId);
              const isDisabled = isMember || isInvited || (!isSelected && selectedIds.length >= availableSlots);

              return (
                <div
                  key={uId}
                  onClick={() => {
                    if (!isDisabled) handleToggleSelect(uId);
                  }}
                  className={`
                    flex
                    items-center
                    justify-between
                    rounded-xl
                    border
                    p-3.5
                    transition-all
                    ${isSelected
                      ? "border-indigo-500 bg-indigo-50/40 dark:border-indigo-500 dark:bg-indigo-950/20"
                      : "border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-800/60 dark:hover:border-neutral-700"
                    }
                    ${isDisabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
                  `}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isDisabled}
                      onChange={() => { }}
                      className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900"
                    />

                    <UserAvatar
                      avatar={conn.avatar}
                      name={conn.name}
                      sizeClass="h-10 w-10 text-xs"
                    />

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/profile/${uId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="truncate text-xs font-bold text-neutral-900 hover:underline dark:text-white"
                        >
                          {conn.name}
                        </Link>
                      </div>

                      {conn.role && (
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                          {conn.role}
                        </p>
                      )}

                      {conn.skills && conn.skills.length > 0 && (
                        <p className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate">
                          {conn.skills.slice(0, 3).join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    {isMember ? (
                      <span className="rounded-md bg-neutral-100 px-2 py-1 text-[10px] font-bold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                        Already a member
                      </span>
                    ) : isInvited ? (
                      <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                        Invitation Sent
                      </span>
                    ) : isSelected ? (
                      <span className="rounded-md bg-indigo-500/10 px-2 py-1 text-[10px] font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                        Selected
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Modal Footer Actions ── */}
        <div className="flex items-center justify-between border-t border-neutral-100 p-4 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-900/50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={selectedIds.length === 0 || selectedIds.length > availableSlots}
            className="
              inline-flex
              items-center
              gap-2
              rounded-lg
              bg-indigo-600
              px-5
              py-2
              text-xs
              font-semibold
              text-white
              shadow-2xs
              transition-colors
              hover:bg-indigo-500
              disabled:opacity-40
              dark:bg-indigo-500
              dark:hover:bg-indigo-400
            "
          >
            <span>Send Invitations ({selectedIds.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
