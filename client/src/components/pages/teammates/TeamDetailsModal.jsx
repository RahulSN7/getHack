// ---------------------------------------------------------------------------
// TeamDetailsModal.jsx — Master View Team UI Layout Modal
// Uses the EXACT SAME Master Design layout, cards, section hierarchy, member grid,
// typography, and action buttons as TeamDetailsPage.jsx for Leader, Member, and User
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { HACKATHONS } from "../../../data/hackathons";
import { teamService } from "../../../services/teamService";
import { resolveTeamMembers, resolveTeamLeader, getTeamActionState } from "../../../utils/teamMemberResolver";
import InviteConnectionsModal from "./InviteConnectionsModal";

function UserAvatar({ avatar, name, sizeClass = "h-11 w-11 text-xs" }) {
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

export default function TeamDetailsModal({
  team,
  currentUser,
  sentRequests = [],
  onClose,
  onRequestJoin,
}) {
  const modalRef = useRef(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [requestSending, setRequestSending] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);
  const [fetchedTeam, setFetchedTeam] = useState(null);

  const activeTeam = fetchedTeam || team;

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Lock body scroll while modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  if (!activeTeam) return null;

  const {
    id,
    teamName = "Untitled Team",
    hackathon = "general",
    hackathonName = "Hackathon",
    hackathonLink = "",
    hackathonDates = "",
    description = "",
    lookingForDescription = "",
    rolesNeeded = [],
    techStack = [],
    currentSize = 1,
    maxSize = 4,
    location = "Online",
    createdBy = "",
  } = activeTeam;

  const teamIdStr = (activeTeam._id || activeTeam.id || id).toString();

  const memberObjects = resolveTeamMembers(activeTeam, currentUser);
  const realCurrentSize = memberObjects.length > 0 ? memberObjects.length : currentSize || 1;
  const allPendingIds = [...(activeTeam.pendingInvitationIds || []), ...pendingInvitations];
  const spotsLeft = Math.max(0, maxSize - realCurrentSize);
  const isFull = spotsLeft === 0;

  const actionState = getTeamActionState(activeTeam, currentUser, sentRequests);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRequestToJoin = async () => {
    try {
      setRequestSending(true);
      if (onRequestJoin) {
        await onRequestJoin(teamIdStr);
      } else {
        await teamService.sendTeamRequest(teamIdStr);
      }
      showToast("Join request sent successfully!");
    } catch (err) {
      console.error("Failed to send join request:", err);
      showToast(err.message || "Failed to send join request.");
    } finally {
      setRequestSending(false);
    }
  };

  const handleLeaveTeam = async () => {
    try {
      await teamService.leaveTeam(teamIdStr);
      showToast("Left team successfully!");
      onClose();
    } catch (err) {
      console.error("Failed to leave team:", err);
      showToast(err.message || "Failed to leave team.");
    }
  };

  const handleSendInvitations = async (selectedIds) => {
    try {
      const res = await teamService.inviteConnections(teamIdStr, selectedIds);
      if (res?.team) {
        setFetchedTeam(res.team);
      }
      setPendingInvitations((prev) => [...prev, ...selectedIds]);
      showToast(`${selectedIds.length} invitation(s) sent successfully!`);
    } catch (err) {
      console.error("Failed to send invitations:", err);
      showToast(err.message || "Failed to send invitations.");
    }
  };

  const leaderObj = resolveTeamLeader(activeTeam, currentUser);

  const sortedMembers = [...memberObjects].sort((a, b) => {
    const aIsLeader = a.id === leaderObj?.id || a.isOwner;
    const bIsLeader = b.id === leaderObj?.id || b.isOwner;
    if (aIsLeader && !bIsLeader) return -1;
    if (!aIsLeader && bIsLeader) return 1;
    return 0;
  });

  const associatedHackathon = HACKATHONS.find((h) => {
    if (!h) return false;
    if (hackathon && h.id === hackathon) return true;
    const hTitle = typeof h.name === "string" ? h.name : typeof h.title === "string" ? h.title : "";
    const targetTitle = typeof hackathonName === "string" ? hackathonName : "";
    return Boolean(hTitle && targetTitle && hTitle.toLowerCase().includes(targetTitle.toLowerCase()));
  });

  const finalHackathonLink = hackathonLink || (associatedHackathon ? `/hackathons/${associatedHackathon.id}` : null);
  const finalHackathonDates = hackathonDates || (associatedHackathon ? "Sep 20 – Sep 22, 2026" : "");
  const finalMode = location || (associatedHackathon ? associatedHackathon.mode || "Online" : "Online");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-neutral-950/60 backdrop-blur-xs overscroll-contain transition-opacity animate-in fade-in duration-150"
      onClick={(e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="team-details-title"
    >
      {/* Toast Notification inside Modal */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-neutral-900 px-4 py-3 text-xs font-semibold text-white shadow-lg dark:bg-white dark:text-neutral-900 animate-in fade-in">
          {toastMessage}
        </div>
      )}

      <div
        ref={modalRef}
        className="relative flex flex-col w-full max-w-4xl max-h-[88vh] overflow-hidden overscroll-contain rounded-2xl border border-neutral-200 bg-slate-50 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950"
      >
        {/* ── Fixed Top Bar: Back & Close ── */}
        <div className="shrink-0 flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
            <span>Back to Teams</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close team details"
            className="grid h-8 w-8 place-items-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Scrollable Modal Body (Master View Team Layout) ── */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-6 sm:p-8 space-y-8">
          {/* ── 1. Team Header Banner Card ── */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs sm:p-8 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  {isFull ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                      <span className="h-2 w-2 rounded-full bg-neutral-400 dark:bg-neutral-500" />
                      Team Full
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      {spotsLeft === 1 ? "1 spot available" : `${spotsLeft} spots available`}
                    </span>
                  )}

                  <span className="rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                    {finalMode}
                  </span>

                  {finalHackathonDates && (
                    <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                      {finalHackathonDates}
                    </span>
                  )}
                </div>

                <h1 id="team-details-title" className="text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl dark:text-white">
                  {teamName}
                </h1>

                <div className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                  <span>Building for <strong>{hackathonName}</strong></span>
                </div>

                {description && (
                  <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300 pt-1">
                    {description}
                  </p>
                )}

                {/* Stats Row */}
                <div className="flex flex-wrap items-center gap-6 pt-3 text-xs font-semibold">
                  <div className="flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200">
                    <span className="text-neutral-400 dark:text-neutral-500">Members:</span>
                    <span>{currentSize} / {maxSize} members</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <span className="text-neutral-400 dark:text-neutral-500">Capacity:</span>
                    <span>{isFull ? "Team Full" : `${spotsLeft} open ${spotsLeft === 1 ? "spot" : "spots"}`}</span>
                  </div>
                </div>
              </div>

              {/* Request / Manage CTA Buttons */}
              <div className="shrink-0 pt-2 sm:pt-0 flex flex-col sm:flex-row gap-2">
                {actionState.type === "leader" ? (
                  <>
                    {!isFull && (
                      <button
                        type="button"
                        onClick={() => setIsInviteModalOpen(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-2xs transition-all hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                      >
                        <span>+ Invite Connections</span>
                      </button>
                    )}
                    <Link
                      to={`/team/${teamIdStr}/edit`}
                      onClick={onClose}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-5 py-2.5 text-xs font-semibold text-neutral-800 shadow-2xs transition-all hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700"
                    >
                      <span>Manage Team</span>
                    </Link>
                  </>
                ) : actionState.type === "member" ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      You are a member
                    </span>
                    <button
                      type="button"
                      onClick={handleLeaveTeam}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60"
                    >
                      Leave Team
                    </button>
                  </div>
                ) : actionState.type === "pending" ? (
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600/20 px-6 py-3 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 cursor-default"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Request Sent
                  </button>
                ) : actionState.type === "full" ? (
                  <button
                    type="button"
                    disabled
                    className="rounded-xl bg-neutral-100 px-6 py-3 text-xs font-semibold text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500 cursor-not-allowed"
                  >
                    Team Full
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={requestSending}
                    onClick={handleRequestToJoin}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-xs font-semibold text-white shadow-2xs transition-all hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 disabled:opacity-50"
                  >
                    <span>{requestSending ? "Sending..." : "Request to Join"}</span>
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* ── 2. Team Members Section ── */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3 dark:border-neutral-800">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                Team Members ({sortedMembers.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {sortedMembers.map((mem) => {
                const isTeamLeader = mem.id === (leaderObj?.id || createdBy) || mem.isOwner;

                return (
                  <Link
                    key={mem.id}
                    to={`/profile/${mem.id}`}
                    onClick={onClose}
                    className="
                      group
                      flex
                      items-center
                      justify-between
                      rounded-xl
                      border
                      border-neutral-200
                      bg-white
                      p-4
                      shadow-2xs
                      transition-all
                      duration-150
                      hover:border-neutral-300
                      hover:shadow-md
                      dark:border-neutral-800
                      dark:bg-neutral-900
                      dark:hover:border-neutral-700
                    "
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar avatar={mem.avatar} name={mem.name} sizeClass="h-11 w-11 text-xs" />

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-sm font-bold text-neutral-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                            {mem.name}
                          </h3>
                          {isTeamLeader && (
                            <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                              Team Leader
                            </span>
                          )}
                        </div>

                        {mem.role && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                            {mem.role}
                          </p>
                        )}

                        {mem.skills && mem.skills.length > 0 && (
                          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate pt-0.5">
                            {mem.skills.slice(0, 3).join(" · ")}
                          </p>
                        )}
                      </div>
                    </div>

                    <span className="shrink-0 text-xs font-semibold text-indigo-600 transition-colors group-hover:text-indigo-700 dark:text-indigo-400 dark:group-hover:text-indigo-300">
                      View Profile
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* ── 3. Looking For & Tech Stack ── */}
          <section className="space-y-4">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Roles Needed */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Roles Needed
                </h3>
                <div className="flex flex-wrap gap-2">
                  {rolesNeeded.length > 0 ? (
                    rolesNeeded.map((r) => (
                      <span
                        key={r}
                        className="rounded-lg bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
                      >
                        {r}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-neutral-400 italic">Open to all roles</span>
                  )}
                </div>
              </div>

              {/* Tech Stack Required */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Tech Stack & Skills Required
                </h3>
                <div className="flex flex-wrap gap-2">
                  {techStack.length > 0 ? (
                    techStack.map((t) => (
                      <span
                        key={t}
                        className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                      >
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-neutral-400 italic">No skills specified</span>
                  )}
                </div>
              </div>
            </div>

            {lookingForDescription && (
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  What We&apos;re Looking For
                </h3>
                <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                  {lookingForDescription}
                </p>
              </div>
            )}
          </section>

          {/* ── 4. Target Hackathon Context Card ── */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-500">
                  Target Hackathon
                </p>
                <h3 className="mt-1 text-lg font-bold text-neutral-900 dark:text-white">
                  {hackathonName}
                </h3>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  {finalMode}{finalHackathonDates ? ` · ${finalHackathonDates}` : ""}
                </p>
              </div>

              {finalHackathonLink && (
                finalHackathonLink.startsWith("http") ? (
                  <a
                    href={finalHackathonLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-950 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                  >
                    <span>View Hackathon ↗</span>
                  </a>
                ) : (
                  <Link
                    to={finalHackathonLink}
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-950 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                  >
                    <span>View Hackathon ↗</span>
                  </Link>
                )
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Invite Connections Modal */}
      <InviteConnectionsModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        maxSize={maxSize}
        currentSize={realCurrentSize}
        existingMemberIds={memberObjects.map((m) => m.id)}
        pendingInvitationIds={allPendingIds}
        onSendInvitations={handleSendInvitations}
      />
    </div>
  );
}
