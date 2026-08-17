// ---------------------------------------------------------------------------
// AuthContext.jsx — Single Source of Truth for Authentication State
// Restores session from backend GET /api/auth/me on startup.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { authService } from "../services/authService";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore authenticated session from server on initial load
  useEffect(() => {
    let isMounted = true;
    async function initAuth() {
      try {
        const data = await authService.getCurrentUser();
        if (isMounted && data?.user) {
          setUser(data.user);
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    initAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const isAuthenticated = !!user;

  // Login handler
  const login = async ({ email, password }) => {
    const data = await authService.login({ email, password });
    if (data?.user) {
      setUser(data.user);
      return data.user;
    }
    throw new Error("Authentication failed");
  };

  // Signup handler
  const signup = async ({ name, email, password, role }) => {
    const data = await authService.signup({ name, email, password, role });
    if (data?.user) {
      setUser(data.user);
      return data.user;
    }
    throw new Error("Registration failed");
  };

  // Logout handler
  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore errors during logout cleanup
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
