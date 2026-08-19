// ---------------------------------------------------------------------------
// server/adapters/mlhAdapter.js
// Adapter for fetching live hackathons from Major League Hacking (MLH)
// ---------------------------------------------------------------------------

const PLATFORM_NAME = "mlh";

/**
 * Fetch hackathons from MLH public events feed
 * @returns {Promise<Array<Object>>} Normalized raw platform hackathon objects
 */
async function fetchHackathons() {
  const years = [new Date().getFullYear(), new Date().getFullYear() - 1, 2025, 2026];
  let events = [];

  for (const year of years) {
    try {
      const url = `https://mlh.io/seasons/${year}/events`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (response.ok) {
        const html = await response.text();
        const parsed = parseMlhEvents(html);
        if (parsed.length > 0) {
          events = parsed;
          break;
        }
      }
    } catch {
      // Continue to next year
    }
  }

  return events;
}

function parseMlhEvents(html) {
  const events = [];

  // Match MLH event cards: <div class="event"> ... </div>
  const eventBlockRegex = /<div[^>]*class="[^"]*event[^"]*"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi;
  
  // Extract JSON-LD if present
  const jsonLdRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  let jsonLdMatch;
  while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(jsonLdMatch[1]);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of list) {
        if (item["@type"] === "Event" || item["@type"] === "Hackathon") {
          events.push({
            platform: PLATFORM_NAME,
            externalId: String(item.url || item.name || Math.random()),
            externalUrl: item.url || "https://mlh.io/events",
            title: item.name || "MLH Hackathon",
            shortDescription: item.description || "Official Major League Hacking Event",
            description: item.description || item.name || "",
            organizerName: item.organizer?.name || "Major League Hacking",
            organizerLogo: item.image || "https://mlh.io/assets/mlh-trust-badge-2024-white.svg",
            registrationUrl: item.url || "https://mlh.io/events",
            image: item.image || "",
            mode: item.location?.name?.toLowerCase().includes("digital") || item.location?.name?.toLowerCase().includes("online") ? "Online" : "Offline",
            venue: item.location?.name || item.location?.address?.addressLocality || "Global Venue",
            prizeAmount: 0,
            prizeCurrency: "USD",
            prizeDescription: "MLH Swag & Trophies",
            themes: ["Student", "General"],
            skills: ["Coding", "Design"],
            startDate: item.startDate ? new Date(item.startDate) : null,
            endDate: item.endDate ? new Date(item.endDate) : null,
            registrationDeadline: item.startDate ? new Date(item.startDate) : null,
            raw: item,
          });
        }
      }
    } catch {
      // ignore
    }
  }

  if (events.length > 0) return events;

  // Regex parser for MLH event cards HTML elements
  const cardRegex = /<a[^>]*href="(https:\/\/mlh\.io\/events\/[^"]+|\S+mlh\.io[^"]*)"[^>]*>[\s\S]*?<h3[^>]*class="[^"]*event-name[^"]*"[^>]*>(.*?)<\/h3>[\s\S]*?<p[^>]*class="[^"]*event-dates[^"]*"[^>]*>(.*?)<\/p>/gi;
  let match;
  while ((match = cardRegex.exec(html)) !== null) {
    const url = match[1];
    const name = match[2].replace(/<[^>]+>/g, "").trim();
    const dates = match[3].replace(/<[^>]+>/g, "").trim();

    if (name) {
      events.push({
        platform: PLATFORM_NAME,
        externalId: String(url),
        externalUrl: url,
        title: name,
        shortDescription: `Official MLH Hackathon (${dates})`,
        description: `Join ${name}, an official Major League Hacking event! Dates: ${dates}`,
        organizerName: "Major League Hacking",
        organizerLogo: "https://mlh.io/assets/mlh-trust-badge-2024-white.svg",
        registrationUrl: url,
        image: "",
        mode: name.toLowerCase().includes("digital") ? "Online" : "Offline",
        venue: dates || "Global Venue",
        prizeAmount: 0,
        prizeCurrency: "USD",
        prizeDescription: "MLH Trophies & Category Prizes",
        themes: ["Student"],
        skills: ["Programming"],
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000 * 3),
        registrationDeadline: new Date(Date.now() + 86400000 * 2),
        raw: { name, url, dates },
      });
    }
  }

  return events;
}

module.exports = {
  platform: PLATFORM_NAME,
  fetchHackathons,
};
