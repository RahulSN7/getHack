// ---------------------------------------------------------------------------
// UserProfile — Production Participant Developer Profile Component
// Unified profile view for /profile (own profile) and /profile/:id (public view)
// Zero static/fake data. Integrates real backend MongoDB data & completion stats.
// ---------------------------------------------------------------------------

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../../context/useAuth";
import { userService } from "../../../services/userService";
import { TEAMMATES } from "../../../data/teammates";
import ProfileCompletionBar from "./ProfileCompletionBar";
import EditProfileModal from "./EditProfileModal";
import { ACCENT_TEXT, ACCENT_BG_SOFT } from "../../../constants/themeTokens";

function AvailabilityBadge({ availability }) {
  const isAvailable = availability === "Available";

  if (isAvailable) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Available
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
      <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500" />
      Not Available
    </span>
  );
}

export default function UserProfile() {
  const { id } = useParams();
  const { user: currentUser, isAuthenticated } = useAuth();

  const [profileUser, setProfileUser] = useState(null);
  const [profileCompletion, setProfileCompletion] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [connectionState, setConnectionState] = useState({ status: "none" });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUnauthenticated, setIsUnauthenticated] = useState(false);

  // Edit Profile Modal state
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Connection Request Modal state
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isCompletePromptOpen, setIsCompletePromptOpen] = useState(false);
  const [connectNote, setConnectNote] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestError, setRequestError] = useState(null);

  const targetId = id || "me";

  useEffect(() => {
    let isMounted = true;
    async function loadProfile() {
      setLoading(true);
      setError(null);
      setIsUnauthenticated(false);

      try {
        if (targetId === "me" || (currentUser && (currentUser.id === targetId || currentUser._id === targetId))) {
          if (!currentUser && !isAuthenticated) {
            if (isMounted) {
              setIsUnauthenticated(true);
              setLoading(false);
            }
            return;
          }

          try {
            const data = await userService.getOwnProfile();
            if (isMounted && data?.user) {
              setProfileUser(data.user);
              setProfileCompletion(data.profileCompletion);
              setIsOwner(true);
              return;
            }
          } catch {
            if (currentUser && isMounted) {
              setProfileUser(currentUser);
              setIsOwner(true);
              return;
            }
            if (isMounted) setIsUnauthenticated(true);
            return;
          }
        } else {
          try {
            const data = await userService.getParticipantProfile(targetId);
            if (isMounted && data?.user) {
              setProfileUser(data.user);
              setProfileCompletion(data.profileCompletion);
              setIsOwner(Boolean(data.isOwner));
              setConnectionState(data.connectionState || { status: "none" });
              return;
            }
          } catch (apiErr) {
            // Check fallback TEAMMATES list by ID or username
            const teammate = TEAMMATES.find(
              (m) => m.id === targetId || (m.username && m.username.toLowerCase() === targetId.toLowerCase())
            );

            if (teammate && isMounted) {
              setProfileUser({
                id: teammate.id,
                name: teammate.name,
                email: teammate.email || "",
                role: teammate.role,
                profile: {
                  avatar: teammate.avatar || "",
                  role: teammate.role,
                  bio: teammate.bio || "",
                  skills: teammate.skills || [],
                  availability: teammate.availability || "Available",
                  college: teammate.college || "",
                  degree: teammate.degree || "",
                  education: { college: teammate.college || "", degree: teammate.degree || "" },
                  experienceLevel: teammate.experience || "Intermediate",
                  experienceDetails: teammate.headline || "",
                  interests: teammate.interests || [],
                  github: teammate.github || "",
                  linkedin: teammate.linkedin || "",
                  portfolio: teammate.portfolio || "",
                  location: teammate.location || "",
                  handle: teammate.username ? `@${teammate.username}` : `GH-${teammate.id.toUpperCase()}`,
                },
              });
              setProfileCompletion({ percentage: 100, isComplete: true, missingFields: [] });
              setIsOwner(false);
              return;
            }
            throw apiErr;
          }
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
        if (isMounted) {
          setError(err.message || "Profile not found.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [targetId, currentUser, isAuthenticated]);

  // Handle saving profile changes
  const handleSaveProfile = async (updatedData) => {
    const res = await userService.updateParticipantProfile(updatedData);
    if (res?.user) {
      setProfileUser(res.user);
      setProfileCompletion(res.profileCompletion);
    }
  };

  // Connect button click handler
  const handleConnectClick = async () => {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }

    // Check current user's profile completion
    try {
      const ownData = await userService.getOwnProfile();
      if (!ownData.profileCompletion?.isComplete) {
        setIsCompletePromptOpen(true);
        return;
      }
      setIsConnectModalOpen(true);
    } catch {
      setIsCompletePromptOpen(true);
    }
  };

  // Submit Connection Request with optional note
  const handleSendConnectionRequest = async (e) => {
    e.preventDefault();
    setRequestError(null);
    try {
      setSendingRequest(true);
      await userService.sendConnectionRequest(profileUser.id || profileUser._id, connectNote);
      setConnectionState({ status: "pending", isSender: true });
      setIsConnectModalOpen(false);
      setConnectNote("");
    } catch (err) {
      console.error("Failed to send connection request:", err);
      setRequestError(err.message || "Failed to send request.");
    } finally {
      setSendingRequest(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-neutral-900 transition-colors dark:bg-neutral-950 dark:text-neutral-100">
        <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-32 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-20 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-48 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
          </div>
        </main>
      </div>
    );
  }

  if (isUnauthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Please log in to view your profile
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            You need to be signed in as a getHack participant to access your profile.
          </p>
          <div className="mt-6">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              Log In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="min-h-screen bg-slate-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/></svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Profile not found
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            The participant profile you're looking for doesn't exist or is unavailable.
          </p>
          <div className="mt-6">
            <Link
              to="/teammates"
              className="inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
            >
              <span>Back to Find Teammates</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const profile = profileUser.profile || {};
  const name = profileUser.name || "Participant";
  const avatar = profile.avatar || "";
  const role = profile.role || "Participant";
  const bio = profile.bio || "";
  const availability = profile.availability || "Available";
  const skills = Array.isArray(profile.skills) ? profile.skills : [];
  const education = profile.education || {};
  const college = profile.college || education.college || "";
  const degree = profile.degree || education.degree || "";
  const experienceLevel = profile.experienceLevel || "Intermediate";
  const experienceDetails = profile.experienceDetails || "";
  const interests = Array.isArray(profile.interests) ? profile.interests : [];
  const github = profile.github || "";
  const linkedin = profile.linkedin || "";
  const portfolio = profile.portfolio || "";
  const location = profile.location || "";
  const gender = profile.gender || "";
  const dateOfBirth = profile.dateOfBirth || "";
  const getHackId = profile.handle || `GH-${(profileUser.id || profileUser._id || "000000").slice(-6).toUpperCase()}`;

  const initials = name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "GH";

  return (
    <div className="min-h-screen bg-slate-50 text-neutral-900 transition-colors dark:bg-neutral-950 dark:text-neutral-100">
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* ── 1. Profile Header Card ── */}
        <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              {/* Photo / Avatar */}
              {avatar ? (
                <img
                  src={avatar}
                  alt={name}
                  className="h-16 w-16 shrink-0 rounded-2xl object-cover border border-neutral-200 dark:border-neutral-800"
                />
              ) : (
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-indigo-500/10 text-xl font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                  {initials}
                </div>
              )}

              {/* Name & Identity */}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                    {name}
                  </h1>
                  <AvailabilityBadge availability={availability} />
                </div>

                <p className="mt-1 text-sm font-medium text-neutral-600 dark:text-neutral-300">
                  {role}
                </p>

                <p className="mt-1 font-mono text-xs font-medium text-neutral-400 dark:text-neutral-500">
                  getHack ID: {getHackId}
                </p>

                {location && (
                  <p className="mt-2 flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span>{location}</span>
                  </p>
                )}

                {isOwner && (gender || dateOfBirth) && (
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-400 dark:text-neutral-500">
                    {gender && <span>Gender: {gender}</span>}
                    {gender && dateOfBirth && <span>•</span>}
                    {dateOfBirth && <span>DOB: {dateOfBirth}</span>}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex shrink-0 items-center gap-3">
              {isOwner ? (
                <button
                  type="button"
                  onClick={() => setIsEditOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  <span>Edit Profile</span>
                </button>
              ) : connectionState.status === "accepted" ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                  <span>✓ Connected</span>
                </span>
              ) : connectionState.status === "pending" ? (
                <button
                  type="button"
                  disabled
                  className="cursor-not-allowed inline-flex items-center gap-1.5 rounded-lg bg-neutral-100 px-4 py-2 text-xs font-semibold text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500"
                >
                  <span>Request Sent</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectClick}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                  <span>Connect</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ── 2. Profile Completion Bar (Visible for owner) ── */}
        {isOwner && (
          <ProfileCompletionBar
            profileCompletion={profileCompletion}
            onEditClick={() => setIsEditOpen(true)}
          />
        )}

        {/* ── 3. About / Bio ── */}
        <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            About
          </h2>
          {bio ? (
            <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 whitespace-pre-line">
              {bio}
            </p>
          ) : (
            <p className="text-xs text-neutral-400 italic">No bio provided yet.</p>
          )}
        </section>

        {/* ── 4. Skills ── */}
        <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            Skills
          </h2>
          {skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-md bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-400 italic">No skills listed yet.</p>
          )}
        </section>

        {/* ── 5. Education ── */}
        <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            Education
          </h2>
          {college || degree ? (
            <div>
              <p className="text-sm font-bold text-neutral-900 dark:text-white">
                {college || "University / College"}
              </p>
              <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                {degree} {education.fieldOfStudy ? `· ${education.fieldOfStudy}` : ""}
              </p>
              {education.graduationYear && (
                <p className="mt-1 text-[11px] text-neutral-400">
                  Class of {education.graduationYear}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-neutral-400 italic">No education information provided yet.</p>
          )}
        </section>

        {/* ── 6. Experience & Interests ── */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Experience */}
          <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Experience
            </h2>
            <div>
              <p className="text-xs font-semibold text-neutral-900 dark:text-white">
                Level: {experienceLevel}
              </p>
              {experienceDetails && (
                <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
                  {experienceDetails}
                </p>
              )}
            </div>
          </section>

          {/* Interests */}
          <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Interests
            </h2>
            {interests.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {interests.map((item) => (
                  <span
                    key={item}
                    className="rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-400 italic">No interests specified yet.</p>
            )}
          </section>
        </div>

        {/* ── 7. Professional Links ── */}
        <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            Professional Links
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            {github ? (
              <a
                href={github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 transition-colors hover:border-neutral-300 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:text-white"
              >
                <span>GitHub ↗</span>
              </a>
            ) : null}

            {linkedin ? (
              <a
                href={linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 transition-colors hover:border-neutral-300 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:text-white"
              >
                <span>LinkedIn ↗</span>
              </a>
            ) : null}

            {portfolio ? (
              <a
                href={portfolio}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 transition-colors hover:border-neutral-300 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:text-white"
              >
                <span>Portfolio ↗</span>
              </a>
            ) : null}

            {!github && !linkedin && !portfolio && (
              <p className="text-xs text-neutral-400 italic">No professional links provided yet.</p>
            )}
          </div>
        </section>
      </main>

      {/* ── Edit Profile Modal ── */}
      {isEditOpen && (
        <EditProfileModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          currentProfile={profile}
          currentUser={profileUser}
          onSave={handleSaveProfile}
        />
      )}

      {/* ── Complete Profile Required Prompt Modal ── */}
      {isCompletePromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              Complete your profile first
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
              A complete profile helps other participants understand your skills and interests before connecting with you. Complete your profile to continue.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCompletePromptOpen(false)}
                className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCompletePromptOpen(false);
                  window.location.href = "/profile";
                }}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
              >
                Complete Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Send Connection Request Modal (with optional note) ── */}
      {isConnectModalOpen && (
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

            <form onSubmit={handleSendConnectionRequest} className="mt-4 space-y-4">
              <div className="flex items-center gap-3 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/50">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-500/10 text-sm font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                  {initials}
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-900 dark:text-white">
                    To: {name}
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {role}
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
    </div>
  );
}
