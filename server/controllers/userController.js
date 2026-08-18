// ---------------------------------------------------------------------------
// server/controllers/userController.js — User & Organizer Profile Controllers
// ---------------------------------------------------------------------------

const User = require("../models/user");
const Hackathon = require("../models/hackathon");

// Helper to format date cleanly (e.g. "Mar 2026")
function formatMonthYear(date) {
  if (!date) return "N/A";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "N/A";
    return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(d);
  } catch {
    return "N/A";
  }
}

// ---------------------------------------------------------------------------
// GET /api/users/organizer/:id — Fetch Organizer Profile (Public or Owner)
// ---------------------------------------------------------------------------
const getOrganizerProfile = async (req, res) => {
  try {
    let { id } = req.params;

    // Handle 'me' target for logged in user
    if (id === "me") {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthenticated." });
      }
      id = req.user._id.toString();
    }

    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(404).json({ message: "Organizer profile not found." });
    }

    const organizer = await User.findById(id);

    if (!organizer || organizer.role !== "organizer") {
      return res.status(404).json({ message: "Organizer profile not found." });
    }

    const isOwner = req.user && req.user._id.toString() === organizer._id.toString();
    const now = new Date();

    // Calculate real MongoDB statistics
    const totalHackathons = await Hackathon.countDocuments({ organizer: organizer._id });
    const completedCount = await Hackathon.countDocuments({
      organizer: organizer._id,
      endDate: { $lt: now },
    });
    const upcomingCount = await Hackathon.countDocuments({
      organizer: organizer._id,
      endDate: { $gte: now },
    });

    // Fetch hackathons created by this organizer
    const rawHackathons = await Hackathon.find({ organizer: organizer._id }).sort({ createdAt: -1 });

    const hackathons = rawHackathons.map((h) => ({
      id: h._id.toString(),
      _id: h._id.toString(),
      title: h.title,
      name: h.title,
      description: h.description,
      shortDescription: h.shortDescription || h.description,
      organizerName: h.organizerName || organizer.name,
      registrationOpens: h.registrationOpens,
      registrationDeadline: h.registrationDeadline,
      startDate: h.startDate,
      endDate: h.endDate,
      format: h.format,
      mode: h.format,
      location: h.location,
      registrationUrl: h.registrationUrl,
      skills: h.skills,
      themes: h.themes,
      eligibility: h.eligibility,
      minTeamSize: h.minTeamSize,
      maxTeamSize: h.maxTeamSize,
      prizes: h.prizes,
      prizePool: h.prizes,
      rules: h.rules,
      contact: h.contact,
      fee: h.fee,
      status: new Date(h.endDate) < now ? "Completed" : new Date(h.registrationDeadline) >= now ? "Active" : "Upcoming",
    }));

    const safeUser = organizer.toSafeUser();

    // Build safe public profile representation
    const profileData = {
      id: safeUser.id,
      _id: safeUser.id,
      name: safeUser.name,
      role: safeUser.role,
      handle: safeUser.profile?.handle || `@${safeUser.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
      avatar: safeUser.profile?.avatar || "",
      bio: safeUser.profile?.bio || "",
      location: safeUser.profile?.location || "",
      organizationName: safeUser.profile?.organizationName || safeUser.name,
      organizationType: safeUser.profile?.organizationType || "Student Club",
      organizationDescription: safeUser.profile?.organizationDescription || "",
      website: safeUser.profile?.website || "",
      github: safeUser.profile?.github || "",
      linkedin: safeUser.profile?.linkedin || "",
      twitter: safeUser.profile?.twitter || "",
      instagram: safeUser.profile?.instagram || "",
      discord: safeUser.profile?.discord || "",
      contactNumber: safeUser.profile?.contactNumber || "",
      isVerified: Boolean(safeUser.profile?.isVerified),
      createdAt: safeUser.createdAt,
      joinedDate: formatMonthYear(safeUser.createdAt),
      // Include email only if requested by the profile owner
      email: isOwner ? safeUser.email : undefined,
    };

    const stats = {
      totalHackathons,
      completedCount,
      upcomingCount,
      joinedDate: formatMonthYear(safeUser.createdAt),
    };

    return res.status(200).json({
      profile: profileData,
      stats,
      hackathons,
      isOwner,
    });
  } catch (error) {
    console.error("Error in getOrganizerProfile:", error);
    return res.status(500).json({ message: "Unable to load organizer profile." });
  }
};

// ---------------------------------------------------------------------------
// PUT /api/users/profile — Update Logged-in Organizer Profile
// ---------------------------------------------------------------------------
const updateOwnOrganizerProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthenticated." });
    }

    if (req.user.role !== "organizer") {
      return res.status(403).json({ message: "Forbidden. Organizer profile updates only." });
    }

    const {
      name,
      avatar,
      bio,
      location,
      organizationName,
      organizationType,
      organizationDescription,
      website,
      github,
      linkedin,
      twitter,
      instagram,
      discord,
      contactNumber,
      handle,
    } = req.body || {};

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User account not found." });
    }

    if (name && typeof name === "string" && name.trim()) {
      user.name = name.trim();
    }

    // Preserve existing profile properties and safely set editable fields
    const currentProfile = user.profile || {};

    user.profile = {
      ...currentProfile,
      avatar: avatar !== undefined ? String(avatar).trim() : currentProfile.avatar || "",
      bio: bio !== undefined ? String(bio).trim() : currentProfile.bio || "",
      location: location !== undefined ? String(location).trim() : currentProfile.location || "",
      organizationName: organizationName !== undefined ? String(organizationName).trim() : currentProfile.organizationName || "",
      organizationType: organizationType !== undefined ? String(organizationType).trim() : currentProfile.organizationType || "Student Club",
      organizationDescription: organizationDescription !== undefined ? String(organizationDescription).trim() : currentProfile.organizationDescription || "",
      website: website !== undefined ? String(website).trim() : currentProfile.website || "",
      github: github !== undefined ? String(github).trim() : currentProfile.github || "",
      linkedin: linkedin !== undefined ? String(linkedin).trim() : currentProfile.linkedin || "",
      twitter: twitter !== undefined ? String(twitter).trim() : currentProfile.twitter || "",
      instagram: instagram !== undefined ? String(instagram).trim() : currentProfile.instagram || "",
      discord: discord !== undefined ? String(discord).trim() : currentProfile.discord || "",
      contactNumber: contactNumber !== undefined ? String(contactNumber).trim() : currentProfile.contactNumber || "",
      handle: handle !== undefined ? String(handle).trim() : currentProfile.handle || "",
      // Explicitly preserve backend-controlled verification status
      isVerified: currentProfile.isVerified || false,
    };

    await user.save();

    return res.status(200).json({
      message: "Profile updated successfully.",
      user: user.toSafeUser(),
    });
  } catch (error) {
    console.error("Error in updateOwnOrganizerProfile:", error);
    return res.status(500).json({ message: "Failed to update profile." });
  }
};

module.exports = {
  getOrganizerProfile,
  updateOwnOrganizerProfile,
};
