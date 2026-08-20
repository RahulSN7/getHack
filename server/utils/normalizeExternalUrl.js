// ---------------------------------------------------------------------------
// server/utils/normalizeExternalUrl.js
// Utility for validating and normalizing external hackathon platform URLs
// Handles absolute URLs, relative URLs, protocol-relative URLs, and malformed prefixes
// ---------------------------------------------------------------------------

/**
 * Normalize external website URLs safely
 * @param {string} rawUrl
 * @param {string} defaultBase Base domain (e.g. "https://unstop.com")
 * @returns {string|null} Valid normalized absolute URL or null
 */
function normalizeExternalUrl(rawUrl, defaultBase = "https://unstop.com") {
  if (!rawUrl) return null;

  let value = String(rawUrl).trim();
  if (!value) return null;

  // Fix corrupted double prefix if present (e.g. "https://unstop.com/https://...")
  if (/^https?:\/\/[^\/]+\/https?:\/\//i.test(value)) {
    value = value.replace(/^https?:\/\/[^\/]+\//i, "");
  }

  // Handle protocol-relative URL: //unstop.com/hackathons/xyz
  if (value.startsWith("//")) {
    value = `https:${value}`;
  }

  // If value is already an absolute HTTP/HTTPS URL
  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const parsed = new URL(value);
      // Ensure hostname exists and path doesn't contain malformed /https: or /http:
      if (
        parsed.hostname &&
        !parsed.pathname.startsWith("/https:") &&
        !parsed.pathname.startsWith("/http:")
      ) {
        return parsed.toString();
      }
    } catch {
      return null;
    }
  }

  // Handle relative path (with or without leading slash)
  try {
    const base = defaultBase.startsWith("http") ? defaultBase : `https://${defaultBase}`;
    const resolved = new URL(value, base.endsWith("/") ? base : `${base}/`);
    if (
      resolved.hostname &&
      !resolved.pathname.startsWith("/https:") &&
      !resolved.pathname.startsWith("/http:")
    ) {
      return resolved.toString();
    }
  } catch {
    return null;
  }

  return null;
}

module.exports = normalizeExternalUrl;
