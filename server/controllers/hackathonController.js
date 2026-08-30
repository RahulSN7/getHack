// ---------------------------------------------------------------------------
// server/controllers/hackathonController.js — Hackathon API Controller
// Handles multi-platform aggregated hackathon querying, pagination, search, filters,
// user hackathon creation, and admin manual sync triggers.
// ---------------------------------------------------------------------------

const mongoose = require("mongoose");
const Hackathon = require("../models/hackathon");
const { runSyncTask } = require("../jobs/hackathonSyncJob");

// Helper to validate URL format
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// GET /api/hackathons — Get All Hackathons (Paginated, Filtered, Sorted)
// ---------------------------------------------------------------------------
const getPublicHackathons = async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: "Database connection unavailable. Please check your MongoDB connection.",
      data: [],
      hackathons: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
    });
  }

  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const { search, status, platform, mode, theme, skill, sort } = req.query;

    const query = {};

    // 1. Platform filter
    if (platform && platform !== "all") {
      query["source.platform"] = platform.toLowerCase();
    }

    // 2. Mode filter
    if (mode && mode !== "all") {
      if (mode.toLowerCase() === "online") {
        query.$or = [{ format: "Online" }, { "event.mode": "Online" }];
      } else if (mode.toLowerCase() === "offline") {
        query.$or = [{ format: "Offline" }, { format: "Hybrid" }, { "event.mode": "Offline" }, { "event.mode": "Hybrid" }];
      }
    }

    // 3. Theme & Skill filters
    if (theme) {
      query.themes = { $in: [new RegExp(theme, "i")] };
    }
    if (skill) {
      query.skills = { $in: [new RegExp(skill, "i")] };
    }

    // 4. Search query
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: searchRegex },
          { organizerName: searchRegex },
          { "organizer.name": searchRegex },
          { description: searchRegex },
          { shortDescription: searchRegex },
          { themes: searchRegex },
          { skills: searchRegex },
        ],
      });
    }

    // 5. Status filter (Date-calculated)
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Filter out expired hackathons (expiresAt <= current time)
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { expiresAt: { $gt: now } },
        {
          $and: [
            { expiresAt: { $exists: false } },
            {
              $or: [
                { registrationDeadline: { $gt: twentyFourHoursAgo } },
                { "registration.deadline": { $gt: twentyFourHoursAgo } },
                { registrationDeadline: { $exists: false } },
                { registrationDeadline: null },
              ],
            },
          ],
        },
      ],
    });

    if (status && status !== "all") {
      const s = status.toLowerCase();
      if (s === "upcoming") {
        query.registrationOpens = { $gt: now };
      } else if (s === "registration-open" || s === "open") {
        query.registrationDeadline = { $gte: now };
      } else if (s === "registration-closed" || s === "closed") {
        query.registrationDeadline = { $lt: now };
        query.startDate = { $gt: now };
      } else if (s === "live" || s === "active") {
        query.startDate = { $lte: now };
        query.endDate = { $gte: now };
      } else if (s === "completed") {
        query.endDate = { $lt: now };
      }
    }

    // 6. Sorting
    let sortOptions = { createdAt: -1 };
    if (sort) {
      switch (sort) {
        case "deadline":
        case "deadline-asc":
          sortOptions = { registrationDeadline: 1 };
          break;
        case "deadline-desc":
          sortOptions = { registrationDeadline: -1 };
          break;
        case "newest":
          sortOptions = { createdAt: -1 };
          break;
        case "prize":
        case "prize-desc":
          sortOptions = { "prizePool.amount": -1, createdAt: -1 };
          break;
        case "startDate":
        case "startDate-asc":
          sortOptions = { startDate: 1 };
          break;
        default:
          sortOptions = { createdAt: -1 };
      }
    }

    const total = await Hackathon.countDocuments(query);
    const hackathons = await Hackathon.find(query)
      .populate("organizer.ref", "name email")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    const formattedData = hackathons.map((h) => h.toJSON());

    return res.json({
      success: true,
      data: formattedData,
      hackathons: formattedData, // backward compatibility
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error("Error fetching public hackathons:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch hackathons.",
    });
  }
};

