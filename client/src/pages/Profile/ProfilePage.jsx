// ---------------------------------------------------------------------------
// ProfilePage.jsx — Dynamic Profile Dispatcher Component for /profile & /profile/:id
// Dynamically resolves profile owner's role and renders either Participant or Organizer UI.
// ---------------------------------------------------------------------------

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { userService } from "../../services/userService";
import UserProfile from "../../components/pages/profile/UserProfile";
import OrganizerProfilePage from "../Organizer/OrganizerProfilePage";

export default function ProfilePage() {
  const { id } = useParams();
  const { user: currentUser, loading: authLoading } = useAuth();

  const [resolvedRole, setResolvedRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const targetId = id || "me";

  useEffect(() => {
    let isMounted = true;

    async function resolveRole() {
      // Wait for initial authentication check to finish before making decisions
      if (authLoading) return;

      const userHandle = currentUser?.profile?.handle
        ? String(currentUser.profile.handle).replace(/^@/, "").trim().toLowerCase()
        : null;
      const cleanTargetId = String(targetId).replace(/^@/, "").trim().toLowerCase();

      // 1. Check if viewing own profile (/profile, /profile/me, or id/handle matching currentUser)
      const isOwnProfile =
        targetId === "me" ||
        (currentUser &&
          (String(currentUser.id) === String(targetId) ||
            String(currentUser._id) === String(targetId) ||
            (userHandle && userHandle === cleanTargetId)));

      if (isOwnProfile && currentUser?.role) {
        if (isMounted) {
          const roleStr = String(currentUser.role).toLowerCase().trim();
          setResolvedRole(roleStr === "organizer" ? "organizer" : "participant");
          setLoading(false);
        }
        return;
      }

      // If viewing /profile (or /profile/me) as unauthenticated user after auth loading completes
      if (targetId === "me" && !currentUser) {
        if (isMounted) {
          setError("Please log in to view your profile.");
          setLoading(false);
        }
        return;
      }

      // 2. Fetch target user's profile to resolve actual profile owner's role
      try {
        if (isMounted) setLoading(true);
        setError(null);

        const res = await userService.getProfileById(targetId);

        const rawRole =
          res?.role ||
          res?.user?.role ||
          res?.profile?.role ||
          (res?.profile ? "organizer" : "participant");

        const roleStr = String(rawRole).toLowerCase().trim();

        if (isMounted) {
          setResolvedRole(roleStr === "organizer" ? "organizer" : "participant");
        }
      } catch (err) {
        // Fallback checks: try organizer profile then participant profile if generic lookup fails
        try {
          const orgRes = await userService.getOrganizerProfile(targetId);
          if (isMounted && (orgRes?.profile || orgRes?.role === "organizer" || orgRes?.user?.role === "organizer")) {
            setResolvedRole("organizer");
            return;
          }
        } catch {
          // ignore
        }

        try {
          const partRes = await userService.getParticipantProfile(targetId);
          if (isMounted && partRes?.user) {
            const roleStr = String(partRes.user.role || partRes.role || "participant").toLowerCase().trim();
            setResolvedRole(roleStr === "organizer" ? "organizer" : "participant");
            return;
          }
        } catch {
          // ignore
        }

        if (isMounted) {
          setError(err.message || "Profile not found.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    resolveRole();

    return () => {
      isMounted = false;
    };
  }, [id, targetId, currentUser, authLoading]);

  // Loading Skeleton State
  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
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

  // Error Fallback State
  if (error || !resolvedRole) {
    return (
      <div className="min-h-screen bg-slate-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <main className="mx-auto max-w-4xl px-5 py-16 text-center sm:px-6 lg:px-8 space-y-4">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Profile not found
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {error || "The profile you're looking for doesn't exist or is unavailable."}
          </p>
          <div className="pt-4">
            <Link
              to="/hackathons"
              className="inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
            >
              <span>← Back to Hackathons</span>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Render profile UI based on profile owner's role
  if (resolvedRole === "organizer") {
    return <OrganizerProfilePage />;
  }

  return <UserProfile />;
}
