// ---------------------------------------------------------------------------
// OrganizerLayout.jsx — Dedicated Layout & Navigation Shell for Organizer Portal
// Standardized container layout matching getHack design language.
// ---------------------------------------------------------------------------

import { Outlet } from "react-router-dom";
import OrganizerHeader from "./OrganizerHeader";

function OrganizerLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-neutral-900 transition-colors dark:bg-neutral-950 dark:text-neutral-100">
      <OrganizerHeader />
      <Outlet />
    </div>
  );
}

export default OrganizerLayout;