// ---------------------------------------------------------------------------
// GET /api/hackathons/upcoming — Get Upcoming Hackathons
// ---------------------------------------------------------------------------
const getUpcomingHackathons = async (req, res) => {
  req.query.status = "upcoming";
  return getPublicHackathons(req, res);
};

// ---------------------------------------------------------------------------
// GET /api/hackathons/active — Get Currently Active/Live Hackathons
// ---------------------------------------------------------------------------
const getActiveHackathons = async (req, res) => {
  req.query.status = "live";
  return getPublicHackathons(req, res);
};

// ---------------------------------------------------------------------------
// GET /api/hackathons/registration-open — Get Registration Open Hackathons
// ---------------------------------------------------------------------------
const getRegistrationOpenHackathons = async (req, res) => {
  req.query.status = "registration-open";
  return getPublicHackathons(req, res);
};

// ---------------------------------------------------------------------------
// GET /api/hackathons/:id — Get Single Hackathon by ID or Slug
// ---------------------------------------------------------------------------
const getHackathonById = async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ success: false, message: "Database connection unavailable." });
  }

  try {
    const { id } = req.params;
    let hackathon;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      hackathon = await Hackathon.findById(id).populate("organizer.ref", "name email");
    } else {
      hackathon = await Hackathon.findOne({ slug: id }).populate("organizer.ref", "name email");
    }

    if (!hackathon) {
      return res.status(404).json({ success: false, message: "Hackathon not found." });
    }

    const now = new Date();
    const regDeadline = hackathon.registrationDeadline || hackathon.registration?.deadline;
    const expiresAt = hackathon.expiresAt || (regDeadline ? new Date(new Date(regDeadline).getTime() + 24 * 60 * 60 * 1000) : null);

    if (expiresAt && new Date(expiresAt) <= now) {
      return res.status(404).json({ success: false, message: "Hackathon has expired and is no longer available." });
    }

    const json = hackathon.toJSON();
    return res.json({
      success: true,
      data: json,
      hackathon: json, // backward compatibility
    });
  } catch (error) {
    console.error("Error fetching hackathon by ID:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch hackathon details." });
  }
};

// ---------------------------------------------------------------------------
// POST /api/hackathons — Add Hackathon (Organizer Only)
// ---------------------------------------------------------------------------
const createHackathon = async (req, res) => {
  try {
    const {
      title,
      name,
      shortDescription,
      description,
      organizerName,
      registrationOpens,
      registrationDeadline,
      startDate,
      endDate,
      format,
      location,
      registrationUrl,
      skills,
      themes,
      eligibility,
      minTeamSize,
      maxTeamSize,
      prizes,
      rules,
      contact,
      fee,
      hostedOn,
    } = req.body;

    const hackathonTitle = title || name;

    if (!hackathonTitle || !description || !registrationDeadline || !startDate || !endDate || !registrationUrl) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing. Title, description, dates, and registration link are required.",
      });
    }

    if (!isValidUrl(registrationUrl)) {
      return res.status(400).json({
        success: false,
        message: "Invalid registration link URL. Please enter a valid URL starting with http:// or https://",
      });
    }

    const regDeadline = new Date(registrationDeadline);
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(regDeadline.getTime()) || isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid date format provided." });
    }

    const newHackathon = new Hackathon({
      title: hackathonTitle,
      shortDescription: shortDescription || "",
      description,
      organizerName: organizerName || req.user.name || "Organizer",
      organizer: {
        name: organizerName || req.user.name || "Organizer",
        ref: req.user._id,
      },
      source: {
        platform: "gethack",
        externalId: req.user._id.toString(),
        externalUrl: registrationUrl,
      },
      registrationOpens: registrationOpens ? new Date(registrationOpens) : undefined,
      registrationDeadline: regDeadline,
      startDate: start,
      endDate: end,
      format: format || "Online",
      location: format === "Online" ? { venue: "Online", city: "", country: "" } : (location || {}),
      registrationUrl,
      skills: Array.isArray(skills) ? skills : typeof skills === "string" ? skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
      themes: Array.isArray(themes) ? themes : [],
      eligibility: eligibility || "Open to all",
      minTeamSize: minTeamSize ? Number(minTeamSize) : 1,
      maxTeamSize: maxTeamSize ? Number(maxTeamSize) : 4,
      prizes: prizes || "",
      rules: rules || "",
      contact: contact || "",
      fee: fee || "Free",
      hostedOn: hostedOn ? hostedOn.trim() : "",
    });

    const savedHackathon = await newHackathon.save();
    return res.status(201).json({
      success: true,
      message: "Hackathon created successfully",
      data: savedHackathon.toJSON(),
      hackathon: savedHackathon.toJSON(),
    });
  } catch (error) {
    console.error("Error adding hackathon:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to add hackathon.",
    });
  }
};

