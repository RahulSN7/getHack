// ---------------------------------------------------------------------------
// server/controllers/hackathonController.js — Hackathon API Controller
// Enforces server-side authentication, role authorization, and ownership checks.
// ---------------------------------------------------------------------------

const Hackathon = require("../models/hackathon");

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
    } = req.body;

    const hackathonTitle = title || name;

    if (!hackathonTitle || !description || !registrationDeadline || !startDate || !endDate || !registrationUrl) {
      return res.status(400).json({
        message: "Required fields missing. Title, description, dates, and registration link are required.",
      });
    }

    if (!isValidUrl(registrationUrl)) {
      return res.status(400).json({
        message: "Invalid registration link URL. Please enter a valid URL starting with http:// or https://",
      });
    }

    // Validate date relationships
    const regDeadline = new Date(registrationDeadline);
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(regDeadline.getTime()) || isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "Invalid date format provided." });
    }

    if (registrationOpens) {
      const regOpens = new Date(registrationOpens);
      if (!isNaN(regOpens.getTime()) && regOpens > regDeadline) {
        return res.status(400).json({
          message: "Registration opening date cannot be after registration deadline.",
        });
      }
    }

    if (regDeadline > start) {
      return res.status(400).json({
        message: "Registration deadline cannot be after hackathon start date.",
      });
    }

    if (start > end) {
      return res.status(400).json({
        message: "Hackathon start date cannot be after end date.",
      });
    }

    const newHackathon = new Hackathon({
      title: hackathonTitle,
      shortDescription: shortDescription || "",
      description,
      organizerName: organizerName || req.user.name || "Organizer",
      organizer: req.user._id,
      registrationOpens: registrationOpens ? new Date(registrationOpens) : undefined,
      registrationDeadline: regDeadline,
      startDate: start,
      endDate: end,
      format: format || "Online",
      location: format === "Online" ? { venue: "", city: "", country: "" } : (location || {}),
      registrationUrl,
      skills: Array.isArray(skills) ? skills : typeof skills === "string" ? skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
      themes: Array.isArray(themes) ? themes : typeof themes === "string" ? themes.split(",").map((t) => t.trim()).filter(Boolean) : [],
      eligibility: eligibility || "",
      minTeamSize: minTeamSize ? Number(minTeamSize) : 1,
      maxTeamSize: maxTeamSize ? Number(maxTeamSize) : 4,
      prizes: prizes || "",
      rules: rules || "",
      contact: contact || "",
      fee: fee || "Free",
    });

    const savedHackathon = await newHackathon.save();
    return res.status(201).json({
      message: "Hackathon created successfully",
      hackathon: savedHackathon.toJSON(),
    });
  } catch (error) {
    console.error("Error adding hackathon:", error);
    return res.status(500).json({
      message: error.message || "Failed to add hackathon.",
    });
  }
};

// ---------------------------------------------------------------------------
// GET /api/hackathons — Get All Public Hackathons
// ---------------------------------------------------------------------------
const getPublicHackathons = async (req, res) => {
  try {
    const hackathons = await Hackathon.find()
      .populate("organizer", "name email")
      .sort({ createdAt: -1 });

    return res.json({
      hackathons: hackathons.map((h) => h.toJSON()),
    });
  } catch (error) {
    console.error("Error fetching public hackathons:", error);
    return res.status(500).json({ message: "Failed to fetch hackathons." });
  }
};

// ---------------------------------------------------------------------------
// GET /api/hackathons/my — Get My Organized Hackathons (Organizer Only)
// ---------------------------------------------------------------------------
const getMyHackathons = async (req, res) => {
  try {
    const hackathons = await Hackathon.find({ organizer: req.user._id }).sort({ createdAt: -1 });

    return res.json({
      hackathons: hackathons.map((h) => h.toJSON()),
    });
  } catch (error) {
    console.error("Error fetching organizer hackathons:", error);
    return res.status(500).json({ message: "Failed to fetch your hackathons." });
  }
};

// ---------------------------------------------------------------------------
// GET /api/hackathons/:id — Get Single Hackathon by ID
// ---------------------------------------------------------------------------
const getHackathonById = async (req, res) => {
  try {
    const { id } = req.params;
    let hackathon;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      hackathon = await Hackathon.findById(id).populate("organizer", "name email");
    }

    if (!hackathon) {
      return res.status(404).json({ message: "Hackathon not found." });
    }

    return res.json({ hackathon: hackathon.toJSON() });
  } catch (error) {
    console.error("Error fetching hackathon by ID:", error);
    return res.status(500).json({ message: "Failed to fetch hackathon details." });
  }
};

