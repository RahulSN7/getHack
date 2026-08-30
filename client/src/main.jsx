// main.jsx

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, useRouteError, Navigate } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import LandingPage from "./pages/Landing/LandingPage.jsx";
import HackathonsPage from "./pages/Hackathons/HackathonsPage.jsx";
import HackathonDetailsPage from "./pages/Hackathons/HackathonDetailsPage.jsx";
import TeammatesPage from "./pages/Teammates/TeammatesPage.jsx";
import CreateTeamPage from "./pages/Teammates/CreateTeamPage.jsx";
import TeamDetailsPage from "./pages/Teammates/TeamDetailsPage.jsx";
import ProfilePage from "./pages/Profile/ProfilePage.jsx";
import NetworkPage from "./pages/Network/NetworkPage.jsx";
import MessagesPage from "./pages/Messages/MessagesPage.jsx";
import GroupInfoPage from "./pages/Messages/GroupInfoPage.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { SavedProvider } from "./context/SavedContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { NotificationProvider } from "./context/NotificationContext.jsx";
import { ChatProvider } from "./context/ChatContext.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import RoleProtectedRoute from "./components/auth/RoleProtectedRoute.jsx";
import OrganizerLayout from "./components/organizer/OrganizerLayout.jsx";
import OrganizerDashboardPage from "./pages/Organizer/OrganizerDashboardPage.jsx";
import OrganizerHackathonsPage from "./pages/Organizer/OrganizerHackathonsPage.jsx";
import CreateHackathonPage from "./pages/Organizer/CreateHackathonPage.jsx";
import EditHackathonPage from "./pages/Organizer/EditHackathonPage.jsx";
import OrganizerHackathonDetailsPage from "./pages/Organizer/OrganizerHackathonDetailsPage.jsx";
import OrganizerProfilePage from "./pages/Organizer/OrganizerProfilePage.jsx";
import AuthLayout from "./components/auth/AuthLayout.jsx";
import LoginPage from "./pages/Auth/LoginPage.jsx";
import SignupPage from "./pages/Auth/SignupPage.jsx";
import ForgotPasswordPage from "./pages/Auth/ForgotPasswordPage.jsx";

function AppErrorBoundary() {
  const error = useRouteError();
  console.error("Route Error Caught:", error);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl p-8 border border-neutral-200 dark:border-neutral-800 text-center space-y-4 shadow-xl">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500">
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
          Something went wrong
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {error?.statusText || error?.message || "An unexpected application error occurred."}
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            Reload Page
          </button>
          <button
            type="button"
            onClick={() => (window.location.href = "/messages")}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
          >
            Back to Messages
          </button>
        </div>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  /* ── Participant Application Experience (with Participant Header) ── */
  {
    path: "/",
    element: <App />,
    errorElement: <AppErrorBoundary />,
    children: [
      {
        index: true,
        element: <LandingPage />,
      },
      {
        path: "hackathons",
        element: <HackathonsPage />,
      },
      {
        path: "hackathons/:id",
        element: <HackathonDetailsPage />,
      },
      {
        path: "teammates",
        element: <TeammatesPage />,
      },
      {
        path: "create-team",
        element: (
          <ProtectedRoute>
            <CreateTeamPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "team/:id",
        element: <TeamDetailsPage />,
      },
      {
        path: "team/:id/edit",
        element: (
          <ProtectedRoute>
            <CreateTeamPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "profile",
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "profile/:id",
        element: <ProfilePage />,
      },
      {
        path: "organizer/:id/profile",
        element: <OrganizerProfilePage />,
      },
      {
        path: "network",
        element: (
          <ProtectedRoute>
            <NetworkPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "messages",
        element: (
          <ProtectedRoute>
            <MessagesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "messages/:userId",
        element: (
          <ProtectedRoute>
            <MessagesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "group/:groupId",
        element: (
          <ProtectedRoute>
            <GroupInfoPage />
          </ProtectedRoute>
        ),
      },
    ],
  },

  /* ── Dedicated Organizer Portal Experience (with Organizer Header) ── */
  {
    path: "organizer",
    element: (
      <RoleProtectedRoute allowedRole="organizer">
        <OrganizerLayout />
      </RoleProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <OrganizerDashboardPage />,
      },
      {
        path: "create",
        element: <CreateHackathonPage />,
      },
      {
        path: "hackathons",
        element: <OrganizerHackathonsPage />,
      },
      {
        path: "hackathons/:id",
        element: <OrganizerHackathonDetailsPage />,
      },
      {
        path: "hackathons/:id/edit",
        element: <EditHackathonPage />,
      },
      {
        path: "profile",
        element: <OrganizerProfilePage />,
      },
      {
        path: "profile/:id",
        element: <OrganizerProfilePage />,
      },
    ],
  },

  /* ── Dedicated Authentication Routes (Standalone AuthLayout without Header) ── */
  {
    element: <AuthLayout />,
    children: [
      {
        path: "login",
        element: <LoginPage />,
      },
      {
        path: "signup",
        element: <SignupPage />,
      },
      {
        path: "forgot-password",
        element: <Navigate to="/login" replace />,
      },
    ],
  },

  /* Fallback Route */
  {
    path: "*",
    element: <LandingPage />,
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <NotificationProvider>
        <ChatProvider>
          <SavedProvider>
            <ThemeProvider>
              <RouterProvider router={router} />
            </ThemeProvider>
          </SavedProvider>
        </ChatProvider>
      </NotificationProvider>
    </AuthProvider>
  </StrictMode>
);
