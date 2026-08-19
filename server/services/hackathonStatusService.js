// ---------------------------------------------------------------------------
// server/services/hackathonStatusService.js
// Status calculation based on current date vs registration/event dates
// ---------------------------------------------------------------------------

/**
 * Calculate status string for a hackathon record or date payload
 * @param {Object} hackathon Hackathon document or object
 * @returns {string} 'upcoming' | 'registration-open' | 'registration-closed' | 'live' | 'completed'
 */
function calculateStatus(hackathon) {
  const now = new Date();
  
  const regStart = hackathon.registration?.startDate || hackathon.registrationOpens;
  const regDeadline = hackathon.registration?.deadline || hackathon.registrationDeadline;
  const eventStart = hackathon.event?.startDate || hackathon.startDate;
  const eventEnd = hackathon.event?.endDate || hackathon.endDate;

  // Before registration starts
  if (regStart && now < new Date(regStart)) {
    return "upcoming";
  }

  // Registration active
  if (regDeadline && now <= new Date(regDeadline)) {
    return "registration-open";
  }

  // Event active/live
  if (eventStart && eventEnd && now >= new Date(eventStart) && now <= new Date(eventEnd)) {
    return "live";
  }

  // Registration closed, event not started yet
  if (regDeadline && now > new Date(regDeadline) && eventStart && now < new Date(eventStart)) {
    return "registration-closed";
  }

  // Event ended
  if (eventEnd && now > new Date(eventEnd)) {
    return "completed";
  }

  if (regDeadline && now > new Date(regDeadline)) {
    return "registration-closed";
  }

  return "registration-open";
}

module.exports = {
  calculateStatus,
};
