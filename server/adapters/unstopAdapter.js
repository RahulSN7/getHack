// ---------------------------------------------------------------------------
// server/adapters/unstopAdapter.js
// Adapter for fetching live hackathons from Unstop (formerly Dare2Compete)
// ---------------------------------------------------------------------------

const normalizeExternalUrl = require("../utils/normalizeExternalUrl");

const PLATFORM_NAME = "unstop";

/**
 * Fetch hackathons from Unstop public search endpoint
 * @returns {Promise<Array<Object>>} Normalized raw platform hackathon objects
 */
async function fetchHackathons() {
  const url = "https://unstop.com/api/public/opportunity/search-result?opportunity=hackathons&per_page=30&oppstatus=open";
  
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Unstop API returned status ${response.status}`);
    }

    const data = await response.json();
    const items = data.data?.data || data.data || data.opportunities || [];

    return items.map((item) => {
      const candidateUrl = item.seo_url || item.public_url || item.url || item.opportunity_url || (item.slug ? `/p/${item.slug}` : null);
      const publicUrl = normalizeExternalUrl(candidateUrl, "https://unstop.com") || "https://unstop.com/hackathons";
      
      let prize = 0;
      if (item.prize_pool) {
        const num = String(item.prize_pool).replace(/[^0-9]/g, "");
        if (num) prize = parseInt(num, 10);
      }

      const isOnline = item.region?.toLowerCase().includes("online") || item.type?.toLowerCase().includes("online") || true;

      return {
        platform: PLATFORM_NAME,
        externalId: String(item.id || item.id_hash || Math.random()),
        externalUrl: publicUrl,
        title: item.title || "Unstop Hackathon",
        shortDescription: item.organisation?.name ? `Organized by ${item.organisation.name}` : "",
        description: item.summary || item.title || "",
        organizerName: item.organisation?.name || "Unstop Partner",
        organizerLogo: item.organisation?.logo_url || item.banner_mobile || "",
        registrationUrl: publicUrl,
        image: item.banner_desktop || item.banner_mobile || item.logoUrl || "",
        mode: isOnline ? "Online" : "Offline",
        venue: item.location || "Online",
        prizeAmount: prize,
        prizeCurrency: "INR",
        prizeDescription: item.prize_pool ? `₹${item.prize_pool}` : "",
        themes: Array.isArray(item.filters) ? item.filters.map(f => f.name) : ["Technology"],
        skills: ["Problem Solving", "Coding"],
        startDate: item.start_date ? new Date(item.start_date) : null,
        endDate: item.end_date ? new Date(item.end_date) : null,
        registrationDeadline: item.regnRequirements?.end_regn_date ? new Date(item.regnRequirements.end_regn_date) : item.end_date ? new Date(item.end_date) : null,
        raw: item,
      };
    });
  } catch (error) {
    console.error(`[Unstop Adapter] Error fetching hackathons:`, error.message);
    throw error;
  }
}

module.exports = {
  platform: PLATFORM_NAME,
  fetchHackathons,
};
