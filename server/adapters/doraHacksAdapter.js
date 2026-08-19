// ---------------------------------------------------------------------------
// server/adapters/doraHacksAdapter.js
// Adapter for fetching live hackathons from DoraHacks
// ---------------------------------------------------------------------------

const PLATFORM_NAME = "dorahacks";

/**
 * Fetch hackathons from DoraHacks API & web state
 * @returns {Promise<Array<Object>>} Normalized raw platform hackathon objects
 */
async function fetchHackathons() {
  let rawItems = [];

  const endpoints = [
    "https://backend.dorahacks.io/hackathon",
    "https://dorahacks.io/api/v1/hackathon",
    "https://dorahacks.io/api/v2/hackathon/list?page=1&limit=20",
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
        },
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.data?.list || data.list || data.data || [];
        if (Array.isArray(list) && list.length > 0) {
          rawItems = list;
          break;
        }
      }
    } catch {
      // try next
    }
  }

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    try {
      const pageRes = await fetch("https://dorahacks.io/hackathon", {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (pageRes.ok) {
        const html = await pageRes.text();
        const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/i);
        if (nextDataMatch) {
          const nextData = JSON.parse(nextDataMatch[1]);
          const props = nextData.props?.pageProps;
          const list = props?.hackathons || props?.list || props?.dehydratedState?.queries?.[0]?.state?.data?.list || [];
          if (Array.isArray(list)) rawItems = list;
        }
      }
    } catch (e) {
      console.warn(`[DoraHacks Adapter] Page fallback warning: ${e.message}`);
    }
  }

  if (!Array.isArray(rawItems)) rawItems = [];

  return rawItems.map((item) => {
    const slug = item.slug || item.id || "";
    const externalUrl = slug ? `https://dorahacks.io/hackathon/${slug}` : "https://dorahacks.io/hackathon";

    let prizeAmount = 0;
    if (item.total_prize) {
      const num = String(item.total_prize).replace(/[^0-9]/g, "");
      if (num) prizeAmount = parseInt(num, 10);
    }

    const tracks = Array.isArray(item.tracks) ? item.tracks.map((t) => typeof t === "string" ? t : t.name) : ["Web3", "AI"];

    return {
      platform: PLATFORM_NAME,
      externalId: String(item.id || slug || Math.random()),
      externalUrl: externalUrl,
      title: item.title || item.name || "DoraHacks Hackathon",
      shortDescription: item.summary || item.description || "",
      description: item.description || item.summary || item.title || "",
      organizerName: item.organizer?.name || item.brand_name || "DoraHacks Partner",
      organizerLogo: item.organizer?.avatar || item.brand_logo || "",
      registrationUrl: externalUrl,
      image: item.cover || item.banner || "",
      mode: "Online",
      venue: "Online",
      prizeAmount: prizeAmount,
      prizeCurrency: item.currency || "USD",
      prizeDescription: item.total_prize ? `${item.total_prize}` : "",
      themes: tracks,
      skills: ["Smart Contracts", "AI", "Blockchain"],
      startDate: item.start_time ? new Date(item.start_time) : item.created_at ? new Date(item.created_at) : null,
      endDate: item.end_time ? new Date(item.end_time) : null,
      registrationDeadline: item.deadline ? new Date(item.deadline) : item.end_time ? new Date(item.end_time) : null,
      raw: item,
    };
  });
}

module.exports = {
  platform: PLATFORM_NAME,
  fetchHackathons,
};
