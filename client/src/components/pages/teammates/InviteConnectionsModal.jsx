// ---------------------------------------------------------------------------
// InviteConnectionsModal.jsx — Unified Modal for inviting network connections & group chats to a team
// Respects team capacity, unified selection list, search, and real API endpoints
// ---------------------------------------------------------------------------

import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../context/useAuth";
import { userService } from "../../../services/userService";
import { chatService } from "../../../services/chatService";
import { invitationService } from "../../../services/invitationService";
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

function GroupAvatar({ avatar, name, sizeClass = "h-10 w-10 text-sm" }) {
  const [imgError, setImgError] = useState(false);

  if (avatar && !imgError) {
    return (
      <img
        src={avatar}
        alt={`${name} group photo`}
        onError={() => setImgError(true)}
        className={`${sizeClass} shrink-0 rounded-xl object-cover border border-neutral-200 shadow-2xs dark:border-neutral-800`}
      />
    );
  }

  return (
    <div
      className={`grid ${sizeClass} shrink-0 place-items-center rounded-xl bg-purple-500/10 text-purple-600 font-bold border border-neutral-200 dark:border-neutral-800 dark:bg-purple-500/20 dark:text-purple-400`}
    >
      👥
    </div>
  );
}

export default function InviteConnectionsModal({
  isOpen,
  onClose,
  teamId,
  teamName = "Team",
  maxSize = 4,
  currentSize = 1,
  existingMemberIds = [],
  pendingInvitationIds = [],
  onSendInvitations,
}) {
  const { user: currentUser } = useAuth();
  const currentUserId = String(currentUser?._id || currentUser?.id || "");
  const [connections, setConnections] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
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

  // Reset internal state when modal opens & fetch connections + accessible groups
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setSelectedIds([]);
    setSearchQuery("");
    setErrorMsg(null);
    setLoading(true);

    async function fetchData() {
      try {
        const [data, groupRes] = await Promise.all([
          userService.getNetworkRequests().catch(() => ({})),
          chatService.getGroups().catch(() => ({})),
        ]);

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

          if (groupRes?.success && Array.isArray(groupRes.groups)) {
            setUserGroups(groupRes.groups);
          } else {
            setUserGroups([]);
          }
        }
      } catch {
        if (isMounted) {
          const fallbackConns = TEAMMATES.map((t) => ({
            id: t.id,
            userId: t.id,
            name: t.name,
            role: t.role,
            avatar: t.avatar,
            skills: t.skills || [],
          }));
          setConnections(fallbackConns);
          setUserGroups([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Create unified list of connections AND accessible group chats
  const unifiedList = useMemo(() => {
    const connItems = connections
      .filter((c) => String(c.userId || c.id) !== currentUserId)
      .map((c) => ({
        itemType: "connection",
        id: String(c.userId || c.id),
        name: c.name,
        role: c.role,
        avatar: c.avatar,
        skills: c.skills || [],
        raw: c,
      }));

    const groupItems = (userGroups || []).map((g) => {
      const memberCount = Array.isArray(g.members) ? g.members.length : 0;
      return {
        itemType: "group",
        id: String(g._id || g.id || g.streamChannelId),
        groupId: String(g._id || g.id || g.streamChannelId),
        name: g.name,
        avatar: g.avatar,
        memberCount: memberCount,
        raw: g,
      };
    });

    return [...connItems, ...groupItems];
  }, [connections, userGroups]);

  // Filter unified list by search query (connection name/role/skills/ID OR group name)
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return unifiedList;
    const q = searchQuery.toLowerCase();
    return unifiedList.filter((item) => {
      const nameMatch = (item.name || "").toLowerCase().includes(q);
      if (item.itemType === "group") {
        return nameMatch;
      } else {
        const roleMatch = (item.role || "").toLowerCase().includes(q);
        const skillMatch = (item.skills || []).some((s) => s.toLowerCase().includes(q));
        const idMatch = (item.id || "").toLowerCase().includes(q);
        return nameMatch || roleMatch || skillMatch || idMatch;
      }
    });
  }, [unifiedList, searchQuery]);

  if (!isOpen) return null;

  const handleToggleSelect = (itemId) => {
    if (selectedIds.includes(itemId)) {
      setSelectedIds(selectedIds.filter((id) => id !== itemId));
      setErrorMsg(null);
    } else {
      if (selectedIds.length >= availableSlots) {
        setErrorMsg(`Maximum capacity reached. You have ${availableSlots} open spot(s).`);
        return;
      }
      setSelectedIds([...selectedIds, itemId]);
      setErrorMsg(null);
    }
  };

  const handleSend = async () => {
    if (selectedIds.length === 0 || isSending) return;
    setIsSending(true);
    setErrorMsg(null);

    try {
      const selectedItems = unifiedList.filter((item) => selectedIds.includes(item.id));
      if (onSendInvitations) {
        await onSendInvitations(selectedIds, selectedItems);
      }
      onClose();
    } catch (err) {
      console.error("Send invitations failed:", err);
      setErrorMsg(err.message || "Failed to send invitations.");
    } finally {
      setIsSending(false);
    }
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
              Select connections or groups to invite to this team.
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

          {/* Unified Search Input */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search connections or groups..."
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

        {/* ── Unified Single List (Connections & Accessible Groups) ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Loading connections and groups...
              </p>
            </div>
          ) : unifiedList.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
                No connections or accessible group chats found. Connect with people on getHack to invite them to your team.
              </p>
              <Link
                to="/teammates"
                onClick={onClose}
                className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                Find Teammates
              </Link>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-500 dark:text-neutral-400">
              No connections or groups found matching &quot;{searchQuery}&quot;.
            </div>
          ) : (
            filteredList.map((item) => {
              const itemId = item.id;
              const isGroupItem = item.itemType === "group";
              const isMember = !isGroupItem && existingMemberIds.includes(itemId);
              const isInvited = !isGroupItem && pendingInvitationIds.includes(itemId);
              const isSelected = selectedIds.includes(itemId);
              const isDisabled = isMember || (!isSelected && selectedIds.length >= availableSlots);

              return (
                <div
                  key={`${item.itemType}_${itemId}`}
                  onClick={() => {
                    if (!isDisabled) handleToggleSelect(itemId);
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

                    {isGroupItem ? (
                      <GroupAvatar
                        avatar={item.avatar}
                        name={item.name}
                        sizeClass="h-10 w-10 text-sm"
                      />
                    ) : (
                      <UserAvatar
                        avatar={item.avatar}
                        name={item.name}
                        sizeClass="h-10 w-10 text-xs"
                      />
                    )}

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        {isGroupItem ? (
                          <span className="truncate text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1">
                            <span>👥</span>
                            <span>{item.name}</span>
                          </span>
                        ) : (
                          <Link
                            to={`/profile/${itemId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="truncate text-xs font-bold text-neutral-900 hover:underline dark:text-white flex items-center gap-1"
                          >
                            <span>👤</span>
                            <span>{item.name}</span>
                          </Link>
                        )}
                      </div>

                      {isGroupItem ? (
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                          {item.memberCount} {item.memberCount === 1 ? "member" : "members"}
                        </p>
                      ) : (
                        <>
                          {item.role && (
                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                              {item.role}
                            </p>
                          )}

                          {item.skills && item.skills.length > 0 && (
                            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate">
                              {item.skills.slice(0, 3).join(" · ")}
                            </p>
                          )}
                        </>
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
            disabled={selectedIds.length === 0 || selectedIds.length > availableSlots || isSending}
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
            {isSending ? (
              <>
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Sending...</span>
              </>
            ) : (
              <span>Send Invitations ({selectedIds.length})</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
