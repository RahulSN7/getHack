// main.jsx

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import LandingPage from "./pages/Landing/LandingPage.jsx";
import HackathonsPage from "./pages/Hackathons/HackathonsPage.jsx";
import HackathonDetailsPage from "./pages/Hackathons/HackathonDetailsPage.jsx";
import TeammatesPage from "./pages/Teammates/TeammatesPage.jsx";
import ProfilePage from "./pages/Profile/ProfilePage.jsx";
import NetworkPage from "./pages/Network/NetworkPage.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { SavedProvider } from "./context/SavedContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import RoleProtectedRoute from "./components/auth/RoleProtectedRoute.jsx";
import OrganizerLayout from "./components/organizer/OrganizerLayout.jsx";
import OrganizerDashboardPage from "./pages/Organizer/OrganizerDashboardPage.jsx";
import OrganizerHackathonsPage from "./pages/Organizer/OrganizerHackathonsPage.jsx";
import OrganizerManagePage from "./pages/Organizer/OrganizerManagePage.jsx";
import CreateHackathonPage from "./pages/Organizer/CreateHackathonPage.jsx";
import SelectedHackathonPage from "./pages/Organizer/SelectedHackathonPage.jsx";
import OrganizerProfilePage from "./pages/Organizer/OrganizerProfilePage.jsx";
import AuthLayout from "./components/auth/AuthLayout.jsx";
import LoginPage from "./pages/Auth/LoginPage.jsx";
import SignupPage from "./pages/Auth/SignupPage.jsx";
import ForgotPasswordPage from "./pages/Auth/ForgotPasswordPage.jsx";

const router = createBrowserRouter([
  /* ── Participant Application Experience (with Participant Header) ── */
  {
    path: "/",
    element: <App />,
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
        path: "profile/:id",
        element: <ProfilePage />,
      },
      {
        path: "network",
        element: (
          <ProtectedRoute>
            <NetworkPage />
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
        path: "hackathons",
        element: <OrganizerHackathonsPage />,
      },
      {
        path: "create",
        element: <CreateHackathonPage />,
      },
      {
        path: "hackathons/create",
        element: <CreateHackathonPage />,
      },
      {
        path: "manage",
        element: <OrganizerManagePage />,
      },
      {
        path: "hackathons/:id",
        element: <SelectedHackathonPage />,
      },
      {
        path: "profile",
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
        element: <ForgotPasswordPage />,
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
      <SavedProvider>
        <ThemeProvider>
          <RouterProvider router={router} />
        </ThemeProvider>
      </SavedProvider>
    </AuthProvider>
  </StrictMode>
);
