import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../../context/useAuth";
import { userService } from "../../../services/userService";
import { TEAMMATES } from "../../../data/teammates";
import EditProfileModal from "./EditProfileModal";
import { isProfileComplete } from "../../../utils/profileValidation";
import BackButton from "../../common/BackButton";

function AvailabilityBadge({ availability, isComplete }) {
  if (!isComplete) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
        <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 dark:bg-neutral-600" />
        Not Set
      </span>
    );
  }

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

function UserAvatar({ avatar, name, sizeClass = "h-24 w-24 text-2xl" }) {
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
        className={`${sizeClass} shrink-0 rounded-2xl object-cover border border-neutral-200 shadow-2xs dark:border-neutral-800`}
      />
    );
  }

  return (
    <div
      className={`grid ${sizeClass} shrink-0 place-items-center rounded-2xl bg-indigo-500/10 font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border border-neutral-200 dark:border-neutral-800`}
    >
      {initials}
    </div>
  );
}

function formatDateOfBirth(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function UserProfile() {
  const { id } = useParams();
  const { user: currentUser, isAuthenticated, updateUser } = useAuth();

  const [profileUser, setProfileUser] = useState(null);
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

  // Remove Connection Modal state
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [removingConnection, setRemovingConnection] = useState(false);
  const [removeError, setRemoveError] = useState(null);

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
              const fallbackUser = {
                id: teammate.id,
                name: teammate.name,
                email: teammate.email || "",
                role: teammate.role,
                profile: {
                  avatar: teammate.avatar || "",
                  role: teammate.role,
                  bio: teammate.bio || "",
                  skills: teammate.skills || [],
                  availability: teammate.availability || "",
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
                  gender: "Prefer not to say",
                  dateOfBirth: "",
                  handle: teammate.username ? `@${teammate.username}` : `GH-${teammate.id.toUpperCase()}`,
                },
              };
              setProfileUser(fallbackUser);
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
      if (typeof updateUser === "function") {
        updateUser(res.user);
      }
    }
  };

  // Connect button click handler
  const handleConnectClick = async () => {
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

    setIsConnectModalOpen(true);
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
      if (err.code === "PROFILE_INCOMPLETE" || err.message?.toLowerCase().includes("complete your profile")) {
        setIsConnectModalOpen(false);
        setIsCompletePromptOpen(true);
        return;
      }
      setRequestError(err.message || "Failed to send request.");
    } finally {
      setSendingRequest(false);
    }
  };

  // Handle removing accepted connection
  const handleRemoveConnection = async () => {
    setRemoveError(null);
    try {
      setRemovingConnection(true);
      const targetUserId = profileUser.id || profileUser._id;
      await userService.removeConnection(targetUserId);
      setConnectionState({ status: "none" });
      setIsRemoveModalOpen(false);
    } catch (err) {
      console.error("Failed to remove connection:", err);
      setRemoveError(err.message || "Unable to remove connection. Please try again.");
    } finally {
      setRemovingConnection(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-neutral-900 transition-colors dark:bg-neutral-950 dark:text-neutral-100">
        <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-40 rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-20 rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
            <div className="grid gap-6 md:grid-cols-3">
              <div className="h-64 rounded-2xl bg-neutral-200 dark:bg-neutral-800 md:col-span-2" />
              <div className="h-64 rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
            </div>
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
  const email = profileUser.email || profile.email || currentUser?.email || "";
  const avatar = profile.avatar || profileUser.avatar || "";
  const role = profile.role || "Participant";
  const bio = profile.bio || "";
  const availability = profile.availability || "";
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

  const formattedDOB = formatDateOfBirth(dateOfBirth);

  return (
    <div className="min-h-screen bg-slate-50 text-neutral-900 transition-colors dark:bg-neutral-950 dark:text-neutral-100">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* ── Top-Left Back Button ── */}
        <div>
          <BackButton fallbackPath="/teammates" />
        </div>

        {/* ── 1. Profile Header Card ── */}
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              {/* Large Avatar */}
              <UserAvatar avatar={avatar} name={name} sizeClass="h-24 w-24 text-2xl" />

              {/* Name & Identity */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                    {name}
                  </h1>
                  <AvailabilityBadge availability={availability} isComplete={isProfileComplete(profileUser)} />
                </div>

                <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                  {role}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                  <span className="font-mono font-medium text-neutral-400 dark:text-neutral-500">
                    getHack ID · {getHackId}
                  </span>

                  {location && (
                    <span className="flex items-center gap-1">
                      <svg className="h-3.5 w-3.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                      {location}
                    </span>
                  )}
                </div>

                {/* Quick Link Pill Badges in Header */}
                {(linkedin || portfolio) && (
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {linkedin && (
                      <a
                        href={linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-semibold text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800/80 dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:bg-neutral-800"
                      >
                        <span>LinkedIn ↗</span>
                      </a>
                    )}
                    {portfolio && (
                      <a
                        href={portfolio}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-semibold text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800/80 dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:bg-neutral-800"
                      >
                        <span>Portfolio ↗</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex shrink-0 items-center gap-3">
              {isOwner ? (
                <button
                  type="button"
                  onClick={() => setIsEditOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  <span>Edit Profile</span>
                </button>
              ) : connectionState.status === "accepted" ? (
                <button
                  type="button"
                  onClick={() => {
                    setRemoveError(null);
                    setIsRemoveModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/20 hover:border-red-500/40 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-400 dark:hover:bg-red-500/25"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="18" y1="11" x2="23" y2="11" />
                  </svg>
                  <span>Remove Connection</span>
                </button>
              ) : connectionState.status === "pending" ? (
                <button
                  type="button"
                  disabled
                  className="cursor-not-allowed inline-flex items-center gap-1.5 rounded-lg bg-neutral-100 px-4 py-2.5 text-xs font-semibold text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500"
                >
                  <span>Request Sent</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectClick}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
                  <span>Connect</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ── 2. Main 2-Column Grid Layout ── */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* LEFT / MAIN COLUMN (2 Cols) */}
          <div className="space-y-6 md:col-span-2">
            {/* ABOUT */}
            <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                About
              </h2>
              {bio ? (
                <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 whitespace-pre-line">
                  {bio}
                </p>
              ) : (
                <p className="text-xs text-neutral-400 italic">No bio added yet.</p>
              )}
            </section>

            {/* SKILLS */}
            <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Skills
              </h2>
              {skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-md bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-400 italic">No skills added yet.</p>
              )}
            </section>

            {/* EXPERIENCE (Exclusively displays level without "Level:" prefix) */}
            <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Experience
              </h2>
              <div>
                <p className="text-sm font-bold text-neutral-900 dark:text-white">
                  {experienceLevel}
                </p>
                {experienceDetails ? (
                  <p className="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                    {experienceDetails}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-neutral-400 italic">No additional experience highlights provided.</p>
                )}
              </div>
            </section>

            {/* EDUCATION */}
            <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Education
              </h2>
              {college || degree ? (
                <div className="space-y-1">
                  <p className="text-sm font-bold text-neutral-900 dark:text-white">
                    {college || "University / College"}
                  </p>
                  <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                    {degree} {education.fieldOfStudy ? `· ${education.fieldOfStudy}` : ""}
                  </p>
                  {education.graduationYear && (
                    <p className="text-[11px] font-mono text-neutral-400">
                      Graduation Year {education.graduationYear}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-neutral-400 italic">No education added yet.</p>
              )}
            </section>
          </div>

          {/* RIGHT / SIDEBAR COLUMN (1 Col) */}
          <div className="space-y-6">
            {/* PERSONAL INFORMATION */}
            <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Personal Information
              </h2>

              <div className="space-y-3 text-xs">
                {email && (
                  <div>
                    <span className="block font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider text-[10px]">
                      Email
                    </span>
                    <span className="mt-0.5 block font-medium text-neutral-800 dark:text-neutral-200">
                      {email}
                    </span>
                  </div>
                )}
                {isOwner && gender && (
                  <div>
                    <span className="block font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider text-[10px]">
                      Gender
                    </span>
                    <span className="mt-0.5 block font-medium text-neutral-800 dark:text-neutral-200">
                      {gender}
                    </span>
                  </div>
                )}

                {isOwner && formattedDOB && (
                  <div>
                    <span className="block font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider text-[10px]">
                      Date of Birth
                    </span>
                    <span className="mt-0.5 block font-medium text-neutral-800 dark:text-neutral-200">
                      {formattedDOB}
                    </span>
                  </div>
                )}

                <div>
                  <span className="block font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider text-[10px]">
                    Location
                  </span>
                  <span className="mt-0.5 block font-medium text-neutral-800 dark:text-neutral-200">
                    {location || "Location not added"}
                  </span>
                </div>

                <div>
                  <span className="block font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider text-[10px]">
                    Availability
                  </span>
                  <div className="mt-1">
                    <AvailabilityBadge availability={availability} />
                  </div>
                </div>
              </div>
            </section>

            {/* INTERESTS */}
            <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
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
                <p className="text-xs text-neutral-400 italic">No interests added yet.</p>
              )}
            </section>

            {/* PROFESSIONAL LINKS */}
            <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Professional Links
              </h2>

              {github || linkedin || portfolio ? (
                <div className="space-y-2 text-xs">
                  {github && (
                    <a
                      href={github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50 p-2.5 font-medium text-neutral-700 transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-200 dark:hover:border-neutral-700"
                    >
                      <span className="font-semibold">GitHub</span>
                      <span className="text-[11px] text-neutral-400">↗</span>
                    </a>
                  )}
                  {linkedin && (
                    <a
                      href={linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50 p-2.5 font-medium text-neutral-700 transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-200 dark:hover:border-neutral-700"
                    >
                      <span className="font-semibold">LinkedIn</span>
                      <span className="text-[11px] text-neutral-400">↗</span>
                    </a>
                  )}
                  {portfolio && (
                    <a
                      href={portfolio}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50 p-2.5 font-medium text-neutral-700 transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-200 dark:hover:border-neutral-700"
                    >
                      <span className="font-semibold">Portfolio</span>
                      <span className="text-[11px] text-neutral-400">↗</span>
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-xs text-neutral-400 italic">No professional links added yet.</p>
              )}
            </section>
          </div>
        </div>
      </main>

      {/* Edit Profile Modal */}
      {isOwner && (
        <EditProfileModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          currentProfile={profileUser.profile}
          currentUser={profileUser}
          onSave={handleSaveProfile}
        />
      )}



      {/* Connection Request Modal */}
      {isConnectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Send Connection Request
            </h3>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Connect with <span className="font-semibold text-neutral-900 dark:text-white">{name}</span> ({role}).
            </p>

            {requestError && (
              <div className="mt-3 rounded-lg bg-red-500/10 p-3 text-xs font-medium text-red-600 dark:bg-red-500/15 dark:text-red-400">
                {requestError}
              </div>
            )}

            <form onSubmit={handleSendConnectionRequest} className="mt-4 space-y-4">
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
                  rows={3}
                  maxLength={300}
                  value={connectNote}
                  onChange={(e) => setConnectNote(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  placeholder="Hey! I saw your profile and would love to connect..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsConnectModalOpen(false);
                    setRequestError(null);
                  }}
                  className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingRequest || connectNote.length > 300}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
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
                  if (isOwner) {
                    setIsEditOpen(true);
                  } else {
                    window.location.href = "/profile";
                  }
                }}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
              >
                Complete Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Connection Confirmation Modal */}
      {isRemoveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Remove Connection?
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
              Are you sure you want to remove your connection with <span className="font-semibold text-neutral-900 dark:text-white">{name}</span>? You can reconnect with this person later.
            </p>

            {removeError && (
              <div className="mt-3 rounded-lg bg-red-500/10 p-3 text-xs font-medium text-red-600 dark:bg-red-500/15 dark:text-red-400">
                {removeError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={removingConnection}
                onClick={() => {
                  setIsRemoveModalOpen(false);
                  setRemoveError(null);
                }}
                className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={removingConnection}
                onClick={handleRemoveConnection}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50 dark:bg-red-600 dark:hover:bg-red-500"
              >
                {removingConnection ? "Removing..." : "Remove Connection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
