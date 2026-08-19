// ---------------------------------------------------------------------------
// server/adapters/devpostAdapter.js
// Adapter for fetching live hackathons from Devpost API
// ---------------------------------------------------------------------------

const PLATFORM_NAME = "devpost";

/**
 * Fetch hackathons from Devpost public endpoint
 * @returns {Promise<Array<Object>>} Normalized raw platform hackathon objects
 */
async function fetchHackathons() {
  const url = "https://devpost.com/api/hackathons?challenge_type[]=online&challenge_type[]=in_person&sort_by=Recently+Added";
  
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Devpost API returned status ${response.status}`);
    }

    const data = await response.json();
    const items = data.hackathons || [];

    return items.map((item) => {
      const isOnline = item.displayed_location?.location?.toLowerCase().includes("online") || item.open_state === "online";
      
      // Parse prize amount and clean HTML tags if present
      let prizeAmount = 0;
      let prizeDescription = "";
      if (item.prize_amount) {
        const rawString = String(item.prize_amount);
        prizeDescription = rawString.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
        const numeric = rawString.replace(/[^0-9]/g, "");
        if (numeric) prizeAmount = parseInt(numeric, 10);
      }

      // Parse themes/tags
      const themes = (item.themes || []).map((t) => typeof t === "string" ? t : t.name).filter(Boolean);

      return {
        platform: PLATFORM_NAME,
        externalId: String(item.id || item.url || Math.random()),
        externalUrl: item.url || `https://devpost.com/hackathons`,
        title: item.title || "Untitled Devpost Hackathon",
        shortDescription: item.tagline || "",
        description: item.tagline || item.title || "",
        organizerName: item.organization_name || "Devpost Organizer",
        organizerLogo: item.thumbnail_url || "",
        registrationUrl: item.url || "",
        image: item.thumbnail_url ? (item.thumbnail_url.startsWith("//") ? `https:${item.thumbnail_url}` : item.thumbnail_url) : "",
        mode: isOnline ? "Online" : "Offline",
        venue: item.displayed_location?.location || "",
        prizeAmount: prizeAmount,
        prizeCurrency: "USD",
        prizeDescription: prizeDescription,
        themes: themes,
        skills: themes,
        startDate: item.submission_period_dates ? parseDateRange(item.submission_period_dates, "start") : null,
        endDate: item.submission_period_dates ? parseDateRange(item.submission_period_dates, "end") : null,
        registrationDeadline: item.submission_period_dates ? parseDateRange(item.submission_period_dates, "end") : null,
        raw: item,
      };
    });
  } catch (error) {
    console.error(`[Devpost Adapter] Error fetching hackathons:`, error.message);
    throw error;
  }
}

function parseDateRange(dateStr, type) {
  if (!dateStr || typeof dateStr !== "string") return null;
  const parts = dateStr.split("-").map((p) => p.trim());
  if (type === "start") {
    const d = new Date(parts[0]);
    return isNaN(d.getTime()) ? null : d;
  }
  if (parts.length > 1) {
    const d = new Date(parts[1]);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(parts[0]);
  return isNaN(d.getTime()) ? null : d;
}

module.exports = {
  platform: PLATFORM_NAME,
  fetchHackathons,
};
