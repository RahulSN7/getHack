// ---------------------------------------------------------------------------
// server/services/dataCorrectionPipeline.js
// Clean, transparent Data Normalization & Validation Pipeline
// ---------------------------------------------------------------------------

const { validateRegistrationUrl } = require("./detectors/urlValidator");
const normalizeExternalUrl = require("../utils/normalizeExternalUrl");

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

function slugify(text) {
  if (!text) return `hackathon-${Date.now()}`;
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .substring(0, 80);
}

function parseDate(val) {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  if (d.getUTCFullYear() <= 2005) return null;
  return d;
}

/**
 * Execute clean data pipeline for adapter inputs
 * @param {Object} rawHackathon Output from platform adapter
 * @returns {Object} Normalized hackathon object
 */
function processPipeline(rawHackathon = {}) {
  const platform = String(rawHackathon.platform || "gethack").toLowerCase();
  const externalId = String(rawHackathon.externalId || "");
  const title = stripHtmlTags(rawHackathon.title || "Untitled Hackathon") || "Untitled Hackathon";

  const slug = `${slugify(title)}-${platform}-${externalId || Date.now().toString(36)}`;

  const defaultDomain =
    platform === "unstop" ? "https://unstop.com"
    : platform === "devpost" ? "https://devpost.com"
    : platform === "devfolio" ? "https://devfolio.co"
    : platform === "dorahacks" ? "https://dorahacks.io"
    : platform === "kaggle" ? "https://www.kaggle.com"
    : platform === "hack2skill" ? "https://hack2skill.com"
    : platform === "mlh" ? "https://mlh.io"
    : "https://unstop.com";

  // Validate Registration URL
  const rawUrl = rawHackathon.registrationUrl || rawHackathon.externalUrl || "";
  const urlCheck = validateRegistrationUrl(rawUrl, defaultDomain);
  const registrationUrl = urlCheck.isValid ? urlCheck.normalizedUrl : null;
  const externalUrl = normalizeExternalUrl(rawHackathon.externalUrl, defaultDomain) || registrationUrl || defaultDomain;

  // Dates
  const startDate = parseDate(rawHackathon.startDate);
  const endDate = parseDate(rawHackathon.endDate);
  const regDeadline = parseDate(rawHackathon.registrationDeadline) || endDate || startDate;
  const regStart = parseDate(rawHackathon.registrationOpens);

  // Status calculation
  const now = new Date();
  let status = "Unknown";
  if (regDeadline) {
    if (now.getTime() > regDeadline.getTime()) {
      status = "Closed";
    } else if (regStart && now.getTime() < regStart.getTime()) {
      status = "Upcoming";
    } else {
      status = "Open";
    }
  } else if (startDate) {
    status = now.getTime() > startDate.getTime() ? "Closed" : "Open";
  }

  // Mode
  let mode = "Unknown";
  const rawMode = String(rawHackathon.mode || rawHackathon.format || "").toLowerCase();
  if (rawMode.includes("hybrid")) mode = "Hybrid";
  else if (rawMode.includes("online") || rawMode.includes("virtual") || rawMode.includes("remote")) mode = "Online";
  else if (rawMode.includes("offline") || rawMode.includes("in-person") || rawMode.includes("physical")) mode = "Offline";
  else if (rawHackathon.mode === "Online" || rawHackathon.mode === "Offline" || rawHackathon.mode === "Hybrid") mode = rawHackathon.mode;

  // Team Size
  let minTeam = rawHackathon.minTeamSize != null ? Number(rawHackathon.minTeamSize) : null;
  let maxTeam = rawHackathon.maxTeamSize != null ? Number(rawHackathon.maxTeamSize) : null;
  let displayTeam = "Check official registration page";

  if (minTeam !== null && maxTeam !== null && !isNaN(minTeam) && !isNaN(maxTeam)) {
    displayTeam = minTeam === maxTeam ? `${minTeam}` : `${minTeam}-${maxTeam}`;
  } else if (typeof rawHackathon.teamSize === "string" && rawHackathon.teamSize.trim()) {
    displayTeam = stripHtmlTags(rawHackathon.teamSize);
  }

  // Eligibility
  let eligibility = "Check official registration page";
  if (typeof rawHackathon.eligibility === "string" && rawHackathon.eligibility.trim()) {
    eligibility = stripHtmlTags(rawHackathon.eligibility);
  }

  // Organizer Name
  const organizerName = stripHtmlTags(rawHackathon.organizerName || rawHackathon.organizer?.name || "Organizer") || "Organizer";

  // Prize Pool
  const rawPrizeDesc = stripHtmlTags(rawHackathon.prizeDescription || rawHackathon.prizes || "");
  const amount = typeof rawHackathon.prizeAmount === "number" ? rawHackathon.prizeAmount : 0;
  const currency = rawHackathon.prizeCurrency || "USD";
  const prizeDisplay = rawPrizeDesc || (amount > 0 ? `${currency} ${amount.toLocaleString()}` : "See official page");

  return {
    title,
    slug,
    shortDescription: stripHtmlTags(rawHackathon.shortDescription || rawHackathon.description || "").substring(0, 300),
    description: stripHtmlTags(rawHackathon.description || rawHackathon.shortDescription || title),

    organizerName,
    organizer: {
      name: organizerName,
      logo: rawHackathon.organizerLogo || rawHackathon.organizer?.logo || "",
      website: rawHackathon.organizerWebsite || rawHackathon.organizer?.website || "",
    },

    source: {
      platform,
      externalId,
      externalUrl,
      provider: platform,
      url: registrationUrl || externalUrl,
      fetchedAt: new Date(),
    },

    mode,
    format: mode,

    teamSize: {
      min: minTeam,
      max: maxTeam,
      display: displayTeam,
    },
    minTeamSize: minTeam,
    maxTeamSize: maxTeam,

    eligibility,

    registration: {
      status,
      url: registrationUrl,
      startDate: regStart,
      deadline: regDeadline,
    },
    registrationOpens: regStart,
    registrationDeadline: regDeadline,
    registrationUrl,

    event: {
      startDate,
      endDate,
      mode,
      timezone: rawHackathon.timezone || "UTC",
      venue: mode === "Online" ? "Online" : (stripHtmlTags(rawHackathon.venue) || "TBD"),
      address: stripHtmlTags(rawHackathon.address) || "",
    },
    startDate,
    endDate,

    location: {
      venue: mode === "Online" ? "Online" : (stripHtmlTags(rawHackathon.venue) || "TBD"),
      city: stripHtmlTags(rawHackathon.city) || "",
      country: stripHtmlTags(rawHackathon.country) || "",
      address: stripHtmlTags(rawHackathon.address) || "",
    },

    prizePool: {
      amount,
      currency,
      display: prizeDisplay,
      description: prizeDisplay,
    },
    prizes: prizeDisplay,

    registrationFee: {
      amount: rawHackathon.registrationFeeAmount || 0,
      currency: rawHackathon.registrationFeeCurrency || "USD",
    },
    fee: rawHackathon.fee || "Free",

    themes: Array.isArray(rawHackathon.themes) ? rawHackathon.themes.map(stripHtmlTags).filter(Boolean) : ["Technology"],
    skills: Array.isArray(rawHackathon.skills) ? rawHackathon.skills.map(stripHtmlTags).filter(Boolean) : ["Software Development"],
    requirements: Array.isArray(rawHackathon.requirements) ? rawHackathon.requirements.map(stripHtmlTags).filter(Boolean) : [],

    image: rawHackathon.image || "",
    participants: rawHackathon.participants || 0,
    rules: rawHackathon.rules || "",
    contact: rawHackathon.contact || "",
    lastSyncedAt: new Date(),

    rawData: rawHackathon.raw || rawHackathon,
  };
}

module.exports = {
  processPipeline,
};
