// ---------------------------------------------------------------------------
// CreateTeamPage.jsx — Redesigned 5-Section Create Team Form (/create-team)
// Form starts 100% empty with zero demo/prefilled data; uses real user profile data
// Includes fully functional Invite Connections modal with team capacity protection
// ---------------------------------------------------------------------------

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../../components/common/BackButton";
import InviteConnectionsModal from "../../components/pages/teammates/InviteConnectionsModal";
import { TEAMS } from "../../data/teams";
import { TEAMMATES } from "../../data/teammates";
import { useAuth } from "../../context/useAuth";
import { teamService } from "../../services/teamService";

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

export default function CreateTeamPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // Section 01: Team Information (Empty Initial State)
  const [teamName, setTeamName] = useState("");
  const [description, setDescription] = useState("");

  // Section 02: Target Hackathon (Empty Initial State)
  const [hackathonName, setHackathonName] = useState("");
  const [hackathonLink, setHackathonLink] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [mode, setMode] = useState("Online");

  // Section 03: Team Members (Creator + Invited Connections)
  const [invitedMemberIds, setInvitedMemberIds] = useState([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Section 04: Looking For (Empty Initial State)
  const [skillInput, setSkillInput] = useState("");
  const [techStack, setTechStack] = useState([]);
  const [roleInput, setRoleInput] = useState("");
  const [rolesNeeded, setRolesNeeded] = useState([]);
  const [lookingForDescription, setLookingForDescription] = useState("");

  // Section 05: Team Settings
  const [maxSize, setMaxSize] = useState(4);

  // Form Validation & Submission state
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Authenticated Creator profile info
  const creatorName = currentUser?.name || "Team Owner";
  const creatorRole = currentUser?.profile?.role || currentUser?.role || "";
  const creatorAvatar = currentUser?.avatar || currentUser?.profile?.avatar || "";
  const creatorId = currentUser?.id || currentUser?._id || "user-current";

  // Calculated current member count (Only Creator is full member initially)
  const currentMemberCount = 1;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSendInvitations = (selectedIds) => {
    const newInvited = [...new Set([...invitedMemberIds, ...selectedIds])];
    setInvitedMemberIds(newInvited);
    showToast(`${selectedIds.length} connection invitation(s) sent!`);
  };

  const handleRemoveInvitation = (id) => {
    setInvitedMemberIds(invitedMemberIds.filter((mId) => mId !== id));
    showToast("Invitation cancelled.");
  };

  const handleAddSkill = (e) => {
    e.preventDefault();
    if (skillInput.trim() && !techStack.includes(skillInput.trim())) {
      setTechStack([...techStack, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setTechStack(techStack.filter((s) => s !== skillToRemove));
  };

  const handleAddRole = (e) => {
    e.preventDefault();
    if (roleInput.trim() && !rolesNeeded.includes(roleInput.trim())) {
      setRolesNeeded([...rolesNeeded, roleInput.trim()]);
      setRoleInput("");
    }
  };

  const handleRemoveRole = (roleToRemove) => {
    setRolesNeeded(rolesNeeded.filter((r) => r !== roleToRemove));
  };

  // Team Size Counter Handlers
  const handleDecrementSize = () => {
    const minAllowed = currentMemberCount + invitedMemberIds.length;
    if (maxSize > minAllowed && maxSize > 1) {
      setMaxSize((prev) => prev - 1);
    }
  };

  const handleIncrementSize = () => {
    if (maxSize < 10) {
      setMaxSize((prev) => prev + 1);
    }
  };

  const handleManualSizeChange = (e) => {
    const minAllowed = currentMemberCount + invitedMemberIds.length;
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      if (val >= minAllowed && val <= 10) {
        setMaxSize(val);
      } else if (val > 10) {
        setMaxSize(10);
      }
    }
  };

  // Date Formatting Helper (e.g. 2026-09-20 -> "20 Sep 2026")
  const formatDateDisplay = (startStr, endStr) => {
    if (!startStr) return "";
    try {
      const start = new Date(startStr);
      const startDay = start.getDate();
      const startMonth = start.toLocaleString("en-US", { month: "short" });
      const year = start.getFullYear();

      if (!endStr) {
        return `${startDay} ${startMonth} ${year}`;
      }

      const end = new Date(endStr);
      const endDay = end.getDate();
      const endMonth = end.toLocaleString("en-US", { month: "short" });

      if (startMonth === endMonth) {
        return `${startDay} ${startMonth} – ${endDay} ${endMonth} ${year}`;
      }
      return `${startDay} ${startMonth} – ${endDay} ${endMonth} ${year}`;
    } catch {
      return startStr;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!teamName.trim()) {
      newErrors.teamName = "Team name is required.";
    } else if (teamName.trim().length < 3) {
      newErrors.teamName = "Team name must be at least 3 characters.";
    }

    if (!hackathonName.trim()) {
      newErrors.hackathonName = "Hackathon name is required.";
    }

    if (!hackathonLink.trim()) {
      newErrors.hackathonLink = "Hackathon link is required.";
    } else if (!/^https?:\/\/.+/i.test(hackathonLink.trim())) {
      newErrors.hackathonLink = "Please enter a valid URL starting with http:// or https://";
    }

    if (!startDate) {
      newErrors.startDate = "Start date is required.";
    }

    if (!endDate) {
      newErrors.endDate = "End date is required.";
    } else if (startDate && new Date(endDate) < new Date(startDate)) {
      newErrors.endDate = "End date cannot be before start date.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    const formattedDates = formatDateDisplay(startDate, endDate);

    const payload = {
      teamName: teamName.trim(),
      hackathon: `custom-hackathon-${Date.now()}`,
      hackathonName: hackathonName.trim(),
      hackathonLink: hackathonLink.trim(),
      hackathonDates: formattedDates,
      description: description.trim(),
      lookingForDescription: lookingForDescription.trim(),
      rolesNeeded: rolesNeeded,
      techStack: techStack,
      maxSize: maxSize,
      location: mode,
      accent: "indigo",
      pendingInvitationIds: invitedMemberIds,
    };

    try {
      const res = await teamService.createTeam(payload);
      const createdTeam = res?.team;
      const teamId = createdTeam?.id || createdTeam?._id || `team-${Date.now()}`;

      // Local sync fallback
      if (createdTeam) {
        TEAMS.unshift(createdTeam);
      } else {
        TEAMS.unshift({ id: teamId, ...payload, createdBy: creatorId, memberIds: [creatorId] });
      }

      showToast("Team created successfully!");

      // Navigate to Team Details page, passing source state so Back button returns to Join Team (/teammates?tab=teams)
      navigate(`/team/${teamId}`, {
        state: { from: "/teammates?tab=teams" },
      });
    } catch (err) {
      console.error("Failed to create team:", err);
      showToast(err.message || "Failed to create team. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-neutral-900 transition-colors dark:bg-neutral-950 dark:text-neutral-100">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-24 right-6 z-50 rounded-xl bg-neutral-900 px-4 py-3 text-xs font-semibold text-white shadow-lg dark:bg-white dark:text-neutral-900 animate-in fade-in">
          {toastMessage}
        </div>
      )}

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 pb-28">
        {/* ── Top Back Navigation ── */}
        <div>
          <BackButton fallbackPath="/teammates" />
        </div>

        {/* ── Page Header ── */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl dark:text-white">
            Create a Team
          </h1>
          <p className="mt-2 text-sm sm:text-base text-neutral-500 dark:text-neutral-400">
            Build your team and tell people what you&apos;re looking for.
          </p>
        </div>

        {/* ── Form Container ── */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* ────────────────────────────────────────────────────────── */}
          {/* SECTION 01: Team Information */}
          {/* ────────────────────────────────────────────────────────── */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-5">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 dark:border-neutral-800">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-indigo-500/10 text-xs font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                01
              </span>
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  Team Information
                </h2>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Tell people who you are building with.
                </p>
              </div>
            </div>

            {/* Team Name */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Team Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter your team name"
                className="
                  mt-1.5
                  w-full
                  rounded-lg
                  border
                  border-neutral-300
                  bg-white
                  p-3
                  text-xs
                  text-neutral-900
                  shadow-2xs
                  outline-none
                  transition-colors
                  focus:border-indigo-500
                  dark:border-neutral-700
                  dark:bg-neutral-800
                  dark:text-white
                "
              />
              {errors.teamName && (
                <p className="mt-1.5 text-[11px] font-semibold text-red-500">{errors.teamName}</p>
              )}
            </div>

            {/* Team Description */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Team Description
                </label>
                <span className={`text-[11px] font-medium ${description.length > 500 ? "text-red-500" : "text-neutral-400"}`}>
                  {description.length} / 500
                </span>
              </div>
              <textarea
                rows={4}
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell people what your team is building..."
                className="
                  mt-1.5
                  w-full
                  rounded-lg
                  border
                  border-neutral-300
                  bg-white
                  p-3
                  text-xs
                  text-neutral-900
                  shadow-2xs
                  outline-none
                  transition-colors
                  focus:border-indigo-500
                  dark:border-neutral-700
                  dark:bg-neutral-800
                  dark:text-white
                "
              />
            </div>
          </section>

          {/* ────────────────────────────────────────────────────────── */}
          {/* SECTION 02: Target Hackathon */}
          {/* ────────────────────────────────────────────────────────── */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-5">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 dark:border-neutral-800">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-indigo-500/10 text-xs font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                02
              </span>
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  Target Hackathon
                </h2>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Tell people which hackathon this team is for.
                </p>
              </div>
            </div>

            {/* Hackathon Name */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Hackathon Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={hackathonName}
                onChange={(e) => setHackathonName(e.target.value)}
                placeholder="Enter hackathon name"
                className="
                  mt-1.5
                  w-full
                  rounded-lg
                  border
                  border-neutral-300
                  bg-white
                  p-3
                  text-xs
                  text-neutral-900
                  shadow-2xs
                  outline-none
                  transition-colors
                  focus:border-indigo-500
                  dark:border-neutral-700
                  dark:bg-neutral-800
                  dark:text-white
                "
              />
              {errors.hackathonName && (
                <p className="mt-1.5 text-[11px] font-semibold text-red-500">{errors.hackathonName}</p>
              )}
            </div>

            {/* Hackathon Link */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Hackathon Link <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={hackathonLink}
                onChange={(e) => setHackathonLink(e.target.value)}
                placeholder="https://..."
                className="
                  mt-1.5
                  w-full
                  rounded-lg
                  border
                  border-neutral-300
                  bg-white
                  p-3
                  text-xs
                  text-neutral-900
                  shadow-2xs
                  outline-none
                  transition-colors
                  focus:border-indigo-500
                  dark:border-neutral-700
                  dark:bg-neutral-800
                  dark:text-white
                "
              />
              {errors.hackathonLink && (
                <p className="mt-1.5 text-[11px] font-semibold text-red-500">{errors.hackathonLink}</p>
              )}
            </div>

            {/* Hackathon Dates (Start & End) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="
                    mt-1.5
                    w-full
                    rounded-lg
                    border
                    border-neutral-300
                    bg-white
                    p-3
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
                {errors.startDate && (
                  <p className="mt-1 text-[11px] font-semibold text-red-500">{errors.startDate}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="
                    mt-1.5
                    w-full
                    rounded-lg
                    border
                    border-neutral-300
                    bg-white
                    p-3
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
                {errors.endDate && (
                  <p className="mt-1 text-[11px] font-semibold text-red-500">{errors.endDate}</p>
                )}
              </div>
            </div>

            {/* Hackathon Mode */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Mode <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {["Online", "Offline", "Hybrid"].map((m) => {
                  const isActive = mode === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`
                        rounded-lg
                        px-4
                        py-2
                        text-xs
                        font-semibold
                        transition-all
                        ${
                          isActive
                            ? "bg-indigo-600 text-white shadow-2xs dark:bg-indigo-500"
                            : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                        }
                      `}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ────────────────────────────────────────────────────────── */}
          {/* SECTION 03: Team Members */}
          {/* ────────────────────────────────────────────────────────── */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-md bg-indigo-500/10 text-xs font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                  03
                </span>
                <div>
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                    Team Members
                  </h2>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    You are automatically added as the team owner.
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                {currentMemberCount} / {maxSize} members
              </span>
            </div>

            {/* Authenticated Creator Row */}
            <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50/50 p-3.5 dark:border-neutral-800 dark:bg-neutral-800/30">
              <div className="flex items-center gap-3">
                <UserAvatar avatar={creatorAvatar} name={creatorName} sizeClass="h-10 w-10 text-xs" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-neutral-900 dark:text-white">
                      {creatorName}
                    </p>
                    <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                      Team Owner
                    </span>
                  </div>
                  {creatorRole && (
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      {creatorRole}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Invited Members (Pending Invitations List) */}
            {invitedMemberIds.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Pending Invitations ({invitedMemberIds.length}):
                </p>
                <div className="space-y-2">
                  {invitedMemberIds.map((mId) => {
                    const memberInfo = TEAMMATES.find((t) => t.id === mId) || {
                      name: "Invited User",
                      role: "Participant",
                    };
                    return (
                      <div
                        key={mId}
                        className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-800/60"
                      >
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            avatar={memberInfo.avatar}
                            name={memberInfo.name}
                            sizeClass="h-8 w-8 text-xs"
                          />
                          <div>
                            <p className="text-xs font-bold text-neutral-900 dark:text-white">
                              {memberInfo.name}
                            </p>
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              Invitation Pending
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveInvitation(mId)}
                          className="text-xs text-red-500 hover:text-red-700 font-semibold"
                        >
                          Cancel
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Invite Connections Button */}
            <div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(true)}
                className="
                  inline-flex
                  items-center
                  gap-1.5
                  rounded-lg
                  border
                  border-neutral-300
                  bg-white
                  px-3.5
                  py-2
                  text-xs
                  font-semibold
                  text-neutral-700
                  shadow-2xs
                  transition-colors
                  hover:bg-neutral-50
                  dark:border-neutral-700
                  dark:bg-neutral-800
                  dark:text-neutral-200
                  dark:hover:bg-neutral-700
                "
              >
                <span>+ Invite Connections</span>
              </button>
            </div>
          </section>

          {/* ────────────────────────────────────────────────────────── */}
          {/* SECTION 04: Looking For */}
          {/* ────────────────────────────────────────────────────────── */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-5">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 dark:border-neutral-800">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-indigo-500/10 text-xs font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                04
              </span>
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  Looking For
                </h2>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Tell potential teammates which skills you need.
                </p>
              </div>
            </div>

            {/* Skills Needed */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Skills Needed
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  placeholder="Add skills you're looking for..."
                  className="
                    flex-1
                    rounded-lg
                    border
                    border-neutral-300
                    bg-white
                    p-2.5
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
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="rounded-lg bg-neutral-950 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                >
                  + Add Skill
                </button>
              </div>

              <div className="mt-2.5">
                {techStack.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {techStack.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(s)}
                          className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 italic">
                    No skills added yet
                  </p>
                )}
              </div>
            </div>

            {/* Roles Needed */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Specific Roles Needed
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  type="text"
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  placeholder="Add specific roles..."
                  className="
                    flex-1
                    rounded-lg
                    border
                    border-neutral-300
                    bg-white
                    p-2.5
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
                <button
                  type="button"
                  onClick={handleAddRole}
                  className="rounded-lg bg-neutral-950 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                >
                  + Add Role
                </button>
              </div>

              <div className="mt-2.5">
                {rolesNeeded.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {rolesNeeded.map((r) => (
                      <span
                        key={r}
                        className="inline-flex items-center gap-1 rounded-md bg-indigo-500/10 px-2.5 py-1 text-[11px] font-medium text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
                      >
                        {r}
                        <button
                          type="button"
                          onClick={() => handleRemoveRole(r)}
                          className="text-indigo-400 hover:text-indigo-700 dark:hover:text-white"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 italic">
                    No roles added yet
                  </p>
                )}
              </div>
            </div>

            {/* What kind of teammate are you looking for? */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                What kind of teammate are you looking for?
              </label>
              <textarea
                rows={3}
                value={lookingForDescription}
                onChange={(e) => setLookingForDescription(e.target.value)}
                placeholder="Describe the mindset, skills, or availability you're looking for in potential teammates..."
                className="
                  mt-1.5
                  w-full
                  rounded-lg
                  border
                  border-neutral-300
                  bg-white
                  p-3
                  text-xs
                  text-neutral-900
                  shadow-2xs
                  outline-none
                  transition-colors
                  focus:border-indigo-500
                  dark:border-neutral-700
                  dark:bg-neutral-800
                  dark:text-white
                "
              />
            </div>
          </section>

          {/* ────────────────────────────────────────────────────────── */}
          {/* SECTION 05: Team Settings */}
          {/* ────────────────────────────────────────────────────────── */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-5">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 dark:border-neutral-800">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-indigo-500/10 text-xs font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                05
              </span>
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  Team Settings
                </h2>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Set the maximum number of team members.
                </p>
              </div>
            </div>

            {/* Maximum Team Size Counter */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Maximum Team Size <span className="text-red-500">*</span>
              </label>
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleDecrementSize}
                  disabled={maxSize <= (currentMemberCount + invitedMemberIds.length)}
                  className="
                    grid
                    h-10
                    w-10
                    place-items-center
                    rounded-lg
                    border
                    border-neutral-300
                    bg-white
                    text-base
                    font-bold
                    text-neutral-700
                    shadow-2xs
                    transition-colors
                    hover:bg-neutral-100
                    disabled:opacity-40
                    dark:border-neutral-700
                    dark:bg-neutral-800
                    dark:text-neutral-200
                    dark:hover:bg-neutral-700
                  "
                >
                  −
                </button>

                <input
                  type="number"
                  min={currentMemberCount + invitedMemberIds.length}
                  max={10}
                  value={maxSize}
                  onChange={handleManualSizeChange}
                  className="
                    h-10
                    w-16
                    rounded-lg
                    border
                    border-neutral-300
                    bg-white
                    text-center
                    text-sm
                    font-bold
                    text-neutral-900
                    shadow-2xs
                    outline-none
                    focus:border-indigo-500
                    dark:border-neutral-700
                    dark:bg-neutral-800
                    dark:text-white
                  "
                />

                <button
                  type="button"
                  onClick={handleIncrementSize}
                  disabled={maxSize >= 10}
                  className="
                    grid
                    h-10
                    w-10
                    place-items-center
                    rounded-lg
                    border
                    border-neutral-300
                    bg-white
                    text-base
                    font-bold
                    text-neutral-700
                    shadow-2xs
                    transition-colors
                    hover:bg-neutral-100
                    disabled:opacity-40
                    dark:border-neutral-700
                    dark:bg-neutral-800
                    dark:text-neutral-200
                    dark:hover:bg-neutral-700
                  "
                >
                  +
                </button>
              </div>

              <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">
                Current members: <strong>{currentMemberCount}</strong> · Pending invitations: <strong>{invitedMemberIds.length}</strong> · Open spots: <strong>{Math.max(0, maxSize - currentMemberCount - invitedMemberIds.length)}</strong>.
              </p>
            </div>
          </section>

          {/* ── Fixed Bottom Actions Bar ── */}
          <div className="fixed bottom-0 inset-x-0 z-40 border-t border-neutral-200 bg-white/90 p-4 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/90">
            <div className="mx-auto flex max-w-3xl items-center justify-between">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="
                  rounded-lg
                  border
                  border-neutral-200
                  bg-white
                  px-5
                  py-2.5
                  text-xs
                  font-semibold
                  text-neutral-700
                  shadow-2xs
                  transition-colors
                  hover:bg-neutral-50
                  dark:border-neutral-800
                  dark:bg-neutral-900
                  dark:text-neutral-300
                  dark:hover:bg-neutral-800
                "
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-lg
                  bg-indigo-600
                  px-6
                  py-2.5
                  text-xs
                  font-semibold
                  text-white
                  shadow-2xs
                  transition-colors
                  hover:bg-indigo-500
                  disabled:opacity-50
                  dark:bg-indigo-500
                  dark:hover:bg-indigo-400
                "
              >
                <span>{isSubmitting ? "Creating Team..." : "Create Team"}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Invite Connections Modal */}
        <InviteConnectionsModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          maxSize={maxSize}
          currentSize={currentMemberCount}
          existingMemberIds={[creatorId]}
          pendingInvitationIds={invitedMemberIds}
          onSendInvitations={handleSendInvitations}
        />
      </main>
    </div>
  );
}
