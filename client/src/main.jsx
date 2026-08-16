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
import OrganizerLayout from "./components/organizer/OrganizerLayout.jsx";
import OrganizerDashboardPage from "./pages/Organizer/OrganizerDashboardPage.jsx";
import OrganizerHackathonsPage from "./pages/Organizer/OrganizerHackathonsPage.jsx";
import CreateHackathonPage from "./pages/Organizer/CreateHackathonPage.jsx";
import SelectedHackathonPage from "./pages/Organizer/SelectedHackathonPage.jsx";
import OrganizerProfilePage from "./pages/Organizer/OrganizerProfilePage.jsx";

const router = createBrowserRouter([
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
        element: <NetworkPage />,
      },
      {
        path: "organizer",
        element: <OrganizerLayout />,
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
            path: "hackathons/create",
            element: <CreateHackathonPage />,
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
      {
        path: "*",
        element: <LandingPage />,
      },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SavedProvider>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </SavedProvider>
  </StrictMode>
);
