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
  const { user: currentUser } = useAuth();
  const [hasRequested, setHasRequested] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);

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
    loadTeam();
    return () => {
      isMounted = false;
    };
  }, [id]);

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
  const rawCreator = createdBy || team.leader;
  const creatorIdStr = typeof rawCreator === "object" ? (rawCreator?._id || rawCreator?.id) : rawCreator;
  const isOwner = Boolean(
    currentUserId &&
    (currentUserId === creatorIdStr || creatorIdStr === "priya-sharma" || creatorIdStr === "user-current")
  );

  const allPendingIds = [...(team.pendingInvitationIds || []), ...pendingInvitations];
  const spotsLeft = Math.max(0, maxSize - currentSize - allPendingIds.length);
  const isFull = spotsLeft === 0;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSendInvitations = (selectedIds) => {
    setPendingInvitations([...pendingInvitations, ...selectedIds]);
    showToast(`${selectedIds.length} invitation(s) sent successfully!`);
  };

  // Resolve team members dynamically from real user objects & TEAMMATES dataset
  const memberObjects = memberIds.map((mId) => {
    if (currentUser && (mId === currentUser.id || mId === currentUser._id)) {
      return {
        id: currentUser.id || currentUser._id,
        name: currentUser.name || "Team Owner",
        avatar: currentUser.avatar || currentUser.profile?.avatar || "",
        role: currentUser.profile?.role || currentUser.role || "",
        skills: currentUser.profile?.skills || currentUser.skills || [],
      };
    }
    const found = TEAMMATES.find((item) => item.id === mId || item.username === mId);
    if (found) {
      return {
        id: found.id,
        name: found.name,
        avatar: found.avatar || found.profile?.avatar || "",
        role: found.profile?.role || found.role || "",
        skills: found.profile?.skills || found.skills || [],
      };
    }
    return {
      id: mId,
      name: mId.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      avatar: "",
      role: "",
      skills: [],
    };
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

              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                <span>Building for <strong>{hackathonName}</strong></span>
                {finalHackathonLink && (
                  finalHackathonLink.startsWith("http") ? (
                    <a
                      href={finalHackathonLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:underline text-indigo-600 dark:text-indigo-400"
                    >
                      <span>View Hackathon ↗</span>
                    </a>
                  ) : (
                    <Link to={finalHackathonLink} className="hover:underline">
                      View Hackathon ↗
                    </Link>
                  )
                )}
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
            <div className="shrink-0 pt-2 sm:pt-0 flex flex-col gap-2">
              {isOwner && !isFull && (
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(true)}
                  className="
                    w-full
                    sm:w-auto
                    inline-flex
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-indigo-600
                    px-5
                    py-2.5
                    text-xs
                    font-semibold
                    text-white
                    shadow-2xs
                    transition-all
                    hover:bg-indigo-500
                    dark:bg-indigo-500
                    dark:hover:bg-indigo-400
                  "
                >
                  <span>+ Invite Connections</span>
                </button>
              )}

              {isFull ? (
                <button
                  type="button"
                  disabled
                  className="w-full sm:w-auto rounded-xl bg-neutral-100 px-6 py-3 text-xs font-semibold text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500 cursor-not-allowed"
                >
                  Team Full
                </button>
              ) : !isOwner && (
                <button
                  type="button"
                  onClick={() => setHasRequested(!hasRequested)}
                  className={`
                    w-full
                    sm:w-auto
                    inline-flex
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    px-6
                    py-3
                    text-xs
                    font-semibold
                    shadow-2xs
                    transition-all
                    duration-150
                    ${
                      hasRequested
                        ? "bg-emerald-600 text-white dark:bg-emerald-500 hover:bg-emerald-700"
                        : "bg-indigo-600 text-white hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                    }
                  `}
                >
                  {hasRequested ? (
                    <>
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Request Sent</span>
                    </>
                  ) : (
                    <span>Request to Join</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ── 3. Team Members Section ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3 dark:border-neutral-800">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              Team Members ({memberObjects.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {memberObjects.map((mem) => {
              const isTeamOwner = mem.id === createdBy || mem.username === createdBy;

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
                        {isTeamOwner && (
                          <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                            Team Owner
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
        currentSize={currentSize}
        existingMemberIds={memberIds}
        pendingInvitationIds={allPendingIds}
        onSendInvitations={handleSendInvitations}
      />
    </div>
  );
}
