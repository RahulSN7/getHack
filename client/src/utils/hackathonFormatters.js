
// client/src/utils/hackathonFormatters.js
// Defensive formatter helpers to ensure structured MongoDB objects and HTML-containing
// strings are cleanly converted to human-readable strings for React rendering.


/**
 * Strip HTML tags and unescape common HTML entities without using dangerouslySetInnerHTML
 * @param {string} str
 * @returns {string} Clean plain text string
 */
export function stripHtmlTags(str) {
  if (!str || typeof str !== "string") return "";
  let clean = str.replace(/<[^>]*>/g, "");
  clean = clean
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return clean.replace(/\s+/g, " ").trim();
}

/**
 * Format team size cleanly handling objects, numbers, strings, or missing values
 * @param {Object|number|string} teamSize
 * @param {number} minTeamSize
 * @param {number} maxTeamSize
 * @returns {string} Human-readable team size label
 */
export function formatTeamSize(teamSize, minTeamSize, maxTeamSize) {
  if (teamSize && typeof teamSize === "object" && !Array.isArray(teamSize) && teamSize.display) {
    return stripHtmlTags(teamSize.display);
  }

  let min = minTeamSize;
  let max = maxTeamSize;

  if (typeof teamSize === "string" && teamSize.trim()) {
    const clean = stripHtmlTags(teamSize);
    if (clean && clean !== "Not specified") return clean;
  }

  if (typeof teamSize === "number") {
    return `${teamSize} ${teamSize === 1 ? "member" : "members"}`;
  }

  if (teamSize && typeof teamSize === "object" && !Array.isArray(teamSize)) {
    if (teamSize.min !== undefined && teamSize.min !== null) min = teamSize.min;
    if (teamSize.max !== undefined && teamSize.max !== null) max = teamSize.max;
  }

  if (min != null && max != null) {
    if (Number(min) === Number(max)) {
      const val = Number(min);
      return `${val} ${val === 1 ? "member" : "members"}`;
    }
    return `${min}–${max} members`;
  }

  if (min != null) {
    return `${min}+ members`;
  }

  if (max != null) {
    return `Up to ${max} members`;
  }

  return "Check official registration page";
}

/**
 * Format prize info handling objects, numbers, HTML-containing strings, or missing values
 * @param {Object|number|string} prizePool
 * @param {string|number} prizes
 * @param {string} fallback
 * @returns {string} Clean human-readable prize label
 */
export function formatPrize(prizePool, prizes, fallback = "See official registration page") {
  // 1. Check prizes parameter
  if (typeof prizes === "number") {
    return prizes === 0 ? "Free" : `$${prizes.toLocaleString()}`;
  }
  if (typeof prizes === "string") {
    const cleanPrizes = stripHtmlTags(prizes);
    if (cleanPrizes && cleanPrizes !== "Not specified") return cleanPrizes;
  }

  // 2. Check prizePool parameter if string or number
  if (typeof prizePool === "number") {
    return prizePool === 0 ? "Free" : `$${prizePool.toLocaleString()}`;
  }
  if (typeof prizePool === "string") {
    const cleanPool = stripHtmlTags(prizePool);
    if (cleanPool && cleanPool !== "Not specified") return cleanPool;
  }

  // 3. Check prizePool parameter if structured object { amount, currency, description }
  if (prizePool && typeof prizePool === "object" && !Array.isArray(prizePool)) {
    if (typeof prizePool.description === "string") {
      const cleanDesc = stripHtmlTags(prizePool.description);
      if (cleanDesc && cleanDesc !== "Not specified") return cleanDesc;
    }
    if (prizePool.amount != null && !isNaN(Number(prizePool.amount))) {
      const amount = Number(prizePool.amount);
      if (amount === 0) return "Free";
      const currSymbol =
        prizePool.currency === "INR"
          ? "₹"
          : prizePool.currency === "EUR"
            ? "€"
            : prizePool.currency === "GBP"
              ? "£"
              : "$";
      return `${currSymbol}${amount.toLocaleString()}`;
    }
  }

  // 4. Check fallback parameter
  if (typeof fallback === "string") {
    const cleanFallback = stripHtmlTags(fallback);
    if (cleanFallback && cleanFallback !== "Not specified") return cleanFallback;
  }

  return "See official registration page";
}

/**
 * Format organizer name handling objects, strings, or missing values
 * @param {string} organizerName
 * @param {Object|string} organizer
 * @returns {string}
 */
export function formatOrganizer(organizerName, organizer) {
  if (typeof organizerName === "string" && organizerName.trim()) {
    return stripHtmlTags(organizerName);
  }
  if (typeof organizer === "string" && organizer.trim()) {
    return stripHtmlTags(organizer);
  }
  if (organizer && typeof organizer === "object" && !Array.isArray(organizer)) {
    if (typeof organizer.name === "string" && organizer.name.trim()) {
      return stripHtmlTags(organizer.name);
    }
  }
  return "Organizer";
}

/**
 * Format location handling objects, strings, or missing values
 * @param {Object|string} location
 * @param {Object} event
 * @returns {string|null}
 */
export function formatLocation(location, event) {
  if (typeof location === "string" && location.trim()) {
    return stripHtmlTags(location);
  }
  if (location && typeof location === "object" && !Array.isArray(location)) {
    const parts = [];
    if (location.city) parts.push(stripHtmlTags(location.city));
    if (location.country) parts.push(stripHtmlTags(location.country));
    if (parts.length > 0) return parts.join(", ");
    if (location.venue) return stripHtmlTags(location.venue);
    if (location.address) return stripHtmlTags(location.address);
  }
  if (event && typeof event === "object" && !Array.isArray(event)) {
    if (event.venue) return stripHtmlTags(event.venue);
    if (event.address) return stripHtmlTags(event.address);
  }
  return null;
}