// ---------------------------------------------------------------------------
// GET /api/hackathons/my — Get My Organized Hackathons (Organizer Only)
// ---------------------------------------------------------------------------
const getMyHackathons = async (req, res) => {
  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const query = {
      "organizer.ref": req.user._id,
      $or: [
        { expiresAt: { $gt: now } },
        {
          $and: [
            { expiresAt: { $exists: false } },
            {
              $or: [
                { registrationDeadline: { $gt: twentyFourHoursAgo } },
                { "registration.deadline": { $gt: twentyFourHoursAgo } },
                { registrationDeadline: { $exists: false } },
                { registrationDeadline: null },
              ],
            },
          ],
        },
      ],
    };

    const rawHackathons = await Hackathon.find(query).sort({ createdAt: -1 });

    // Deduplicate by string ID
    const seenIds = new Set();
    const uniqueHackathons = [];
    for (const h of rawHackathons) {
      const idStr = h._id ? h._id.toString() : h.id;
      if (idStr && !seenIds.has(idStr)) {
        seenIds.add(idStr);
        uniqueHackathons.push(h);
      }
    }

    let upcomingCount = 0;
    let openCount = 0;
    let closedCount = 0;

    for (const h of uniqueHackathons) {
      const regOpensRaw = h.registrationOpens || h.registration?.startDate;
      const regDeadlineRaw = h.registrationDeadline || h.registration?.deadline;

      let isUpcoming = false;
      if (regOpensRaw) {
        const regOpensDate = new Date(regOpensRaw);
        if (!isNaN(regOpensDate.getTime()) && regOpensDate > now) {
          isUpcoming = true;
        }
      }

      if (isUpcoming) {
        upcomingCount++;
      } else if (regDeadlineRaw) {
        const regDeadlineDate = new Date(regDeadlineRaw);
        if (!isNaN(regDeadlineDate.getTime()) && regDeadlineDate < now) {
          closedCount++;
        } else {
          openCount++;
        }
      } else {
        openCount++;
      }
    }

    const formattedData = uniqueHackathons.map((h) => h.toJSON());

    return res.json({
      success: true,
      data: formattedData,
      hackathons: formattedData,
      stats: {
        total: formattedData.length,
        upcoming: upcomingCount,
        open: openCount,
        closed: closedCount,
      },
    });
  } catch (error) {
    console.error("Error fetching organizer hackathons:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch your hackathons." });
  }
};

// ---------------------------------------------------------------------------
// GET /api/hackathons/organizer/:id — Get Organizer Hackathon by ID (Owner Only)
// ---------------------------------------------------------------------------
const getOrganizerHackathonById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(404).json({ success: false, message: "Hackathon not found." });
    }

    const hackathon = await Hackathon.findById(id).populate("organizer.ref", "name email");

    if (!hackathon) {
      return res.status(404).json({ success: false, message: "Hackathon not found." });
    }

    const orgId = hackathon.organizer?.ref?._id?.toString() || hackathon.organizer?.ref?.toString();
    if (orgId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view this hackathon.",
      });
    }

    return res.json({ success: true, data: hackathon.toJSON(), hackathon: hackathon.toJSON() });
  } catch (error) {
    console.error("Error fetching organizer hackathon by ID:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch hackathon details." });
  }
};

