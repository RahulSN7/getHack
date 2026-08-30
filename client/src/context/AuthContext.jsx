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

  // Send OTP handler
  const sendOtp = async ({ email, role }) => {
    return await authService.sendOtp({ email, role });
  };

  // Verify OTP handler & set authenticated user state
  const verifyOtp = async ({ email, otp, name, role }) => {
    const data = await authService.verifyOtp({ email, otp, name, role });
    if (data?.user) {
      setUser(data.user);
      return data.user;
    }
    throw new Error("OTP Verification failed");
  };

  // Legacy login alias using OTP verify
  const login = async ({ email, otp }) => {
    return await verifyOtp({ email, otp });
  };

  // Legacy signup alias using OTP verify
  const signup = async ({ name, email, otp, role }) => {
    return await verifyOtp({ email, otp, name, role });
  };

  // Google Auth handler & set authenticated user state
  const googleAuth = async ({ credential, code, role }) => {
    const data = await authService.googleAuth({ credential, code, role });
    if (data?.user) {
      setUser(data.user);
      return data.user;
    }
    throw new Error("Google authentication failed");
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

  // Update user state locally
  const updateUser = (updatedUser) => {
    if (updatedUser) {
      setUser((prev) => ({ ...prev, ...updatedUser }));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        sendOtp,
        verifyOtp,
        googleAuth,
        login,
        signup,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
