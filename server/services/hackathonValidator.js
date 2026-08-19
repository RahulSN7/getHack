// ---------------------------------------------------------------------------
// server/services/hackathonValidator.js
// Validates normalized hackathon objects prior to DB upsert
// ---------------------------------------------------------------------------

/**
 * Validate normalized hackathon object
 * @param {Object} hackathon Normalized hackathon object
 * @returns {Object} { isValid: boolean, reason?: string }
 */
function validate(hackathon) {
  if (!hackathon) {
    return { isValid: false, reason: "Hackathon object is null or undefined" };
  }

  if (!hackathon.title || typeof hackathon.title !== "string" || hackathon.title.trim().length === 0) {
    return { isValid: false, reason: "Missing or invalid title" };
  }

  if (!hackathon.source || !hackathon.source.platform || !hackathon.source.externalId) {
    return { isValid: false, reason: "Missing platform source or external ID" };
  }

  const url = hackathon.registration?.url || hackathon.source?.externalUrl;
  if (!url || typeof url !== "string" || (!url.startsWith("http://") && !url.startsWith("https://"))) {
    return { isValid: false, reason: "Missing or malformed registration URL" };
  }

  // Ensure dates if present are valid
  if (hackathon.startDate && isNaN(new Date(hackathon.startDate).getTime())) {
    return { isValid: false, reason: "Invalid start date" };
  }

  if (hackathon.endDate && isNaN(new Date(hackathon.endDate).getTime())) {
    return { isValid: false, reason: "Invalid end date" };
  }

  return { isValid: true };
}

module.exports = {
  validate,
};
