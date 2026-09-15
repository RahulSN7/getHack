/* eslint-disable react-refresh/only-export-components */

// SavedContext — manages bookmarking / saving hackathons with localStorage persistence


import { createContext, useContext, useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "getHack_saved_hackathons";

const SavedContext = createContext({
  savedIds: [],
  toggleSave: () => { },
  isSaved: () => false,
  reconcileSaved: () => { },
  savedCount: 0,
});

export function SavedProvider({ children }) {
  const [savedIds, setSavedIds] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed : [];
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

  const toggleSave = useCallback((id) => {
    if (!id) return;
    const strId = String(id);
    setSavedIds((prev) =>
      prev.some((item) => String(item) === strId)
        ? prev.filter((item) => String(item) !== strId)
        : [...prev, id]
    );
  }, []);

  const isSaved = useCallback(
    (id) => {
      if (!id) return false;
      const strId = String(id);
      return savedIds.some((item) => String(item) === strId);
    },
    [savedIds]
  );

  const reconcileSaved = useCallback((validIds) => {
    if (!Array.isArray(validIds)) return;
    const validSet = new Set(validIds.map((id) => String(id)));
    setSavedIds((prev) => {
      const filtered = prev.filter((id) => validSet.has(String(id)));
      if (filtered.length !== prev.length) {
        return filtered;
      }
      return prev;
    });
  }, []);

  return (
    <SavedContext.Provider
      value={{
        savedIds,
        toggleSave,
        isSaved,
        reconcileSaved,
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
