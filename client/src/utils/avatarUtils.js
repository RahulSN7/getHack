// client/src/utils/avatarUtils.js
// Centralized avatar URL normalization & fallback initials generator

/**
 * Resolves a profile avatar URL for consistent rendering across getHack.
 * Handles relative paths (/uploads/...), Google URLs, stripping localhost/127.0.0.1,
 * and ensuring leading slashes for uploads paths.
 */
export function resolveAvatarUrl(avatar, updatedAt) {
  if (!avatar || typeof avatar !== "string") return "";
  let clean = avatar.trim();
  if (!clean || clean === "undefined" || clean === "null") return "";

  // Blob URLs are temporary local preview URLs — return as is
  if (clean.startsWith("blob:")) {
    return clean;
  }

  // Strip localhost / 127.0.0.1 origin if present (e.g. http://localhost:5000/uploads/foo.png -> /uploads/foo.png)
  clean = clean.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, "");

  // If URL is an absolute HTTPS / HTTP URL (e.g. Cloudinary, Google, external), return as is
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    return clean;
  }

  // If path starts with uploads/ (missing leading slash), prepend /
  if (clean.startsWith("uploads/")) {
    clean = `/${clean}`;
  }

  // For legacy local upload paths, append cache-busting timestamp if provided
  if (updatedAt && !clean.includes("?")) {
    try {
      const ts = typeof updatedAt === "number" ? updatedAt : new Date(updatedAt).getTime();
      if (!isNaN(ts) && ts > 0) {
        clean = `${clean}?v=${ts}`;
      }
    } catch {
      // Ignore timestamp parsing errors
    }
  }

  return clean;
}

/**
 * Extracts the single canonical profile photo URL from any user object
 * strictly following canonical precedence:
 * 1. user.profile.avatar when valid
 * 2. user.avatar only when profile.avatar is genuinely unavailable
 * 3. empty string when neither exists
 */
export function getCanonicalAvatar(userObj) {
  if (!userObj) return "";
  const profAvatar = typeof userObj.profile?.avatar === "string" ? userObj.profile.avatar.trim() : "";
  if (profAvatar && profAvatar !== "undefined" && profAvatar !== "null") {
    return profAvatar;
  }
  const rootAvatar = typeof userObj.avatar === "string" ? userObj.avatar.trim() : "";
  if (rootAvatar && rootAvatar !== "undefined" && rootAvatar !== "null") {
    return rootAvatar;
  }
  const nestedUserProf = typeof userObj.user?.profile?.avatar === "string" ? userObj.user.profile.avatar.trim() : "";
  if (nestedUserProf && nestedUserProf !== "undefined" && nestedUserProf !== "null") {
    return nestedUserProf;
  }
  const nestedUserRoot = typeof userObj.user?.avatar === "string" ? userObj.user.avatar.trim() : "";
  if (nestedUserRoot && nestedUserRoot !== "undefined" && nestedUserRoot !== "null") {
    return nestedUserRoot;
  }
  return "";
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
