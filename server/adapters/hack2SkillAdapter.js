// ---------------------------------------------------------------------------
// server/adapters/hack2SkillAdapter.js
// Adapter for fetching live hackathons from Hack2Skill
// ---------------------------------------------------------------------------

const PLATFORM_NAME = "hack2skill";

/**
 * Fetch hackathons from Hack2Skill public endpoint
 * @returns {Promise<Array<Object>>} Normalized raw platform hackathon objects
 */
async function fetchHackathons() {
  let items = [];

  const endpoints = [
    "https://api.hack2skill.com/v1/hackathons/active",
    "https://hack2skill.com/api/hackathons",
  ];

  for (const ep of endpoints) {
    try {
      const response = await fetch(ep, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const list = data.data || data.hackathons || [];
        if (Array.isArray(list) && list.length > 0) {
          items = list;
          break;
        }
      }
    } catch {
      // try next
    }
  }

  // Webpage fallback if API endpoints require web session
  if (items.length === 0) {
    try {
      const pageRes = await fetch("https://hack2skill.com/hackathons", {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (pageRes.ok) {
        const html = await pageRes.text();
        const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/i);
        if (nextDataMatch) {
          const nextData = JSON.parse(nextDataMatch[1]);
          const props = nextData.props?.pageProps;
          items = props?.hackathons || props?.data || props?.dehydratedState?.queries?.[0]?.state?.data || [];
        }
      }
    } catch (e) {
      console.warn(`[Hack2Skill Adapter] Page fallback warning: ${e.message}`);
    }
  }

  return items.map((item) => {
    const slug = item.slug || item.id || "";
    const externalUrl = item.url || (slug ? `https://hack2skill.com/hackathons/${slug}` : "https://hack2skill.com");

    let prizeAmount = 0;
    if (item.prizePool || item.prize_amount) {
      const num = String(item.prizePool || item.prize_amount).replace(/[^0-9]/g, "");
      if (num) prizeAmount = parseInt(num, 10);
    }

    return {
      platform: PLATFORM_NAME,
      externalId: String(item.id || slug || Math.random()),
      externalUrl: externalUrl,
      title: item.title || item.name || "Hack2Skill Hackathon",
      shortDescription: item.shortDescription || item.tagline || "",
      description: item.description || item.title || "",
      organizerName: item.company || item.organizer || "Hack2Skill Partner",
      organizerLogo: item.logo || "",
      registrationUrl: externalUrl,
      image: item.banner || item.coverImage || "",
      mode: item.mode || (item.isOnline ? "Online" : "Offline"),
      venue: item.location || "Online",
      prizeAmount: prizeAmount,
      prizeCurrency: "INR",
      prizeDescription: item.prizePool ? `₹${item.prizePool}` : "",
      themes: Array.isArray(item.categories) ? item.categories : ["Innovation"],
      skills: ["Software Engineering", "AI"],
      startDate: item.startDate ? new Date(item.startDate) : null,
      endDate: item.endDate ? new Date(item.endDate) : null,
      registrationDeadline: item.regDeadline ? new Date(item.regDeadline) : item.endDate ? new Date(item.endDate) : null,
      raw: item,
    };
  });
}

module.exports = {
  platform: PLATFORM_NAME,
  fetchHackathons,
};
