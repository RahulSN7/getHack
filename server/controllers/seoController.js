// server/controllers/seoController.js — Dynamic XML Sitemap & Robots.txt Controller

const Hackathon = require("../models/hackathon");

const DEFAULT_SITE_URL = "https://gethack-tau.vercel.app";

function getBaseUrl() {
  let url = process.env.SITE_URL || process.env.CLIENT_URL;
  if (url && typeof url === "string") {
    url = url.trim().replace(/\/$/, "");
    const isLocalhost = /^http:\/\/localhost/i.test(url) || /^http:\/\/127\.0\.0\.1/i.test(url);
    const isObsoleteDomain = /^https?:\/\/(www\.)?gethack\.com$/i.test(url);
    if (!isLocalhost && !isObsoleteDomain) {
      return url;
    }
  }
  return DEFAULT_SITE_URL;
}

function escapeXml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * GET /sitemap.xml
 * Dynamically generates standard XML sitemap containing public static pages and all public hackathons.
 */
async function getSitemapXml(req, res) {
  try {
    const baseUrl = getBaseUrl();
    const staticPages = [
      { path: "", priority: "1.0", changefreq: "daily" },
      { path: "/hackathons", priority: "0.9", changefreq: "daily" },
      { path: "/teammates", priority: "0.8", changefreq: "daily" },
    ];

    let hackathons = [];
    try {
      hackathons = await Hackathon.find({}, "_id updatedAt createdAt").lean();
    } catch (err) {
      console.error("Error fetching hackathons for sitemap:", err.message);
    }

    const xmlUrls = [];

    // Static public pages
    for (const page of staticPages) {
      const pageUrl = `${baseUrl}${page.path}`;
      xmlUrls.push(`  <url>
    <loc>${escapeXml(pageUrl)}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`);
    }

    // Dynamic public hackathon pages
    for (const h of hackathons) {
      const hId = h._id ? h._id.toString() : h.id;
      if (!hId) continue;
      const hUrl = `${baseUrl}/hackathons/${hId}`;
      const lastModDate = h.updatedAt || h.createdAt;
      const lastModXml = lastModDate
        ? `\n    <lastmod>${new Date(lastModDate).toISOString()}</lastmod>`
        : "";

      xmlUrls.push(`  <url>
    <loc>${escapeXml(hUrl)}</loc>${lastModXml}
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
    }

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlUrls.join("\n")}
</urlset>`;

    res.header("Content-Type", "application/xml; charset=utf-8");
    return res.status(200).send(xmlContent);
  } catch (error) {
    console.error("Failed to generate sitemap.xml:", error);
    return res.status(500).send("<?xml version=\"1.0\" encoding=\"UTF-8\"?><error>Failed to generate sitemap</error>");
  }
}

/**
 * GET /robots.txt
 * Serves plain text robots.txt file with crawl rules and sitemap link.
 */
function getRobotsTxt(req, res) {
  const baseUrl = getBaseUrl();
  const robotsTxt = `User-agent: *
Allow: /
Allow: /hackathons
Allow: /teammates

# Disallow private and authenticated application routes
Disallow: /api/
Disallow: /messages
Disallow: /network
Disallow: /create-team
Disallow: /team/
Disallow: /profile
Disallow: /organizer
Disallow: /login
Disallow: /signup
Disallow: /forgot-password

Sitemap: ${baseUrl}/sitemap.xml
`;

  res.header("Content-Type", "text/plain; charset=utf-8");
  return res.status(200).send(robotsTxt);
}

module.exports = {
  getSitemapXml,
  getRobotsTxt,
};
