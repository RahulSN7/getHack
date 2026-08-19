// ---------------------------------------------------------------------------
// client/src/utils/hackathonFormatters.js
// Defensive formatter helpers to ensure structured MongoDB objects and HTML-containing
// strings are cleanly converted to human-readable strings for React rendering.
// ---------------------------------------------------------------------------

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
  let min = minTeamSize;
  let max = maxTeamSize;

  if (typeof teamSize === "string" && teamSize.trim()) {
    return stripHtmlTags(teamSize);
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

  return "Individual / Team";
}

/**
 * Format prize info handling objects, numbers, HTML-containing strings, or missing values
 * @param {Object|number|string} prizePool
 * @param {string|number} prizes
 * @param {string} fallback
 * @returns {string} Clean human-readable prize label
 */
export function formatPrize(prizePool, prizes, fallback = "Not specified") {
  // 1. Check prizes parameter
  if (typeof prizes === "number") {
    return prizes === 0 ? "Free" : `$${prizes.toLocaleString()}`;
  }
  if (typeof prizes === "string") {
    const cleanPrizes = stripHtmlTags(prizes);
    if (cleanPrizes) return cleanPrizes;
  }

  // 2. Check prizePool parameter if string or number
  if (typeof prizePool === "number") {
    return prizePool === 0 ? "Free" : `$${prizePool.toLocaleString()}`;
  }
  if (typeof prizePool === "string") {
    const cleanPool = stripHtmlTags(prizePool);
    if (cleanPool) return cleanPool;
  }

  // 3. Check prizePool parameter if structured object { amount, currency, description }
  if (prizePool && typeof prizePool === "object" && !Array.isArray(prizePool)) {
    if (typeof prizePool.description === "string") {
      const cleanDesc = stripHtmlTags(prizePool.description);
      if (cleanDesc) return cleanDesc;
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
    if (cleanFallback) return cleanFallback;
  }

  return "Not specified";
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

/**
 * Format event mode handling objects, strings, or missing values
 * @param {string} mode
 * @param {string} format
 * @param {Object} event
 * @returns {string}
 */
export function formatMode(mode, format, event) {
  if (typeof mode === "string" && mode.trim()) {
    return stripHtmlTags(mode);
  }
  if (typeof format === "string" && format.trim()) {
    return stripHtmlTags(format);
  }
  if (event && typeof event === "object" && !Array.isArray(event)) {
    if (typeof event.mode === "string" && event.mode.trim()) {
      return stripHtmlTags(event.mode);
    }
  }
  return "Online";
}
