// ---------------------------------------------------------------------------
// OrganizerProfilePage.jsx — Complete Production Organizer Profile Experience
// ---------------------------------------------------------------------------

import { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { userService } from "../../services/userService";
import { ORGANIZER_PROFILE } from "../../data/organizerData";
import BackButton from "../../components/common/BackButton";

// Helper for initials fallback
function getInitials(name) {
  if (!name) return "OG";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function OrganizerProfilePage() {
  const { id } = useParams();
  const routerLocation = useLocation();
  const { user: currentUser, updateUser } = useAuth();

  const isOrganizerPortal = routerLocation.pathname.startsWith("/organizer");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    joinedDate: "Mar 2026",
  });
  const [isOwner, setIsOwner] = useState(false);

  // Modals & Active Tab State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Profile Edit Form State
  const [editForm, setEditForm] = useState({
    name: "",
    avatar: "",
    handle: "",
    location: "",
    bio: "",
    organizationName: "",
    organizationType: "Student Club",
    organizationDescription: "",
    website: "",
    github: "",
    linkedin: "",
    twitter: "",
    instagram: "",
    discord: "",
    contactNumber: "",
  });

  // Load Profile Data
  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        setLoading(true);
        setError("");

        const targetId = id || (currentUser?.role === "organizer" ? "me" : null);

        if (!targetId && !id) {
          // If viewing /organizer/profile as unauthenticated, show error
          if (isMounted) {
            setError("Organizer profile not found.");
            setLoading(false);
          }
          return;
        }

        const res = await userService.getOrganizerProfile(targetId || "me");

        if (isMounted && res?.profile) {
          setProfile(res.profile);
          setStats(res.stats || {
            joinedDate: "Mar 2026",
          });
          setIsOwner(Boolean(res.isOwner || (currentUser && currentUser.id === res.profile.id)));

          setEditForm({
            name: res.profile.name || "",
            avatar: res.profile.avatar || "",
            handle: res.profile.handle || `@${(res.profile.name || "").toLowerCase().replace(/[^a-z0-9]/g, "")}`,
            location: res.profile.location || "",
            bio: res.profile.bio || "",
            organizationName: res.profile.organizationName || "",
            organizationType: res.profile.organizationType || "Student Club",
            organizationDescription: res.profile.organizationDescription || "",
            website: res.profile.website || "",
            github: res.profile.github || "",
            linkedin: res.profile.linkedin || "",
            twitter: res.profile.twitter || "",
            instagram: res.profile.instagram || "",
            discord: res.profile.discord || "",
            contactNumber: res.profile.contactNumber || "",
          });
          return;
        }
      } catch {
        // Fallback for static mock mode or offline mode
        if (isMounted) {
          const fallbackProfile = {
            id: currentUser?.id || "org_demo",
            name: ORGANIZER_PROFILE.name || currentUser?.name || "Tech Innovators Club",
            handle: `@${(ORGANIZER_PROFILE.name || currentUser?.name || "techinnovators").toLowerCase().replace(/[^a-z0-9]/g, "")}`,
            role: "organizer",
            avatar: "",
            bio: ORGANIZER_PROFILE.description || "Organizing developer-focused hackathons and community events.",
            location: ORGANIZER_PROFILE.location || "Mumbai, India",
            organizationName: ORGANIZER_PROFILE.organization || "Tech Innovators Club",
            organizationType: "Student Club",
            organizationDescription: ORGANIZER_PROFILE.description || "We organize developer-focused hackathons and community events for students and developers.",
            website: ORGANIZER_PROFILE.website || "https://techinnovators.dev",
            github: "https://github.com/techinnovators",
            linkedin: "https://linkedin.com/company/techinnovators",
            twitter: "https://twitter.com/techinnovators",
            instagram: "",
            discord: "https://discord.gg/techinnovators",
            contactNumber: "+91 9876543210",
            isVerified: true,
            joinedDate: "Mar 2026",
          };

          setProfile(fallbackProfile);
          setStats({
            joinedDate: "Mar 2026",
          });
          setIsOwner(!id || id === currentUser?.id || currentUser?.role === "organizer");

          setEditForm({
            name: fallbackProfile.name,
            avatar: fallbackProfile.avatar,
            handle: fallbackProfile.handle,
            location: fallbackProfile.location,
            bio: fallbackProfile.bio,
            organizationName: fallbackProfile.organizationName,
            organizationType: fallbackProfile.organizationType,
            organizationDescription: fallbackProfile.organizationDescription,
            website: fallbackProfile.website,
            github: fallbackProfile.github,
            linkedin: fallbackProfile.linkedin,
            twitter: fallbackProfile.twitter,
            instagram: fallbackProfile.instagram,
            discord: fallbackProfile.discord,
            contactNumber: fallbackProfile.contactNumber,
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProfile();
  }, [id, currentUser]);

  // Handle Edit Profile input changes
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  // Handle Save Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);

      const res = await userService.updateOrganizerProfile(editForm);

      if (res?.user) {
        updateUser(res.user);
      }

      setProfile((prev) => ({
        ...prev,
        name: editForm.name.trim() || prev.name,
        avatar: editForm.avatar.trim(),
        handle: editForm.handle.trim() || prev.handle,
        location: editForm.location.trim(),
        bio: editForm.bio.trim(),
        organizationName: editForm.organizationName.trim(),
        organizationType: editForm.organizationType,
        organizationDescription: editForm.organizationDescription.trim(),
        website: editForm.website.trim(),
        github: editForm.github.trim(),
        linkedin: editForm.linkedin.trim(),
        twitter: editForm.twitter.trim(),
        instagram: editForm.instagram.trim(),
        discord: editForm.discord.trim(),
        contactNumber: editForm.contactNumber.trim(),
      }));

      setIsEditModalOpen(false);
      setToastMessage("Profile details updated successfully!");
      setTimeout(() => setToastMessage(""), 3000);
    } catch (err) {
      setToastMessage(err.message || "Failed to update profile. Please try again.");
      setTimeout(() => setToastMessage(""), 4000);
    } finally {
      setSavingProfile(false);
    }
  };

  // Render Social Link Helper
  const hasSocials =
    profile?.website ||
    profile?.github ||
    profile?.linkedin ||
    profile?.twitter ||
    profile?.instagram ||
    profile?.discord;

  // ---------------------------------------------------------------------------
  // Loading Skeleton State
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-8 sm:px-6 lg:px-8 space-y-8 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
          <div className="space-y-2">
            <div className="h-6 w-48 rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-4 w-32 rounded bg-neutral-200 dark:bg-neutral-800" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
          ))}
        </div>
        <div className="h-32 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
      </main>
    );
  }

  // ---------------------------------------------------------------------------
  // Error Fallback State
  // ---------------------------------------------------------------------------
  if (error || !profile) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Organizer profile not found
        </h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          {error || "Unable to load this organizer profile. Please try again."}
        </p>
        <div className="mt-6">
          <Link
            to={isOrganizerPortal ? "/organizer" : "/hackathons"}
            className="inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
          >
            <span>← Back</span>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* ── Top-Left Back Button ── */}
      <div>
        <BackButton fallbackPath={isOrganizerPortal ? "/organizer" : "/hackathons"} />
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-xs font-semibold text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/60 dark:text-indigo-300">
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── 1. Profile Header Section ── */}
      <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            {/* Logo / Avatar */}
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={profile.name}
                className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-1 ring-neutral-200 dark:ring-neutral-800"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
            ) : null}
            <div
              className={`
                grid
                h-16
                w-16
                shrink-0
                place-items-center
                rounded-2xl
                bg-indigo-600/10
                text-xl
                font-bold
                text-indigo-600
                dark:bg-indigo-500/20
                dark:text-indigo-400
                ${profile.avatar ? "hidden" : ""}
              `}
            >
              {getInitials(profile.organizationName || profile.name)}
            </div>

            {/* Identity Info */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl dark:text-white">
                  {profile.organizationName || profile.name}
                </h1>
                <span className="rounded-md bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                  Organizer
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                  {profile.handle}
                </span>
                {profile.location && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {profile.location}
                    </span>
                  </>
                )}
              </div>


            </div>
          </div>

          {/* Header Action Button */}
          <div className="shrink-0 pt-1">
            {isOwner ? (
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-lg
                  border
                  border-neutral-200
                  bg-white
                  px-4
                  py-2
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
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <span>Edit Profile</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsContactModalOpen(true)}
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
                  shadow-xs
                  transition-colors
                  hover:bg-indigo-500
                  dark:bg-indigo-500
                  dark:hover:bg-indigo-400
                "
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <span>Contact Organizer</span>
              </button>
            )}
          </div>
        </div>
      </div>



      {/* ── 3. About & Organization Section ── */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* About Info */}
        <div className="md:col-span-2 space-y-6 rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              About
            </h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed whitespace-pre-line">
              {profile.organizationDescription || profile.bio || "No organizer description has been added yet."}
            </p>
          </div>

          {/* Social Links (Rendered ONLY if at least one link exists) */}
          {hasSocials && (
            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
                Official Links
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Official Website"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    <svg className="h-3.5 w-3.5 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10z" />
                    </svg>
                    <span>Website</span>
                  </a>
                )}

                {profile.github && (
                  <a
                    href={profile.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="GitHub Profile"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                    <span>GitHub</span>
                  </a>
                )}

                {profile.linkedin && (
                  <a
                    href={profile.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn Profile"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    <svg className="h-3.5 w-3.5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.75a1.48 1.48 0 1 0 0 2.96 1.48 1.48 0 0 0 0-2.96z" />
                    </svg>
                    <span>LinkedIn</span>
                  </a>
                )}

                {profile.twitter && (
                  <a
                    href={profile.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Twitter X Profile"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    <span>Twitter / X</span>
                  </a>
                )}

                {profile.discord && (
                  <a
                    href={profile.discord}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Discord Community"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    <svg className="h-3.5 w-3.5 text-indigo-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.793 8.18 1.793 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.077.077 0 0 1-.006.127c-.598.349-1.22.648-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                    </svg>
                    <span>Discord</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Organization Card */}
        <div className="space-y-4 rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">
            Organization
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <span className="block font-medium text-neutral-400 mb-0.5">Email</span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                {profileUser?.email || profile?.email || currentUser?.email || "N/A"}
              </span>
            </div>

            <div>
              <span className="block font-medium text-neutral-400 mb-0.5">Organization</span>
              <span className="font-semibold text-neutral-900 dark:text-white text-sm">
                {profile.organizationName || profile.name}
              </span>
            </div>

            <div>
              <span className="block font-medium text-neutral-400 mb-0.5">Category</span>
              <span className="inline-flex items-center rounded-md bg-indigo-500/10 px-2 py-0.5 font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                {profile.organizationType || "Student Club"}
              </span>
            </div>

            {profile.location && (
              <div>
                <span className="block font-medium text-neutral-400 mb-0.5">Location</span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  {profile.location}
                </span>
              </div>
            )}

            {profile.website && (
              <div>
                <span className="block font-medium text-neutral-400 mb-0.5">Official Website</span>
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400 break-all"
                >
                  {profile.website}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>



      {/* ── 5. Contact Organizer Modal ── */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md space-y-5 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                  Contact {profile.organizationName || profile.name}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Reach out through their official public channels.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsContactModalOpen(false)}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {profile.website && (
                <div className="flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950">
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">Official Website</span>
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    Visit Link ↗
                  </a>
                </div>
              )}

              {profile.discord && (
                <div className="flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950">
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">Discord Community</span>
                  <a
                    href={profile.discord}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    Join Discord ↗
                  </a>
                </div>
              )}

              {profile.contactNumber && (
                <div className="flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950">
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">Contact Number</span>
                  <span className="font-bold text-neutral-900 dark:text-white">{profile.contactNumber}</span>
                </div>
              )}

              {!profile.website && !profile.discord && !profile.contactNumber && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  No public contact links have been configured by this organizer yet.
                </p>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsContactModalOpen(false)}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Edit Profile Modal ── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl my-8 space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-neutral-100 pb-4 dark:border-neutral-800">
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                  Edit Organizer Profile
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Update public details for your organization.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              {/* Registered Email (Read-only) */}
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Email
                </label>
                <div className="flex h-10 w-full items-center rounded-lg border border-neutral-200 bg-neutral-100 px-3.5 text-sm font-medium text-neutral-600 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400">
                  {profileUser?.email || profile?.email || currentUser?.email || "N/A"}
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="edit-name" className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Display Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="edit-name"
                    type="text"
                    name="name"
                    required
                    value={editForm.name}
                    onChange={handleEditChange}
                    className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 outline-none focus:border-indigo-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="edit-handle" className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    getHack Username / Handle
                  </label>
                  <input
                    id="edit-handle"
                    type="text"
                    name="handle"
                    value={editForm.handle}
                    onChange={handleEditChange}
                    placeholder="e.g. @techinnovators"
                    className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 outline-none focus:border-indigo-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
                  />
                </div>
              </div>



              <div>
                <label htmlFor="edit-bio" className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Short Bio
                </label>
                <textarea
                  id="edit-bio"
                  name="bio"
                  rows={2}
                  value={editForm.bio}
                  onChange={handleEditChange}
                  placeholder="Brief 1-2 sentence description of your organization."
                  className="w-full rounded-lg border border-neutral-200 bg-white p-3.5 text-sm text-neutral-900 outline-none focus:border-indigo-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
                />
              </div>

              {/* Organization Info */}
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-4">
                <h4 className="font-bold text-neutral-900 dark:text-white">Organization Details</h4>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="edit-organizationName" className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Organization Name
                    </label>
                    <input
                      id="edit-organizationName"
                      type="text"
                      name="organizationName"
                      value={editForm.organizationName}
                      onChange={handleEditChange}
                      placeholder="e.g. Tech Innovators Club"
                      className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 outline-none focus:border-indigo-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-organizationType" className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Organization Type
                    </label>
                    <select
                      id="edit-organizationType"
                      name="organizationType"
                      value={editForm.organizationType}
                      onChange={handleEditChange}
                      className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 outline-none focus:border-indigo-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
                    >
                      <option value="Company">Company</option>
                      <option value="College / University">College / University</option>
                      <option value="Student Club">Student Club</option>
                      <option value="Developer Community">Developer Community</option>
                      <option value="Non-profit">Non-profit</option>
                      <option value="Individual">Individual</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="edit-location" className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Location
                    </label>
                    <input
                      id="edit-location"
                      type="text"
                      name="location"
                      value={editForm.location}
                      onChange={handleEditChange}
                      placeholder="e.g. Mumbai, India"
                      className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 outline-none focus:border-indigo-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-contactNumber" className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Contact Number
                    </label>
                    <input
                      id="edit-contactNumber"
                      type="text"
                      name="contactNumber"
                      value={editForm.contactNumber}
                      onChange={handleEditChange}
                      placeholder="e.g. +91 9876543210"
                      className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 outline-none focus:border-indigo-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="edit-organizationDescription" className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Organization Description
                  </label>
                  <textarea
                    id="edit-organizationDescription"
                    name="organizationDescription"
                    rows={3}
                    value={editForm.organizationDescription}
                    onChange={handleEditChange}
                    placeholder="Comprehensive description of your organization."
                    className="w-full rounded-lg border border-neutral-200 bg-white p-3.5 text-sm text-neutral-900 outline-none focus:border-indigo-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
                  />
                </div>
              </div>

              {/* Social Links */}
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-4">
                <h4 className="font-bold text-neutral-900 dark:text-white">Social Links & Websites</h4>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="edit-website" className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Official Website
                    </label>
                    <input
                      id="edit-website"
                      type="url"
                      name="website"
                      value={editForm.website}
                      onChange={handleEditChange}
                      placeholder="https://example.com"
                      className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 outline-none focus:border-indigo-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-github" className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      GitHub URL
                    </label>
                    <input
                      id="edit-github"
                      type="url"
                      name="github"
                      value={editForm.github}
                      onChange={handleEditChange}
                      placeholder="https://github.com/my-org"
                      className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 outline-none focus:border-indigo-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-linkedin" className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      LinkedIn URL
                    </label>
                    <input
                      id="edit-linkedin"
                      type="url"
                      name="linkedin"
                      value={editForm.linkedin}
                      onChange={handleEditChange}
                      placeholder="https://linkedin.com/company/my-org"
                      className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 outline-none focus:border-indigo-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-twitter" className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Twitter / X URL
                    </label>
                    <input
                      id="edit-twitter"
                      type="url"
                      name="twitter"
                      value={editForm.twitter}
                      onChange={handleEditChange}
                      placeholder="https://twitter.com/my-org"
                      className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 outline-none focus:border-indigo-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-instagram" className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Instagram URL
                    </label>
                    <input
                      id="edit-instagram"
                      type="url"
                      name="instagram"
                      value={editForm.instagram}
                      onChange={handleEditChange}
                      placeholder="https://instagram.com/my-org"
                      className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 outline-none focus:border-indigo-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-discord" className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Discord Invite URL
                    </label>
                    <input
                      id="edit-discord"
                      type="url"
                      name="discord"
                      value={editForm.discord}
                      onChange={handleEditChange}
                      placeholder="https://discord.gg/invite"
                      className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 outline-none focus:border-indigo-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
                    />
                  </div>
                </div>
              </div>



              {/* Form Actions */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  disabled={savingProfile}
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-lg border border-neutral-200 bg-white px-4 py-2 font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                >
                  {savingProfile ? (
                    <>
                      <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10" />
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default OrganizerProfilePage;
