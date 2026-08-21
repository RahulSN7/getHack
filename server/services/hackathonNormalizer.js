// ---------------------------------------------------------------------------
// server/services/hackathonNormalizer.js
// Normalizes platform adapter outputs into unified getHack Hackathon objects
// ---------------------------------------------------------------------------

const normalizeExternalUrl = require("../utils/normalizeExternalUrl");

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
 * Clean HTML tags and unescape common HTML entities
 */
function stripHtmlTags(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
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
  const defaultDomain =
    platform === "unstop" ? "https://unstop.com"
      : platform === "devpost" ? "https://devpost.com"
        : platform === "devfolio" ? "https://devfolio.co"
          : platform === "dorahacks" ? "https://dorahacks.io"
            : platform === "kaggle" ? "https://www.kaggle.com"
              : platform === "hack2skill" ? "https://hack2skill.com"
                : platform === "mlh" ? "https://mlh.io"
                  : "https://unstop.com";

  const rawExtUrl = rawHackathon.externalUrl || rawHackathon.registrationUrl || "";
  const externalUrl = normalizeExternalUrl(rawExtUrl, defaultDomain) || defaultDomain;
  const registrationUrl = normalizeExternalUrl(rawHackathon.registrationUrl, defaultDomain) || externalUrl;

  const startDate = normalizeDate(rawHackathon.startDate);
  const endDate = normalizeDate(rawHackathon.endDate);
  const regDeadline = normalizeDate(rawHackathon.registrationDeadline) || endDate || startDate;
  const regStart = normalizeDate(rawHackathon.registrationOpens);

  const mode = rawHackathon.mode === "Offline" || rawHackathon.mode === "Hybrid" ? rawHackathon.mode : "Online";

  const themes = Array.isArray(rawHackathon.themes) ? rawHackathon.themes.filter(Boolean) : [];
  const skills = Array.isArray(rawHackathon.skills) ? rawHackathon.skills.filter(Boolean) : [];

  // Clean prize description of raw HTML tags
  const rawPrizeDesc = rawHackathon.prizeDescription || "";
  const cleanPrizeDesc = stripHtmlTags(rawPrizeDesc);
  const finalPrizeDesc = cleanPrizeDesc || (rawHackathon.prizeAmount ? `${rawHackathon.prizeCurrency || "USD"} ${rawHackathon.prizeAmount}` : "Cash & Perks");

  return {
    title,
    slug,
    shortDescription: stripHtmlTags(rawHackathon.shortDescription || rawHackathon.description || "").substring(0, 300),
    description: stripHtmlTags(rawHackathon.description || rawHackathon.shortDescription || title),

    organizerName: stripHtmlTags(rawHackathon.organizerName || "Organizer"),
    organizer: {
      name: stripHtmlTags(rawHackathon.organizerName || "Organizer"),
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
      venue: mode === "Online" ? "Online" : (stripHtmlTags(rawHackathon.venue) || "TBD"),
      address: stripHtmlTags(rawHackathon.address) || "",
    },

    format: mode,
    location: {
      venue: mode === "Online" ? "Online" : (stripHtmlTags(rawHackathon.venue) || "TBD"),
      city: stripHtmlTags(rawHackathon.city) || "",
      country: stripHtmlTags(rawHackathon.country) || "",
      address: stripHtmlTags(rawHackathon.address) || "",
    },

    registrationUrl,
    eligibility: stripHtmlTags(rawHackathon.eligibility) || "Open to all creators and developers",

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
      description: finalPrizeDesc,
    },
    prizes: finalPrizeDesc,

    themes: themes.length > 0 ? themes.map(stripHtmlTags) : ["Innovation", "Technology"],
    skills: skills.length > 0 ? skills.map(stripHtmlTags) : ["Software Development"],
    requirements: Array.isArray(rawHackathon.requirements) ? rawHackathon.requirements.map(stripHtmlTags) : [],

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
  stripHtmlTags,
};
