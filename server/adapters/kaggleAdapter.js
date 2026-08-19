// ---------------------------------------------------------------------------
// server/adapters/kaggleAdapter.js
// Adapter for fetching live hackathons and competitions from Kaggle
// ---------------------------------------------------------------------------

const PLATFORM_NAME = "kaggle";

/**
 * Fetch hackathons/competitions from Kaggle public endpoint
 * @returns {Promise<Array<Object>>} Normalized raw platform hackathon objects
 */
async function fetchHackathons() {
  let items = [];

  try {
    const response = await fetch("https://www.kaggle.com/api/v1/competitions/list", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) items = data;
    }
  } catch {
    // Try webpage fallback
  }

  if (items.length === 0) {
    try {
      const pageRes = await fetch("https://www.kaggle.com/competitions", {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (pageRes.ok) {
        const html = await pageRes.text();
        const jsonMatch = html.match(/Kaggle\.State\.push\(({[\s\S]*?})\);/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1]);
          items = parsed.competitions || [];
        }
      }
    } catch (e) {
      console.warn(`[Kaggle Adapter] Fallback page fetch warning: ${e.message}`);
    }
  }

  return items.map((item) => {
    const ref = item.ref || item.id || "";
    const externalUrl = item.url || (ref ? `https://www.kaggle.com/competitions/${ref}` : "https://www.kaggle.com/competitions");

    let prizeAmount = 0;
    if (item.reward) {
      const num = String(item.reward).replace(/[^0-9]/g, "");
      if (num) prizeAmount = parseInt(num, 10);
    }

    return {
      platform: PLATFORM_NAME,
      externalId: String(item.id || ref || Math.random()),
      externalUrl: externalUrl,
      title: item.title || "Kaggle Community Competition",
      shortDescription: item.description || item.tagline || "",
      description: item.description || item.title || "",
      organizerName: item.organizationName || "Kaggle",
      organizerLogo: item.thumbnailImageUrl || "https://www.kaggle.com/static/images/site-logo.png",
      registrationUrl: externalUrl,
      image: item.thumbnailImageUrl || item.headerImageUrl || "",
      mode: "Online",
      venue: "Online",
      prizeAmount: prizeAmount,
      prizeCurrency: "USD",
      prizeDescription: item.reward || "Swag / Knowledge",
      themes: ["Data Science", "Machine Learning", "AI"],
      skills: ["Python", "Machine Learning", "Data Analysis"],
      startDate: item.enabledDate ? new Date(item.enabledDate) : null,
      endDate: item.deadline ? new Date(item.deadline) : null,
      registrationDeadline: item.deadline ? new Date(item.deadline) : null,
      raw: item,
    };
  });
}

module.exports = {
  platform: PLATFORM_NAME,
  fetchHackathons,
};
