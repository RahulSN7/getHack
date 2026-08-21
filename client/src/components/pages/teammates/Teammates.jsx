// ---------------------------------------------------------------------------
// Teammates — Find Teammates hub page with dual-mode tabs
//
// Tab 1: "Find Members" — browse individual profiles
// Tab 2: "Join a Team"  — browse open team listings
//
// Pipeline: data → search → filters → sort → grid
// Same architecture as Hackathons.jsx
// ---------------------------------------------------------------------------

import { useMemo, useState, useEffect } from "react";
import { useAuth } from "../../../context/useAuth";
import { userService } from "../../../services/userService";
import { isProfileComplete } from "../../../utils/profileValidation";
import { TEAMMATES } from "../../../data/teammates";
import { TEAMS } from "../../../data/teams";
import TeammateSearch from "./TeammateSearch";
import TeammateFilters from "./TeammateFilters";
import TeammateCard from "./TeammateCard";
import TeamCard from "./TeamCard";
import TeamDetailsModal from "./TeamDetailsModal";

// ---------------------------------------------------------------------------
// Role matching helper (maps filter IDs to role strings)
// ---------------------------------------------------------------------------

const ROLE_KEYWORDS = {
  frontend: ["frontend"],
  backend: ["backend"],
  fullstack: ["full stack"],
  designer: ["designer", "ui/ux", "ux"],
  ml: ["ml", "data", "machine learning"],
  devops: ["devops"],
  mobile: ["mobile", "flutter", "ios", "android"],
  blockchain: ["blockchain", "web3", "solidity"],
  product: ["product", "pm"],
};

function matchesRole(roleStr, filterId) {
  if (filterId === "all") return true;
  const keywords = ROLE_KEYWORDS[filterId] || [];
  const lowerRole = roleStr.toLowerCase();
  return keywords.some((kw) => lowerRole.includes(kw));
}

// ---------------------------------------------------------------------------
// Search: Find Members
// ---------------------------------------------------------------------------

function searchMembers(members, query) {
  if (!query.trim()) return members;
  const q = query.toLowerCase().replace(/^@/, "");
  return members.filter(
    (m) =>
      m.name.toLowerCase().includes(q) ||
      (m.username && m.username.toLowerCase().includes(q)) ||
      m.role.toLowerCase().includes(q) ||
      m.skills.some((s) => s.toLowerCase().includes(q)) ||
      (m.location && m.location.toLowerCase().includes(q))
  );
}

// ---------------------------------------------------------------------------
// Filters: Find Members
// ---------------------------------------------------------------------------

