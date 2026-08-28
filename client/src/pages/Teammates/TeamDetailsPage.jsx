// ---------------------------------------------------------------------------
// TeamDetailsPage.jsx — Full Page View for a Single Team (/team/:id)
// Displays complete team details, real member profiles and avatars, required skills, and request flow
// Includes Invite Connections modal for team owners
// ---------------------------------------------------------------------------

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import BackButton from "../../components/common/BackButton";
import InviteConnectionsModal from "../../components/pages/teammates/InviteConnectionsModal";
import { TEAMS } from "../../data/teams";
import { TEAMMATES } from "../../data/teammates";
import { HACKATHONS } from "../../data/hackathons";
import { useAuth } from "../../context/useAuth";
import { teamService } from "../../services/teamService";
import { invitationService } from "../../services/invitationService";
import { resolveTeamMembers, resolveTeamLeader, getTeamActionState } from "../../utils/teamMemberResolver";

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

export default function TeamDetailsPage() {
  const { id } = useParams();
  const { user: currentUser, isAuthenticated } = useAuth();
  const [hasRequested, setHasRequested] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);
  const [sentRequests, setSentRequests] = useState([]);
  const [requestSending, setRequestSending] = useState(false);

  const [fetchedTeam, setFetchedTeam] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadTeam() {
      if (!id) return;
      try {
        const res = await teamService.getTeamById(id);
        if (isMounted && res?.team) {
          setFetchedTeam(res.team);
        }
      } catch {
        // Fallback to static or pre-populated TEAMS array
      }
    }
    async function fetchSentRequests() {
      if (!isAuthenticated) return;
      try {
        const res = await teamService.getSentRequests();
        if (isMounted && res?.requests) {
          setSentRequests(res.requests);
        }
      } catch (err) {
        console.error("Failed to load sent requests:", err);
      }
    }
    loadTeam();
    fetchSentRequests();
    return () => {
      isMounted = false;
    };
  }, [id, isAuthenticated]);

  const localTeam = TEAMS.find((t) => (t.id || t._id) === id);
  const team = fetchedTeam || localTeam || TEAMS[0];

  if (!team) {
    return (
      <div className="min-h-screen bg-slate-50 text-neutral-900 transition-colors dark:bg-neutral-950 dark:text-neutral-100">
        <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
            Team Not Found
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
            This team may have been deleted or is no longer available.
          </p>
          <div className="pt-2">
            <BackButton fallbackPath="/teammates?tab=teams" />
          </div>
        </main>
      </div>
    );
  }

  const {
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
    memberIds = [],
  } = team;

  const currentUserId = currentUser?.id || currentUser?._id;
  const currentUserIdStr = currentUserId ? currentUserId.toString() : "";
  const teamIdStr = (team._id || team.id || id).toString();

  const rawCreator = createdBy || team.leader;
  const creatorIdStr = typeof rawCreator === "object" ? (rawCreator?._id || rawCreator?.id) : rawCreator;
  const isOwner = Boolean(
    currentUserId &&
    (currentUserId === creatorIdStr || creatorIdStr === "priya-sharma" || creatorIdStr === "user-current")
  );

  const isMember = Boolean(
    currentUserIdStr &&
    (memberIds.includes(currentUserIdStr) ||
      (team.members && team.members.some((m) => (m.user?._id || m.user?.id || m.user || m)?.toString() === currentUserIdStr)))
  );

  const pendingReq = sentRequests.find(
    (r) => (r.team?._id || r.team?.id || r.team)?.toString() === teamIdStr && r.status === "pending"
  );
  const hasPendingRequest = Boolean(pendingReq);

  const memberObjects = resolveTeamMembers(team, currentUser);
  const realCurrentSize = memberObjects.length > 0 ? memberObjects.length : currentSize;
  const allPendingIds = [...(team.pendingInvitationIds || []), ...pendingInvitations];
  const spotsLeft = Math.max(0, maxSize - realCurrentSize);
  const isFull = spotsLeft === 0;

  const actionState = getTeamActionState(team, currentUser, sentRequests);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRequestToJoin = async () => {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    try {
      setRequestSending(true);
      const res = await teamService.sendTeamRequest(teamIdStr);
      showToast("Join request sent successfully!");
      if (res?.request) {
        setSentRequests((prev) => [res.request, ...prev]);
      }
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
      window.location.href = "/teammates?tab=my-teams";
    } catch (err) {
      console.error("Failed to leave team:", err);
      showToast(err.message || "Failed to leave team.");
    }
  };

  const handleSendInvitations = async (selectedIds) => {
    try {
      let sentCount = 0;
      for (const targetUserId of selectedIds) {
        await invitationService.sendInvitation({
          teamId: teamIdStr,
          receiverId: targetUserId,
        });
        sentCount++;
      }
      setPendingInvitations((prev) => [...prev, ...selectedIds]);
      showToast(`${sentCount} invitation(s) sent directly to chat!`);
      const res = await teamService.getTeamById(teamIdStr);
      if (res?.team) {
        setFetchedTeam(res.team);
      }
    } catch (err) {
      console.error("Failed to send invitations:", err);
      showToast(err.message || "Failed to send invitations.");
    }
  };

  // Resolve team members & leader dynamically from populated Mongoose user objects
  const leaderObj = resolveTeamLeader(team, currentUser);

  const sortedMembers = [...memberObjects].sort((a, b) => {
    const aIsLeader = a.id === leaderObj?.id || a.isOwner;
    const bIsLeader = b.id === leaderObj?.id || b.isOwner;
    if (aIsLeader && !bIsLeader) return -1;
    if (!aIsLeader && bIsLeader) return 1;
    return 0;
  });

  // Resolve associated hackathon from HACKATHONS dataset if available
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
    <div className="min-h-screen bg-slate-50 text-neutral-900 transition-colors dark:bg-neutral-950 dark:text-neutral-100">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-neutral-900 px-4 py-3 text-xs font-semibold text-white shadow-lg dark:bg-white dark:text-neutral-900 animate-in fade-in">
          {toastMessage}
        </div>
      )}

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* ── 1. Top Back Navigation ── */}
        <div>
          <BackButton fallbackPath="/teammates?tab=teams" />
        </div>

        {/* ── 2. Team Header Banner Card ── */}
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

              <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl dark:text-white">
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

        {/* ── 3. Team Members Section ── */}
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

        {/* ── 4. Looking For & Tech Stack ── */}
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

        {/* ── 5. Target Hackathon Context Card ── */}
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
                  className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-950 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                >
                  <span>View Hackathon ↗</span>
                </Link>
              )
            )}
          </div>
        </section>
      </main>

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
