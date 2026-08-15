/* eslint-disable react-refresh/only-export-components */
// ---------------------------------------------------------------------------
// SavedContext — manages bookmarking / saving hackathons with localStorage persistence
// ---------------------------------------------------------------------------

import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "getHack_saved_hackathons";

const SavedContext = createContext({
  savedIds: [],
  toggleSave: () => {},
  isSaved: () => false,
  savedCount: 0,
});

export function SavedProvider({ children }) {
  const [savedIds, setSavedIds] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedIds));
    } catch (e) {
      console.error("Failed to save hackathons to localStorage", e);
    }
  }, [savedIds]);

  const toggleSave = (id) => {
    if (!id) return;
    setSavedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const isSaved = (id) => savedIds.includes(id);

  return (
    <SavedContext.Provider
      value={{
        savedIds,
        toggleSave,
        isSaved,
        savedCount: savedIds.length,
      }}
    >
      {children}
    </SavedContext.Provider>
  );
}

export function useSaved() {
  const context = useContext(SavedContext);
  if (!context) {
    throw new Error("useSaved must be used within a SavedProvider");
  }
  return context;
}
