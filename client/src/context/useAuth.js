// ---------------------------------------------------------------------------
// useAuth.js — Custom hook to consume AuthContext
// Separated to satisfy react-refresh/only-export-components rule.
// ---------------------------------------------------------------------------

import { useContext } from "react";
import { AuthContext } from "./AuthContext";

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