/**
 * Format fee handling objects, numbers, strings, or missing values
 * @param {string|number} fee
 * @param {Object} registrationFee
 * @returns {string}
 */
export function formatFee(fee, registrationFee) {
  if (typeof fee === "string" && fee.trim()) {
    return stripHtmlTags(fee);
  }
  if (typeof fee === "number") {
    return fee === 0 ? "Free" : `$${fee}`;
  }
  if (registrationFee && typeof registrationFee === "object" && !Array.isArray(registrationFee)) {
    if (registrationFee.amount === 0 || registrationFee.amount == null) {
      return "Free";
    }
    const curr = registrationFee.currency === "INR" ? "₹" : "$";
    return `${curr}${registrationFee.amount}`;
  }
  return "Free";
}

export function formatMode(mode, format, event) {
  return "";
}

/**
 * Calculate registration status: UPCOMING, OPEN, or CLOSED
 * 1. Registration has not started yet (registrationOpens > now) -> UPCOMING
 * 2. Registration is active (registrationOpens <= now && registrationDeadline >= now) -> OPEN
 * 3. Registration deadline has passed (registrationDeadline < now) -> CLOSED
 * @param {Object} hackathon
 * @returns {"UPCOMING" | "OPEN" | "CLOSED"}
 */
export function getHackathonRegistrationStatus(hackathon) {
  if (!hackathon || typeof hackathon !== "object") return "OPEN";

  const now = new Date();

  const regOpensRaw =
    hackathon.registrationOpens ||
    hackathon.registration?.startDate ||
    hackathon.registrationStart;

  const regDeadlineRaw =
    hackathon.registrationDeadline ||
    hackathon.registration?.deadline ||
    hackathon.deadline;

  if (regOpensRaw) {
    const regOpensDate = new Date(regOpensRaw);
    if (!isNaN(regOpensDate.getTime()) && regOpensDate > now) {
      return "UPCOMING";
    }
  }

  if (regDeadlineRaw) {
    const regDeadlineDate = new Date(regDeadlineRaw);
    if (!isNaN(regDeadlineDate.getTime())) {
      if (regDeadlineDate >= now) {
        return "OPEN";
      } else {
        return "CLOSED";
      }
    }
  }

  return "OPEN";
}

/**
 * Format date string to clean human-readable format (e.g. 20 Sep 2026)
 * @param {string|Date|number} dateStr
 * @returns {string|null}
 */
export function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return null;
  }
}

/**
 * Extract hackathon-specific photo or logo URL.
 * Strictly independent from organizer profile photo.
 * @param {Object} hackathon
 * @returns {string|null}
 */
export function getHackathonImage(hackathon) {
  if (!hackathon || typeof hackathon !== "object") return null;

  if (hackathon.image && typeof hackathon.image === "string" && hackathon.image.trim()) {
    return hackathon.image.trim();
  }
  if (hackathon.photo && typeof hackathon.photo === "string" && hackathon.photo.trim()) {
    return hackathon.photo.trim();
  }
  if (hackathon.logo && typeof hackathon.logo === "string" && hackathon.logo.trim()) {
    return hackathon.logo.trim();
  }
  if (hackathon.hackathonPhoto && typeof hackathon.hackathonPhoto === "string" && hackathon.hackathonPhoto.trim()) {
    return hackathon.hackathonPhoto.trim();
  }
  if (hackathon.hackathonImage && typeof hackathon.hackathonImage === "string" && hackathon.hackathonImage.trim()) {
    return hackathon.hackathonImage.trim();
  }
  if (hackathon.thumbnail && typeof hackathon.thumbnail === "string" && hackathon.thumbnail.trim()) {
    return hackathon.thumbnail.trim();
  }

  return null;
}

/**
 * Extract organizer profile photo or logo URL consistently
 * @param {Object} hackathon
 * @returns {string|null}
 */
export function getOrganizerPhoto(hackathon, user = null) {
  if (!hackathon || typeof hackathon !== "object") return null;

  if (typeof hackathon.organizer === "object" && hackathon.organizer !== null) {
    const ref = hackathon.organizer.ref;
    if (ref && typeof ref === "object") {
      const p = ref.profile || {};
      if (p.avatar && typeof p.avatar === "string" && p.avatar.trim()) return p.avatar.trim();
      if (p.organizationLogo && typeof p.organizationLogo === "string" && p.organizationLogo.trim()) return p.organizationLogo.trim();
      if (ref.avatar && typeof ref.avatar === "string" && ref.avatar.trim()) return ref.avatar.trim();
    }

    const refId = typeof ref === "string" ? ref : ref?._id || ref?.id;
    const currentUserId = user?._id || user?.id;
    if (refId && currentUserId && refId.toString() === currentUserId.toString()) {
      const uAvatar = user.profile?.avatar || user.profile?.organizationLogo || user.avatar;
      if (uAvatar && typeof uAvatar === "string" && uAvatar.trim()) return uAvatar.trim();
    }

    if (hackathon.organizer.logo && typeof hackathon.organizer.logo === "string" && hackathon.organizer.logo.trim()) return hackathon.organizer.logo.trim();
    if (hackathon.organizer.avatar && typeof hackathon.organizer.avatar === "string" && hackathon.organizer.avatar.trim()) return hackathon.organizer.avatar.trim();
  }

  if (hackathon.organizerPhoto && typeof hackathon.organizerPhoto === "string" && hackathon.organizerPhoto.trim()) return hackathon.organizerPhoto.trim();
  if (hackathon.avatar && typeof hackathon.avatar === "string" && hackathon.avatar.trim()) return hackathon.avatar.trim();

  return null;
}