// ---------------------------------------------------------------------------
// GET /api/hackathons/organizer/:id — Get Organizer Hackathon by ID (Owner Only)
// ---------------------------------------------------------------------------
const getOrganizerHackathonById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(404).json({ message: "Hackathon not found." });
    }

    const hackathon = await Hackathon.findById(id).populate("organizer", "name email");

    if (!hackathon) {
      return res.status(404).json({ message: "Hackathon not found." });
    }

    // Strict Ownership Verification
    const orgId = typeof hackathon.organizer === "object" ? hackathon.organizer._id.toString() : hackathon.organizer.toString();
    if (orgId !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You don't have permission to view this hackathon.",
      });
    }

    return res.json({ hackathon: hackathon.toJSON() });
  } catch (error) {
    console.error("Error fetching organizer hackathon by ID:", error);
    return res.status(500).json({ message: "Failed to fetch hackathon details." });
  }
};

// ---------------------------------------------------------------------------
// PUT /api/hackathons/:id — Update Hackathon (Organizer + Owner Only)
// ---------------------------------------------------------------------------
const updateHackathon = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(404).json({ message: "Hackathon not found." });
    }

    const hackathon = await Hackathon.findById(id);

    if (!hackathon) {
      return res.status(404).json({ message: "Hackathon not found." });
    }

    // Strict Ownership Check
    if (hackathon.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Forbidden. You are not authorized to update this hackathon.",
      });
    }

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
    } = req.body;

    if (registrationUrl && !isValidUrl(registrationUrl)) {
      return res.status(400).json({
        message: "Invalid registration link URL. Please enter a valid URL starting with http:// or https://",
      });
    }

    // Validate dates if updated
    const regDeadline = registrationDeadline ? new Date(registrationDeadline) : hackathon.registrationDeadline;
    const start = startDate ? new Date(startDate) : hackathon.startDate;
    const end = endDate ? new Date(endDate) : hackathon.endDate;

    if (regDeadline > start) {
      return res.status(400).json({
        message: "Registration deadline cannot be after hackathon start date.",
      });
    }

    if (start > end) {
      return res.status(400).json({
        message: "Hackathon start date cannot be after end date.",
      });
    }

    if (title || name) hackathon.title = title || name;
    if (shortDescription !== undefined) hackathon.shortDescription = shortDescription;
    if (description !== undefined) hackathon.description = description;
    if (organizerName !== undefined) hackathon.organizerName = organizerName;
    if (registrationOpens !== undefined) hackathon.registrationOpens = registrationOpens ? new Date(registrationOpens) : undefined;
    if (registrationDeadline !== undefined) hackathon.registrationDeadline = regDeadline;
    if (startDate !== undefined) hackathon.startDate = start;
    if (endDate !== undefined) hackathon.endDate = end;
    if (format !== undefined) hackathon.format = format;
    if (location !== undefined) hackathon.location = format === "Online" ? { venue: "", city: "", country: "" } : location;
    if (registrationUrl !== undefined) hackathon.registrationUrl = registrationUrl;
    if (skills !== undefined) hackathon.skills = Array.isArray(skills) ? skills : typeof skills === "string" ? skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
    if (themes !== undefined) hackathon.themes = Array.isArray(themes) ? themes : typeof themes === "string" ? themes.split(",").map((t) => t.trim()).filter(Boolean) : [];
    if (eligibility !== undefined) hackathon.eligibility = eligibility;
    if (minTeamSize !== undefined) hackathon.minTeamSize = Number(minTeamSize);
    if (maxTeamSize !== undefined) hackathon.maxTeamSize = Number(maxTeamSize);
    if (prizes !== undefined) hackathon.prizes = prizes;
    if (rules !== undefined) hackathon.rules = rules;
    if (contact !== undefined) hackathon.contact = contact;
    if (fee !== undefined) hackathon.fee = fee;

    const updated = await hackathon.save();
    return res.json({
      message: "Hackathon updated successfully",
      hackathon: updated.toJSON(),
    });
  } catch (error) {
    console.error("Error updating hackathon:", error);
    return res.status(500).json({ message: error.message || "Failed to update hackathon." });
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/hackathons/:id — Delete Hackathon (Organizer + Owner Only)
// ---------------------------------------------------------------------------
const deleteHackathon = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(404).json({ message: "Hackathon not found." });
    }

    const hackathon = await Hackathon.findById(id);

    if (!hackathon) {
      return res.status(404).json({ message: "Hackathon not found." });
    }

    // Strict Ownership Check
    if (hackathon.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Forbidden. You are not authorized to delete this hackathon.",
      });
    }

    await Hackathon.findByIdAndDelete(id);

    return res.json({ message: "Hackathon deleted successfully", id });
  } catch (error) {
    console.error("Error deleting hackathon:", error);
    return res.status(500).json({ message: "Failed to delete hackathon." });
  }
};

module.exports = {
  createHackathon,
  getPublicHackathons,
  getMyHackathons,
  getHackathonById,
  getOrganizerHackathonById,
  updateHackathon,
  deleteHackathon,
};
