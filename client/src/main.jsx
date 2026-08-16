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
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { SavedProvider } from "./context/SavedContext.jsx";

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
