// ---------------------------------------------------------------------------
// client/src/components/pages/landing/FindTeammates.jsx
// Dynamic Find Teammates section for Landing Page — backed by MongoDB API
// ---------------------------------------------------------------------------

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../context/useAuth";
import { userService } from "../../../services/userService";
import { isProfileComplete } from "../../../utils/profileValidation";
import TeammateCard from "../teammates/TeammateCard";

function FindTeammates() {
  const { user: currentUser, isAuthenticated } = useAuth();

  // Dynamic state
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Connection flow state
  const [connectTarget, setConnectTarget] = useState(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isCompletePromptOpen, setIsCompletePromptOpen] = useState(false);
  const [connectNote, setConnectNote] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestError, setRequestError] = useState(null);
  const [sentMap, setSentMap] = useState({});

  const fetchParticipants = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userService.getParticipants({ limit: 4 });
      if (data?.participants) {
        const currentId = currentUser?.id || currentUser?._id;
        const normalized = data.participants
          .filter((p) => (p.id || p._id) !== currentId)
          .map((p) => ({
            id: p.id || p._id,
            _id: p.id || p._id,
            name: p.name,
            role: p.profile?.role || "Participant",
            bio: p.profile?.bio || "",
            skills: Array.isArray(p.profile?.skills) ? p.profile.skills : [],
            experience: p.profile?.experienceLevel || "Intermediate",
            location: p.profile?.location || "",
            availability: p.profile?.availability || "",
            username: p.profile?.handle?.replace(/^@/, "") || `user_${(p.id || p._id || "").slice(-4)}`,
            avatar: p.profile?.avatar || "",
            education: p.profile?.education || {},
            connectionState: p.connectionState || { status: "none" },
            profile: p.profile,
          }));
        setMembers(normalized);
      } else {
        setMembers([]);
      }
    } catch (err) {
      console.error("Failed to load landing teammates:", err);
      setError("Unable to load teammates. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, [currentUser]);

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
      const targetId = connectTarget.id || connectTarget._id;
      await userService.sendConnectionRequest(targetId, connectNote);
      setSentMap((prev) => ({ ...prev, [targetId]: "pending" }));
      setIsConnectModalOpen(false);
      setConnectTarget(null);
      setConnectNote("");
    } catch (err) {
      console.error("Failed to send connection request:", err);
      if (
        err.code === "PROFILE_INCOMPLETE" ||
        err.message?.toLowerCase().includes("complete your profile")
      ) {
        setIsConnectModalOpen(false);
        setIsCompletePromptOpen(true);
        return;
      }
      setRequestError(err.message || "Failed to send connection request.");
    } finally {
      setSendingRequest(false);
    }
  };

  return (
    <section
      id="teammates"
      className="
        border-y
        border-neutral-200
        bg-neutral-50
        px-6
        py-20

        dark:border-neutral-800
        dark:bg-neutral-950/50
      "
    >
      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-wide text-indigo-500">
            Team up
          </p>
          <h2
            className="
              mt-2
              text-3xl
              font-bold
              tracking-tight
              text-neutral-900
              sm:text-4xl

              dark:text-white
            "
          >
            Find the right teammates
          </h2>
          <p
            className="
              mt-3
              text-base
              leading-relaxed
              text-neutral-500

              dark:text-neutral-400
            "
          >
            Search by skills, tech stack, and interests. Build a team where everyone brings something different to the table.
          </p>
        </div>

        {/* Dynamic Content Grid / Loading / Error / Empty State */}
        {loading ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-28 rounded bg-neutral-200 dark:bg-neutral-800" />
                    <div className="h-3 w-16 rounded bg-neutral-200 dark:bg-neutral-800" />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-3 w-full rounded bg-neutral-200 dark:bg-neutral-800" />
                  <div className="h-3 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
                </div>
                <div className="mt-4 flex gap-2">
                  <div className="h-5 w-14 rounded bg-neutral-200 dark:bg-neutral-800" />
                  <div className="h-5 w-14 rounded bg-neutral-200 dark:bg-neutral-800" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="mt-10 rounded-xl border border-red-200 bg-red-50/50 p-6 text-center dark:border-red-900/50 dark:bg-red-950/20">
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">
              {error}
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Check back in a moment or click retry.
            </p>
            <button
              type="button"
              onClick={fetchParticipants}
              className="mt-3 inline-flex items-center rounded-lg bg-neutral-900 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Retry
            </button>
          </div>
        ) : members.length === 0 ? (
          <div className="mt-10 rounded-xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">
              No teammates available yet.
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Check back soon as developers join the platform.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {members.map((member) => (
              <TeammateCard
                key={member.id || member._id}
                teammate={member}
                onConnect={handleConnectClick}
                connectionStatus={sentMap[member.id || member._id] || member.connectionState?.status}
              />
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-10">
          <Link
            to="/teammates"
            className="
              inline-flex
              h-10
              items-center
              gap-2

              rounded-lg

              border
              border-neutral-300
              px-4

              text-sm
              font-medium
              text-neutral-700

              transition-colors
              duration-150

              hover:border-neutral-400
              hover:text-neutral-950

              dark:border-neutral-700
              dark:text-neutral-300
              dark:hover:border-neutral-500
              dark:hover:text-white
            "
          >
            <span>Browse all developers</span>
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

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
    </section>
  );
}

export default FindTeammates;
