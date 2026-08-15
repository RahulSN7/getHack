// ---------------------------------------------------------------------------
// Deadline Calculation Utilities
// Pure functions for calculating time remaining and formatting deadlines
// ---------------------------------------------------------------------------

export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * Calculates remaining time status and formatted text for a deadline.
 *
 * @param {string | number | Date} isoDate - Absolute deadline ISO string or Date
 * @param {boolean} [registrationOpen=true] - Registration open flag from hackathon object
 * @param {number} [nowMs=Date.now()] - Current timestamp in ms (defaults to Date.now())
 * @returns {{
 *   status: 'normal' | 'approaching' | 'urgent' | 'critical' | 'closed' | 'invalid',
 *   text: string,
 *   remainingMs: number,
 *   updateIntervalMs: number | null
 * }}
 */
export function getDeadlineInfo(isoDate, registrationOpen = true, nowMs = Date.now()) {
  if (!isoDate) {
    return {
      status: "invalid",
      text: "Deadline unavailable",
      remainingMs: 0,
      updateIntervalMs: null,
    };
  }

  const deadlineMs = new Date(isoDate).getTime();

  if (isNaN(deadlineMs)) {
    return {
      status: "invalid",
      text: "Deadline unavailable",
      remainingMs: 0,
      updateIntervalMs: null,
    };
  }

  const remainingMs = deadlineMs - nowMs;

  // If registration is explicitly closed or deadline has passed
  if (!registrationOpen || remainingMs <= 0) {
    return {
      status: "closed",
      text: "Registration closed",
      remainingMs: 0,
      updateIntervalMs: null,
    };
  }

  // 1. More than 24 hours remaining (> 24 hours)
  if (remainingMs > MS_PER_DAY) {
    const formattedDate = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(deadlineMs));

    return {
      status: "normal",
      text: `Deadline · ${formattedDate}`,
      remainingMs,
      updateIntervalMs: null, // No timer required when > 24 hours
    };
  }

  // 2. 24 hours or less remaining (0 < remainingMs <= 24 hours) & >= 1 hour
  if (remainingMs >= MS_PER_HOUR) {
    const hours = Math.floor(remainingMs / MS_PER_HOUR);
    const minutes = Math.floor((remainingMs % MS_PER_HOUR) / MS_PER_MINUTE);

    return {
      status: "approaching",
      text: `Closes in ${hours}h ${minutes}m`,
      remainingMs,
      updateIntervalMs: 10000, // Update every 10 seconds when > 1 hour
    };
  }

  // 3. Less than 1 hour (0 < remainingMs < 1 hour) & >= 1 minute
  if (remainingMs >= MS_PER_MINUTE) {
    const minutes = Math.floor(remainingMs / MS_PER_MINUTE);

    return {
      status: "urgent",
      text: `Closes in ${minutes}m`,
      remainingMs,
      updateIntervalMs: 1000, // Update every second when < 1 hour
    };
  }

  // 4. Less than 1 minute (0 < remainingMs < 1 minute)
  const seconds = Math.floor(remainingMs / MS_PER_SECOND);

  if (seconds <= 0) {
    return {
      status: "closed",
      text: "Registration closed",
      remainingMs: 0,
      updateIntervalMs: null,
    };
  }

  return {
    status: "critical",
    text: `Closes in ${seconds}s`,
    remainingMs,
    updateIntervalMs: 1000, // Update every second when < 1 minute
  };
}
