// ---------------------------------------------------------------------------
// server/adapters/devfolioAdapter.js
// Adapter for fetching live hackathons from Devfolio
// ---------------------------------------------------------------------------

const PLATFORM_NAME = "devfolio";

/**
 * Fetch hackathons from Devfolio API & web public endpoints
 * @returns {Promise<Array<Object>>} Normalized raw platform hackathon objects
 */
async function fetchHackathons() {
  let rawItems = [];

  try {
    const response = await fetch("https://api.devfolio.co/api/search/hackathons", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({ query: "", filter: {} }),
    });

    if (response.ok) {
      const data = await response.json();
      const list = data.result || data.hackathons || data.hits || [];
      if (Array.isArray(list)) rawItems = list;
    }
  } catch {
    // Try fallback HTML parsing from Devfolio hackathons page
  }

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    try {
      const pageRes = await fetch("https://devfolio.co/hackathons", {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (pageRes.ok) {
        const html = await pageRes.text();
        const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/i);
        if (nextDataMatch) {
          const nextData = JSON.parse(nextDataMatch[1]);
          const pageProps = nextData.props?.pageProps;
          const list = pageProps?.hackathons || pageProps?.openHackathons || pageProps?.dehydratedState?.queries?.[0]?.state?.data?.result || [];
          if (Array.isArray(list)) rawItems = list;
        }
      }
    } catch (e) {
      console.warn(`[Devfolio Adapter] Fallback page fetch warning: ${e.message}`);
    }
  }

  if (!Array.isArray(rawItems)) rawItems = [];

  return rawItems.map((item) => {
    const slug = item.slug || item.id || "";
    const externalUrl = item.web_page_url || (slug ? `https://${slug}.devfolio.co` : "https://devfolio.co/hackathons");
    
    return {
      platform: PLATFORM_NAME,
      externalId: String(item.id || slug || Math.random()),
      externalUrl: externalUrl,
      title: item.name || item.title || "Devfolio Hackathon",
      shortDescription: item.tagline || item.desc || "",
      description: item.tagline || item.desc || item.name || "",
      organizerName: item.organisation_name || item.organizer_name || "Devfolio Organizer",
      organizerLogo: item.logo || item.cover_img || "",
      registrationUrl: externalUrl,
      image: item.cover_img || item.logo || "",
      mode: item.is_online ? "Online" : "Offline",
      venue: item.location || (item.is_online ? "Online" : "India"),
      prizeAmount: item.prizes_total_value || 0,
      prizeCurrency: "INR",
      prizeDescription: item.prizes_total_value ? `₹${item.prizes_total_value}` : "",
      themes: Array.isArray(item.themes) ? item.themes : item.category ? [item.category] : ["Web3", "Build"],
      skills: Array.isArray(item.skills) ? item.skills : ["Full Stack", "Blockchain"],
      startDate: item.starts_at ? new Date(item.starts_at) : item.start_date ? new Date(item.start_date) : null,
      endDate: item.ends_at ? new Date(item.ends_at) : item.end_date ? new Date(item.end_date) : null,
      registrationDeadline: item.reg_ends_at ? new Date(item.reg_ends_at) : item.ends_at ? new Date(item.ends_at) : null,
      raw: item,
    };
  });
}

module.exports = {
  platform: PLATFORM_NAME,
  fetchHackathons,
};
