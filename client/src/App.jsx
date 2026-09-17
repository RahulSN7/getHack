import { Outlet, ScrollRestoration, Navigate } from "react-router-dom";
import Header from "./components/Header/Header";
import GetHackAIWidget from "./components/AI/GetHackAIWidget";
import CookieConsentBanner from "./components/common/CookieConsentBanner";
import { useAuth } from "./context/useAuth";

// App — Root Layout Component

function App() {
  const { user, loading } = useAuth();

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
      <CookieConsentBanner />
    </>
  );
}

export default App;