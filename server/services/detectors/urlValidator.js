// ---------------------------------------------------------------------------
// server/services/detectors/urlValidator.js
// URL Validation Module for getHack
// ---------------------------------------------------------------------------

/**
 * Validate URL string syntax and check if URL is a valid registration URL
 * Accepts: http://... or https://...
 * Rejects: undefined, null, "", "Not available", "None", "#", invalid strings
 * @param {string} urlString
 * @param {string} [defaultPlatformDomain]
 * @returns {{ isValid: boolean, normalizedUrl: string }}
 */
function validateRegistrationUrl(urlString, defaultPlatformDomain = "") {
  if (!urlString || typeof urlString !== "string") {
    return { isValid: false, normalizedUrl: "" };
  }

  let clean = urlString.trim();

  // Reject explicit non-URL placeholder strings
  const lower = clean.toLowerCase();
  if (
    !clean ||
    clean === "#" ||
    lower === "not available" ||
    lower === "none" ||
    lower === "null" ||
    lower === "undefined" ||
    lower.includes("javascript:")
  ) {
    return { isValid: false, normalizedUrl: "" };
  }

  // Handle relative URLs if platform domain provided
  if (clean.startsWith("/")) {
    if (defaultPlatformDomain) {
      clean = `${defaultPlatformDomain.replace(/\/$/, "")}${clean}`;
    } else {
      return { isValid: false, normalizedUrl: "" };
    }
  } else if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    if (clean.startsWith("//")) {
      clean = `https:${clean}`;
    } else if (clean.includes(".")) {
      clean = `https://${clean}`;
    } else {
      return { isValid: false, normalizedUrl: "" };
    }
  }

  try {
    const parsed = new URL(clean);

    // Reject non-http/https protocols
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { isValid: false, normalizedUrl: "" };
    }

    // Require hostname with dot or localhost
    if (!parsed.hostname || (!parsed.hostname.includes(".") && parsed.hostname !== "localhost")) {
      return { isValid: false, normalizedUrl: "" };
    }

    // Prefer HTTPS
    if (parsed.protocol === "http:") {
      parsed.protocol = "https:";
    }

    return {
      isValid: true,
      normalizedUrl: parsed.toString(),
    };
  } catch {
    return { isValid: false, normalizedUrl: "" };
  }
}

module.exports = {
  validateRegistrationUrl,
};
