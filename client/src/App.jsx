import { Outlet, ScrollRestoration, Navigate } from "react-router-dom";
import Header from "./components/Header/Header";
import GetHackAIWidget from "./components/AI/GetHackAIWidget";
import { useAuth } from "./context/useAuth";

// App — Root Layout Component

function App() {
  const { user, loading } = useAuth();

  // If auth is loading AND user state is unknown, render minimal auth initialization screen
  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-neutral-950">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
          <svg className="h-4 w-4 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10" />
          </svg>
          <span>Loading session...</span>
        </div>
      </div>
    );
  }

  // Role-based root routing: If authenticated user is an Organizer, redirect to Organizer portal
  const isOrganizer = user?.role && String(user.role).toLowerCase().trim() === "organizer";
  if (isOrganizer) {
    return <Navigate to="/organizer" replace />;
  }

  return (
    <>
      <ScrollRestoration />
      <Header />
      <Outlet />
      <GetHackAIWidget />
    </>
  );
}

export default App;