function filterMembers(members, { roleFilter, experienceFilter, availabilityFilter }) {
  let result = members;

  if (roleFilter !== "all") {
    result = result.filter((m) => matchesRole(m.role, roleFilter));
  }
  if (experienceFilter !== "all") {
    result = result.filter((m) => m.experience === experienceFilter);
  }
  if (availabilityFilter !== "all") {
    if (availabilityFilter === "Available") {
      result = result.filter(
        (m) => isProfileComplete(m) && m.availability === "Available"
      );
    } else {
      result = result.filter((m) => m.availability === availabilityFilter);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Search: Join a Team
// ---------------------------------------------------------------------------

function searchTeams(teams, query) {
  if (!query.trim()) return teams;
  const q = query.toLowerCase();
  return teams.filter(
    (t) =>
      t.teamName.toLowerCase().includes(q) ||
      t.hackathonName.toLowerCase().includes(q) ||
      t.rolesNeeded.some((r) => r.toLowerCase().includes(q)) ||
      t.techStack.some((s) => s.toLowerCase().includes(q)) ||
      (t.location && t.location.toLowerCase().includes(q))
  );
}

// ---------------------------------------------------------------------------
// Filters: Join a Team
// ---------------------------------------------------------------------------

function filterTeams(teams, { teamStatusFilter }) {
  if (teamStatusFilter === "all") return teams;
  return teams.filter((t) => t.status === teamStatusFilter);
}

// ---------------------------------------------------------------------------
// Sort helpers
// ---------------------------------------------------------------------------

function sortMembers(members, sortBy) {
  const sorted = [...members];
  switch (sortBy) {
    case "name-asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "name-desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case "experience":
      return sorted.sort((a, b) => {
        const order = { Advanced: 0, Intermediate: 1, Beginner: 2 };
        return (order[a.experience] ?? 3) - (order[b.experience] ?? 3);
      });
    case "hackathons":
      return sorted.sort(
        (a, b) => (b.hackathonsCompleted ?? 0) - (a.hackathonsCompleted ?? 0)
      );
    default:
      return sorted;
  }
}

function sortTeams(teams, sortBy) {
  const sorted = [...teams];
  switch (sortBy) {
    case "name-asc":
      return sorted.sort((a, b) => a.teamName.localeCompare(b.teamName));
    case "name-desc":
      return sorted.sort((a, b) => b.teamName.localeCompare(a.teamName));
    case "spots":
      return sorted.sort(
        (a, b) => (b.maxSize - b.currentSize) - (a.maxSize - a.currentSize)
      );
    default:
      return sorted;
  }
}

// ---------------------------------------------------------------------------
// Sort dropdown options
// ---------------------------------------------------------------------------

const MEMBER_SORT_OPTIONS = [
  { id: "default", label: "Default" },
  { id: "name-asc", label: "Name A–Z" },
  { id: "name-desc", label: "Name Z–A" },
  { id: "experience", label: "Experience" },
  { id: "hackathons", label: "Most Hackathons" },
];

const TEAM_SORT_OPTIONS = [
  { id: "default", label: "Default" },
  { id: "name-asc", label: "Name A–Z" },
  { id: "name-desc", label: "Name Z–A" },
  { id: "spots", label: "Most Open Spots" },
];

// ---------------------------------------------------------------------------
// Empty state component
// ---------------------------------------------------------------------------

function EmptyState({ hasFilters, onClear, message }) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
        <svg
          className="h-6 w-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-neutral-900 dark:text-white">
        {message || "No results found"}
      </p>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        {hasFilters
          ? "Try adjusting your search or filters."
          : "Check back later for new listings."}
      </p>
      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-neutral-950 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

function Teammates() {
  const { user: currentUser, isAuthenticated } = useAuth();

  // Dynamic participants state
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tab state
  const [activeTab, setActiveTab] = useState("members");

  // Selected team for Team Details modal
  const [selectedTeam, setSelectedTeam] = useState(null);

  // Connection flow states
  const [connectTarget, setConnectTarget] = useState(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isCompletePromptOpen, setIsCompletePromptOpen] = useState(false);
  const [connectNote, setConnectNote] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestError, setRequestError] = useState(null);
  const [sentMap, setSentMap] = useState({});

  const handleConnectClick = async (member) => {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }

    let userToCheck = currentUser;
    try {
      const ownData = await userService.getOwnProfile();
      if (ownData?.user) userToCheck = ownData.user;
    } catch {
      // fallback
    }

    if (!isProfileComplete(userToCheck)) {
      setIsCompletePromptOpen(true);
      return;
    }

    setConnectTarget(member);
    setConnectNote("");
    setRequestError(null);
    setIsConnectModalOpen(true);
  };

  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!connectTarget) return;
    setRequestError(null);
    try {
      setSendingRequest(true);
      await userService.sendConnectionRequest(connectTarget.id || connectTarget._id, connectNote);
      setSentMap((prev) => ({ ...prev, [connectTarget.id || connectTarget._id]: "pending" }));
      setIsConnectModalOpen(false);
      setConnectTarget(null);
      setConnectNote("");
    } catch (err) {
      console.error("Failed to send request:", err);
      if (err.code === "PROFILE_INCOMPLETE" || err.message?.toLowerCase().includes("complete your profile")) {
        setIsConnectModalOpen(false);
        setIsCompletePromptOpen(true);
        return;
      }
      setRequestError(err.message || "Failed to send connection request.");
    } finally {
      setSendingRequest(false);
    }
  };

  // Load dynamic participants from backend API on mount
  useEffect(() => {
    let isMounted = true;
    async function fetchParticipants() {
      setLoading(true);
      setError(null);
      try {
        const data = await userService.getParticipants();
        if (isMounted && data?.participants) {
          const normalized = data.participants.map((p) => ({
            id: p.id,
            _id: p.id,
            name: p.name,
            role: p.profile?.role || "Participant",
            bio: p.profile?.bio || "",
            skills: p.profile?.skills || [],
            experience: p.profile?.experienceLevel || "Intermediate",
            location: p.profile?.location || "",
            availability: p.profile?.availability || "",
            username: p.profile?.handle?.replace(/^@/, "") || `user_${p.id.slice(-4)}`,
            avatar: p.profile?.avatar || "",
            education: p.profile?.education || {},
            connectionState: p.connectionState || { status: "none" },
            profile: p.profile,
          }));
          setMembers(normalized);
        }
      } catch (err) {
        console.error("Failed to load participants:", err);
        if (isMounted) setError("Failed to load participants.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchParticipants();
    return () => {
      isMounted = false;
    };
  }, []);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Filters — Members
  const [roleFilter, setRoleFilter] = useState("all");
  const [experienceFilter, setExperienceFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");

  // Filters — Teams
  const [teamStatusFilter, setTeamStatusFilter] = useState("all");

  // Sort
  const [memberSort, setMemberSort] = useState("default");
  const [teamSort, setTeamSort] = useState("default");

  // Derived state
  const hasFilters =
    searchQuery.trim() !== "" ||
    (activeTab === "members" &&
      (roleFilter !== "all" || experienceFilter !== "all" || availabilityFilter !== "all")) ||
    (activeTab === "teams" && teamStatusFilter !== "all");

  // Clear all state
  const handleClearAll = () => {
    setSearchQuery("");
    setRoleFilter("all");
    setExperienceFilter("all");
    setAvailabilityFilter("all");
    setTeamStatusFilter("all");
    setMemberSort("default");
    setTeamSort("default");
  };

  // Pipeline: Members
  const memberResults = useMemo(() => {
    const searched = searchMembers(members, searchQuery);
    const filtered = filterMembers(searched, { roleFilter, experienceFilter, availabilityFilter });
    return sortMembers(filtered, memberSort);
  }, [members, searchQuery, roleFilter, experienceFilter, availabilityFilter, memberSort]);

  // Pipeline: Teams
  const teamResults = useMemo(() => {
    const searched = searchTeams(TEAMS, searchQuery);
    const filtered = filterTeams(searched, { teamStatusFilter });
    return sortTeams(filtered, teamSort);
  }, [searchQuery, teamStatusFilter, teamSort]);

  const results = activeTab === "members" ? memberResults : teamResults;
  const sortOptions = activeTab === "members" ? MEMBER_SORT_OPTIONS : TEAM_SORT_OPTIONS;
  const currentSort = activeTab === "members" ? memberSort : teamSort;
  const setCurrentSort = activeTab === "members" ? setMemberSort : setTeamSort;

  // Handle filter apply from popover
  const handleFilterApply = ({
    roleFilter: r,
    experienceFilter: e,
    availabilityFilter: a,
    teamStatusFilter: ts,
  }) => {
    setRoleFilter(r);
    setExperienceFilter(e);
    setAvailabilityFilter(a);
    setTeamStatusFilter(ts);
  };

  const handleFilterClear = () => {
    setRoleFilter("all");
    setExperienceFilter("all");
    setAvailabilityFilter("all");
    setTeamStatusFilter("all");
  };

  // Reset search when switching tabs
  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-neutral-900 transition-colors dark:bg-neutral-950 dark:text-neutral-100">
      {/* ── Page Header ── */}
      <div className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mx-auto max-w-7xl px-5 pb-6 pt-5 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-indigo-500">
            Connect
          </p>

          {/* Heading */}
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-white">
            Find Teammates
          </h1>
          <p className="mt-2 text-base text-neutral-500 dark:text-neutral-400">
            Find skilled people to build with — or join a team that needs you.
          </p>

          {/* Search */}
          <div className="mt-6 max-w-2xl">
            <TeammateSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={
                activeTab === "members"
                  ? "Search by name, role, or skills…"
                  : "Search by team name, hackathon, or role…"
              }
            />
          </div>

          {/* Toolbar: Tabs + Filters */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Tab Switcher */}
              <div className="inline-flex rounded-lg border border-neutral-200 bg-neutral-50 p-0.5 dark:border-neutral-800 dark:bg-neutral-900">
                <button
                  type="button"
                  onClick={() => handleTabSwitch("members")}
                  className={`
                    inline-flex
                    items-center
                    gap-1.5
                    rounded-md
                    px-3
                    py-1.5
                    text-xs
                    font-semibold
                    transition-all
                    duration-150
                    ${
                      activeTab === "members"
                        ? "bg-white text-neutral-900 shadow-xs dark:bg-neutral-800 dark:text-white"
                        : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                    }
                  `}
                >
                  {/* People icon */}
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" y1="8" x2="19" y2="14" />
                    <line x1="22" y1="11" x2="16" y2="11" />
                  </svg>
                  <span>Find Members</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabSwitch("teams")}
                  className={`
                    inline-flex
                    items-center
                    gap-1.5
                    rounded-md
                    px-3
                    py-1.5
                    text-xs
                    font-semibold
                    transition-all
                    duration-150
                    ${
                      activeTab === "teams"
                        ? "bg-white text-neutral-900 shadow-xs dark:bg-neutral-800 dark:text-white"
                        : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                    }
                  `}
                >
                  {/* Team icon */}
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 1 0 7.75" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span>Join a Team</span>
                </button>
              </div>

              {/* Filters */}
              <TeammateFilters
                activeTab={activeTab}
                roleFilter={roleFilter}
                experienceFilter={experienceFilter}
                availabilityFilter={availabilityFilter}
                teamStatusFilter={teamStatusFilter}
                onApply={handleFilterApply}
                onClear={handleFilterClear}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
        {/* Sort + Count Row */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <p className="text-sm font-normal text-neutral-500 dark:text-neutral-400">
            <span className="font-semibold text-neutral-900 dark:text-white">
              {results.length}
            </span>{" "}
            {activeTab === "members"
              ? results.length === 1
                ? "person"
                : "people"
              : results.length === 1
              ? "team"
              : "teams"}
          </p>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="teammate-sort"
              className="shrink-0 text-xs font-medium text-neutral-500 dark:text-neutral-400"
            >
              Sort by
            </label>
            <div className="relative">
              <select
                id="teammate-sort"
                value={currentSort}
                onChange={(e) => setCurrentSort(e.target.value)}
                className="
                  h-8
                  appearance-none
                  rounded-lg
                  border
                  border-neutral-200
                  bg-white
                  pl-3
                  pr-8
                  text-xs
                  font-medium
                  text-neutral-700
                  outline-none
                  transition-[border-color,box-shadow]
                  duration-150
                  focus:border-indigo-400
                  focus:ring-2
                  focus:ring-indigo-500/15
                  dark:border-neutral-800
                  dark:bg-neutral-900
                  dark:text-neutral-200
                  dark:focus:border-indigo-500
                "
              >
                {sortOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-neutral-400 dark:text-neutral-500"
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </div>
          </div>
        </div>

        {/* Card Grid, Loading Skeleton, or Empty State */}
        {activeTab === "members" && loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900" />
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {activeTab === "members"
              ? results.map((member) => (
                  <TeammateCard
                    key={member.id || member._id}
                    teammate={member}
                    onConnect={handleConnectClick}
                    connectionStatus={sentMap[member.id || member._id] || member.connectionState?.status}
                  />
                ))
              : results.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    onViewDetails={(t) => setSelectedTeam(t)}
                  />
                ))}
          </div>
        ) : (
          <EmptyState
            hasFilters={hasFilters}
            onClear={handleClearAll}
            message={
              activeTab === "members"
                ? "No teammates found"
                : "No teams found"
            }
          />
        )}
      </main>

      {/* Team Details Modal */}
      {selectedTeam && (
        <TeamDetailsModal
          team={selectedTeam}
          onClose={() => setSelectedTeam(null)}
        />
      )}



      {/* ── Send Connection Request Modal (with optional note) ── */}
      {isConnectModalOpen && connectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3 dark:border-neutral-800">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Send Connection Request
              </h3>
              <button
                type="button"
                onClick={() => setIsConnectModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                ✕
              </button>
            </div>

            {requestError && (
              <div className="mt-3 rounded-lg bg-red-500/10 p-2.5 text-xs font-medium text-red-600 dark:bg-red-500/15 dark:text-red-400">
                {requestError}
              </div>
            )}

            <form onSubmit={handleSendRequest} className="mt-4 space-y-4">
              <div className="flex items-center gap-3 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/50">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-500/10 text-sm font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                  {connectTarget.name ? connectTarget.name.charAt(0).toUpperCase() : "?"}
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-900 dark:text-white">
                    To: {connectTarget.name}
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {connectTarget.role}
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Add a note (optional)
                  </label>
                  <span className={`text-[11px] font-medium ${connectNote.length > 300 ? "text-red-500" : "text-neutral-400"}`}>
                    {connectNote.length} / 300
                  </span>
                </div>
                <textarea
                  rows={4}
                  maxLength={300}
                  value={connectNote}
                  onChange={(e) => setConnectNote(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white p-3 text-xs text-neutral-900 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  placeholder="Hi! I'd love to connect and collaborate on upcoming hackathons..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConnectModalOpen(false)}
                  className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingRequest}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                >
                  {sendingRequest ? "Sending..." : "Send Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Complete Profile Required Prompt Modal */}
      {isCompletePromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Complete your profile first
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
              Please complete your profile before connecting with other users. A complete profile helps other developers understand your skills, interests, and professional background.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCompletePromptOpen(false)}
                className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCompletePromptOpen(false);
                  window.location.href = "/profile";
                }}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
              >
                Complete Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Teammates;
