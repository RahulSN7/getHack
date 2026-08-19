// ---------------------------------------------------------------------------
// server/services/hackathonNormalizer.js
// Normalizes platform adapter outputs into unified getHack Hackathon objects
// ---------------------------------------------------------------------------

/**
 * Generate URL slug from title
 */
function slugify(text) {
  if (!text) return `hackathon-${Date.now()}`;
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove non-word chars
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .substring(0, 80);
}

/**
 * Normalize date value to JS Date or null
 */
function normalizeDate(val) {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Normalize raw hackathon payload into getHack Mongoose Schema compatible object
 * @param {Object} rawHackathon Output from platform adapter
 * @returns {Object} Normalized hackathon object
 */
function normalize(rawHackathon) {
  const title = (rawHackathon.title || "Untitled Hackathon").trim();
  const slug = `${slugify(title)}-${rawHackathon.platform || "agg"}-${rawHackathon.externalId || Date.now().toString(36)}`;
  
  const platform = (rawHackathon.platform || "gethack").toLowerCase();
  const externalUrl = rawHackathon.externalUrl || rawHackathon.registrationUrl || "";
  const registrationUrl = rawHackathon.registrationUrl || externalUrl;

  const startDate = normalizeDate(rawHackathon.startDate);
  const endDate = normalizeDate(rawHackathon.endDate);
  const regDeadline = normalizeDate(rawHackathon.registrationDeadline) || endDate || startDate;
  const regStart = normalizeDate(rawHackathon.registrationOpens);

  const mode = rawHackathon.mode === "Offline" || rawHackathon.mode === "Hybrid" ? rawHackathon.mode : "Online";

  const themes = Array.isArray(rawHackathon.themes) ? rawHackathon.themes.filter(Boolean) : [];
  const skills = Array.isArray(rawHackathon.skills) ? rawHackathon.skills.filter(Boolean) : [];

  return {
    title,
    slug,
    shortDescription: (rawHackathon.shortDescription || rawHackathon.description || "").substring(0, 300),
    description: rawHackathon.description || rawHackathon.shortDescription || title,

    organizerName: rawHackathon.organizerName || "Organizer",
    organizer: {
      name: rawHackathon.organizerName || "Organizer",
      logo: rawHackathon.organizerLogo || "",
      website: rawHackathon.organizerWebsite || "",
    },

    source: {
      platform,
      externalId: String(rawHackathon.externalId || ""),
      externalUrl,
    },

    registration: {
      url: registrationUrl,
      startDate: regStart,
      deadline: regDeadline,
    },

    // Legacy date accessors
    registrationOpens: regStart,
    registrationDeadline: regDeadline,
    startDate: startDate || new Date(),
    endDate: endDate || new Date(Date.now() + 86400000 * 3),

    event: {
      startDate: startDate || new Date(),
      endDate: endDate || new Date(Date.now() + 86400000 * 3),
      mode,
      timezone: rawHackathon.timezone || "UTC",
      venue: mode === "Online" ? "Online" : (rawHackathon.venue || "TBD"),
      address: rawHackathon.address || "",
    },

    format: mode,
    location: {
      venue: mode === "Online" ? "Online" : (rawHackathon.venue || "TBD"),
      city: rawHackathon.city || "",
      country: rawHackathon.country || "",
      address: rawHackathon.address || "",
    },

    registrationUrl,
    eligibility: rawHackathon.eligibility || "Open to all creators and developers",

    teamSize: {
      min: rawHackathon.minTeamSize || 1,
      max: rawHackathon.maxTeamSize || 4,
    },
    minTeamSize: rawHackathon.minTeamSize || 1,
    maxTeamSize: rawHackathon.maxTeamSize || 4,

    registrationFee: {
      amount: rawHackathon.registrationFeeAmount || 0,
      currency: rawHackathon.registrationFeeCurrency || "USD",
    },
    fee: rawHackathon.fee || "Free",

    prizePool: {
      amount: rawHackathon.prizeAmount || 0,
      currency: rawHackathon.prizeCurrency || "USD",
      description: rawHackathon.prizeDescription || (rawHackathon.prizeAmount ? `${rawHackathon.prizeCurrency || "USD"} ${rawHackathon.prizeAmount}` : "Free to enter"),
    },
    prizes: rawHackathon.prizeDescription || (rawHackathon.prizeAmount ? `${rawHackathon.prizeCurrency || "USD"} ${rawHackathon.prizeAmount}` : "Cash & Perks"),

    themes: themes.length > 0 ? themes : ["Innovation", "Technology"],
    skills: skills.length > 0 ? skills : ["Software Development"],
    requirements: Array.isArray(rawHackathon.requirements) ? rawHackathon.requirements : [],

    submission: {
      deadline: endDate || regDeadline,
      platform: platform,
      url: externalUrl,
    },

    judging: Array.isArray(rawHackathon.judging) ? rawHackathon.judging : [],
    sponsors: Array.isArray(rawHackathon.sponsors) ? rawHackathon.sponsors : [],

    image: rawHackathon.image || "",
    participants: rawHackathon.participants || 0,
    rules: rawHackathon.rules || "",
    contact: rawHackathon.contact || "",
    lastSyncedAt: new Date(),
  };
}

module.exports = {
  normalize,
  slugify,
};
