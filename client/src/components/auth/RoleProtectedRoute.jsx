// ---------------------------------------------------------------------------
// RoleProtectedRoute.jsx — Role-Based Route Guard (Organizer Protection)
// Verifies user.role matches required role. Redirects unauthorized users.
// ---------------------------------------------------------------------------

import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

function RoleProtectedRoute({ allowedRole = "organizer", children }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-neutral-950">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
          <svg className="h-4 w-4 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10" />
          </svg>
          <span>Verifying permissions...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Verify server-authenticated user role matches
  if (user?.role !== allowedRole) {
    // Participant trying to access organizer area -> redirect to /hackathons
    return <Navigate to="/hackathons" replace />;
  }

  return children ? children : <Outlet />;
}

export default RoleProtectedRoute;
