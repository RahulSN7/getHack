// ---------------------------------------------------------------------------
// client/src/utils/hackathonFormatters.js
// Defensive formatter helpers to ensure structured MongoDB objects are cleanly
// converted to human-readable strings for React rendering.
// ---------------------------------------------------------------------------

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
    return teamSize.trim();
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
 * Format prize info handling objects, numbers, strings, or missing values
 * @param {Object|number|string} prizePool
 * @param {string|number} prizes
 * @param {string} fallback
 * @returns {string}
 */
export function formatPrize(prizePool, prizes, fallback = "Free") {
  if (typeof prizes === "string" && prizes.trim()) {
    return prizes.trim();
  }
  if (typeof prizes === "number") {
    return `$${prizes.toLocaleString()}`;
  }
  if (typeof prizePool === "string" && prizePool.trim()) {
    return prizePool.trim();
  }
  if (typeof prizePool === "number") {
    return `$${prizePool.toLocaleString()}`;
  }
  if (prizePool && typeof prizePool === "object" && !Array.isArray(prizePool)) {
    if (typeof prizePool.description === "string" && prizePool.description.trim()) {
      return prizePool.description.trim();
    }
    if (prizePool.amount != null && !isNaN(Number(prizePool.amount))) {
      const curr = prizePool.currency === "INR" ? "₹" : "$";
      return `${curr}${Number(prizePool.amount).toLocaleString()}`;
    }
  }
  return fallback;
}

/**
 * Format organizer name handling objects, strings, or missing values
 * @param {string} organizerName
 * @param {Object|string} organizer
 * @returns {string}
 */
export function formatOrganizer(organizerName, organizer) {
  if (typeof organizerName === "string" && organizerName.trim()) {
    return organizerName.trim();
  }
  if (typeof organizer === "string" && organizer.trim()) {
    return organizer.trim();
  }
  if (organizer && typeof organizer === "object" && !Array.isArray(organizer)) {
    if (typeof organizer.name === "string" && organizer.name.trim()) {
      return organizer.name.trim();
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
    return location.trim();
  }
  if (location && typeof location === "object" && !Array.isArray(location)) {
    const parts = [];
    if (location.city) parts.push(location.city);
    if (location.country) parts.push(location.country);
    if (parts.length > 0) return parts.join(", ");
    if (location.venue) return location.venue;
    if (location.address) return location.address;
  }
  if (event && typeof event === "object" && !Array.isArray(event)) {
    if (event.venue) return event.venue;
    if (event.address) return event.address;
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
    return fee.trim();
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
    return mode.trim();
  }
  if (typeof format === "string" && format.trim()) {
    return format.trim();
  }
  if (event && typeof event === "object" && !Array.isArray(event)) {
    if (typeof event.mode === "string" && event.mode.trim()) {
      return event.mode.trim();
    }
  }
  return "Online";
}
