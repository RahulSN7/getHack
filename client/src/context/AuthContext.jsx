// ---------------------------------------------------------------------------
// AuthContext.jsx — Authentication Context Provider Component
// Handles user session, login, signup, and logout with localStorage persistence.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";

const STORAGE_KEY = "gethack_current_user";

// Initial demo user fallback
const DEFAULT_DEMO_USER = {
  id: "m1",
  name: "Rahul Sharma",
  email: "rahul.sharma@example.com",
  username: "rahulsharma",
  getHackId: "GH-7K4P2",
  role: "Fullstack Developer",
  location: "Bengaluru, India",
  avatar: "R",
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_DEMO_USER;
    } catch {
      return DEFAULT_DEMO_USER;
    }
  });

  const isAuthenticated = !!user;

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  // Login handler
  const login = async ({ email, password }) => {
    await new Promise((res) => setTimeout(res, 600));

    if (!email || !password) {
      throw new Error("Please enter both email and password.");
    }

    const formattedName = email.split("@")[0].replace(/[^a-zA-Z]/g, " ");
    const nameCap = formattedName
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    const loggedUser = {
      id: user?.id || "u-" + Date.now(),
      name: nameCap || "Developer",
      email: email.toLowerCase(),
      username: email.split("@")[0],
      getHackId: user?.getHackId || "GH-" + Math.random().toString(36).substring(2, 7).toUpperCase(),
      role: "Builder",
    };

    setUser(loggedUser);
    return loggedUser;
  };

  // Signup handler
  const signup = async ({ name, email, password }) => {
    await new Promise((res) => setTimeout(res, 600));

    if (!name || !email || !password) {
      throw new Error("Please fill in all required fields.");
    }

    const newUser = {
      id: "u-" + Date.now(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      username: email.split("@")[0],
      getHackId: "GH-" + Math.random().toString(36).substring(2, 7).toUpperCase(),
      role: "Developer",
    };

    setUser(newUser);
    return newUser;
  };

  // Logout handler
  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
