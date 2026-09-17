// client/src/utils/avatarUtils.js
// Centralized avatar URL normalization & fallback initials generator

/**
 * Resolves a profile avatar URL for consistent rendering across getHack.
 * Handles relative paths (/uploads/...), Google URLs, stripping localhost/127.0.0.1,
 * and ensuring leading slashes for uploads paths.
 */
export function resolveAvatarUrl(avatar) {
  if (!avatar || typeof avatar !== "string") return "";
  let clean = avatar.trim();
  if (!clean) return "";

  // Strip localhost / 127.0.0.1 origin if present (e.g. http://localhost:5000/uploads/foo.png -> /uploads/foo.png)
  clean = clean.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, "");

  // If path starts with uploads/ (missing leading slash), prepend /
  if (clean.startsWith("uploads/")) {
    clean = `/${clean}`;
  }

  return clean;
}

/**
 * Derives 1-2 character uppercase initials from a user's full name.
 */
export function getInitials(name, fallback = "GH") {
  if (!name || typeof name !== "string") return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
