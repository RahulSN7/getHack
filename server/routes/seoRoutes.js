// server/routes/seoRoutes.js — Routes for sitemap.xml and robots.txt

const express = require("express");
const router = express.Router();
const { getSitemapXml, getRobotsTxt } = require("../controllers/seoController");

router.get("/sitemap.xml", getSitemapXml);
router.get("/robots.txt", getRobotsTxt);

module.exports = router;