// ---------------------------------------------------------------------------
// PUT /api/hackathons/:id — Update Hackathon (Organizer + Owner Only)
// ---------------------------------------------------------------------------
const updateHackathon = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(404).json({ success: false, message: "Hackathon not found." });
    }

    const hackathon = await Hackathon.findById(id);

    if (!hackathon) {
      return res.status(404).json({ success: false, message: "Hackathon not found." });
    }

    const orgId = hackathon.organizer?.ref?.toString();
    if (orgId && orgId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Forbidden. You are not authorized to update this hackathon.",
      });
    }

    Object.assign(hackathon, req.body);

    // Explicitly sync nested date & event structures if date strings are provided in payload
    if (req.body.startDate) {
      const sDate = new Date(req.body.startDate);
      if (!isNaN(sDate.getTime())) {
        hackathon.startDate = sDate;
        if (!hackathon.event) hackathon.event = {};
        hackathon.event.startDate = sDate;
      }
    }
    if (req.body.endDate) {
      const eDate = new Date(req.body.endDate);
      if (!isNaN(eDate.getTime())) {
        hackathon.endDate = eDate;
        if (!hackathon.event) hackathon.event = {};
        hackathon.event.endDate = eDate;
      }
    }
    if (req.body.registrationOpens) {
      const roDate = new Date(req.body.registrationOpens);
      if (!isNaN(roDate.getTime())) {
        hackathon.registrationOpens = roDate;
        if (!hackathon.registration) hackathon.registration = {};
        hackathon.registration.startDate = roDate;
      }
    }
    if (req.body.registrationDeadline) {
      const rdDate = new Date(req.body.registrationDeadline);
      if (!isNaN(rdDate.getTime())) {
        hackathon.registrationDeadline = rdDate;
        if (!hackathon.registration) hackathon.registration = {};
        hackathon.registration.deadline = rdDate;
      }
    }

    const updated = await hackathon.save();
    return res.json({
      success: true,
      message: "Hackathon updated successfully",
      data: updated.toJSON(),
      hackathon: updated.toJSON(),
    });
  } catch (error) {
    console.error("Error updating hackathon:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to update hackathon." });
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/hackathons/:id — Delete Hackathon (Organizer + Owner Only)
// ---------------------------------------------------------------------------
const deleteHackathon = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(404).json({ success: false, message: "Hackathon not found." });
    }

    const hackathon = await Hackathon.findById(id);

    if (!hackathon) {
      return res.status(404).json({ success: false, message: "Hackathon not found." });
    }

    const orgId = hackathon.organizer?.ref?.toString();
    if (orgId && orgId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Forbidden. You are not authorized to delete this hackathon.",
      });
    }

    await Hackathon.findByIdAndDelete(id);

    return res.json({ success: true, message: "Hackathon deleted successfully", id });
  } catch (error) {
    console.error("Error deleting hackathon:", error);
    return res.status(500).json({ success: false, message: "Failed to delete hackathon." });
  }
};

// ---------------------------------------------------------------------------
// POST /api/admin/hackathons/sync — Manual Trigger for Synchronization
// ---------------------------------------------------------------------------
const triggerSync = async (req, res) => {
  try {
    console.log("[Admin Sync] Manual sync requested via API");
    // Trigger sync task asynchronously so endpoint returns status immediately or awaits sync result
    runSyncTask();

    return res.json({
      success: true,
      message: "Hackathon multi-platform synchronization started in the background.",
    });
  } catch (error) {
    console.error("Error triggering hackathon sync:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to initiate sync.",
    });
  }
};

module.exports = {
  createHackathon,
  getPublicHackathons,
  getUpcomingHackathons,
  getActiveHackathons,
  getRegistrationOpenHackathons,
  getMyHackathons,
  getHackathonById,
  getOrganizerHackathonById,
  updateHackathon,
  deleteHackathon,
  triggerSync,
};
