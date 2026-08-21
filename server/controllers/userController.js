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

// ---------------------------------------------------------------------------
// GET /api/users/profile — Fetch Logged-in User's Own Profile & Completion
// ---------------------------------------------------------------------------
const getOwnProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthenticated." });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User account not found." });
    }

    const profileCompletion = calculateProfileCompletion(user);

    return res.status(200).json({
      user: user.toSafeUser(),
      profileCompletion,
    });
  } catch (error) {
    console.error("Error in getOwnProfile:", error);
    return res.status(500).json({ message: "Unable to load profile." });
  }
};

// ---------------------------------------------------------------------------
// PUT /api/users/profile/participant — Update Logged-in Participant Profile
// Supports FormData / file upload (profilePhoto), atomic avatar replacement,
// gender, DOB, mandatory location, and partial updates
// ---------------------------------------------------------------------------
const updateOwnParticipantProfile = async (req, res) => {
  const fs = require("fs");
  const path = require("path");

  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthenticated." });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User account not found." });
    }

    const currentProfile = user.profile || {};
    const oldAvatarPath = currentProfile.avatar;

    const body = req.body || {};

    let {
      name,
      avatar,
      gender,
      dateOfBirth,
      location,
      role,
      bio,
      availability,
      skills,
      education,
      college,
      degree,
      fieldOfStudy,
      graduationYear,
      experienceLevel,
      experienceDetails,
      interests,
      github,
      linkedin,
      portfolio,
      removePhoto,
    } = body;

    // Handle file upload via Multer if provided
    let newAvatar = currentProfile.avatar || "";
    if (req.file) {
      newAvatar = `/uploads/${req.file.filename}`;
    } else if (removePhoto === "true" || removePhoto === true) {
      newAvatar = "";
    } else if (avatar !== undefined && String(avatar).trim() !== "") {
      newAvatar = String(avatar).trim();
    }

    if (name && typeof name === "string" && name.trim()) {
      user.name = name.trim();
    }

    // Mandatory Location Validation
    let cleanLocation = location !== undefined ? String(location).trim() : currentProfile.location || "";
    if (location !== undefined && !cleanLocation) {
      // Clean up uploaded temp file if validation fails
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, () => {});
      }
      return res.status(400).json({ message: "Location is required." });
    }

    // Gender Validation
    const allowedGenders = ["Male", "Female", "Non-binary", "Prefer not to say", "Other"];
    let cleanGender = gender !== undefined ? String(gender).trim() : currentProfile.gender || "";
    if (cleanGender && !allowedGenders.includes(cleanGender)) {
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, () => {});
      }
      return res.status(400).json({ message: "Invalid gender selection." });
    }

    // Date of Birth Validation (Cannot be in the future)
    let cleanDOB = dateOfBirth !== undefined ? String(dateOfBirth).trim() : currentProfile.dateOfBirth || "";
    if (cleanDOB) {
      const dobDate = new Date(cleanDOB);
      if (isNaN(dobDate.getTime())) {
        if (req.file && req.file.path) {
          fs.unlink(req.file.path, () => {});
        }
        return res.status(400).json({ message: "Invalid Date of Birth format." });
      }
      if (dobDate > new Date()) {
        if (req.file && req.file.path) {
          fs.unlink(req.file.path, () => {});
        }
        return res.status(400).json({ message: "Date of birth cannot be in the future." });
      }
    }

    // Bio length limit (max 300 chars)
    let cleanBio = bio !== undefined ? String(bio).trim() : currentProfile.bio || "";
    if (cleanBio.length > 300) {
      cleanBio = cleanBio.slice(0, 300);
    }

    // Parse skills (handles JSON string or array)
    let cleanSkills = currentProfile.skills || [];
    if (typeof skills === "string") {
      try {
        skills = JSON.parse(skills);
      } catch {
        skills = skills.split(",").map((s) => s.trim());
      }
    }
    if (Array.isArray(skills)) {
      const seen = new Set();
      cleanSkills = [];
      for (const s of skills) {
        if (typeof s === "string" && s.trim().length > 0) {
          const item = s.trim();
          const key = item.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            cleanSkills.push(item);
          }
        }
      }
      if (cleanSkills.length > 15) {
        cleanSkills = cleanSkills.slice(0, 15);
      }
    }

    // Parse interests
    let cleanInterests = currentProfile.interests || [];
    if (typeof interests === "string") {
      try {
        interests = JSON.parse(interests);
      } catch {
        interests = interests.split(",").map((i) => i.trim());
      }
    }
    if (Array.isArray(interests)) {
      const seen = new Set();
      cleanInterests = [];
      for (const i of interests) {
        if (typeof i === "string" && i.trim().length > 0) {
          const item = i.trim();
          const key = item.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            cleanInterests.push(item);
          }
        }
      }
    }

    // Parse education
    let cleanEducation = currentProfile.education || {};
    if (typeof education === "string") {
      try {
        cleanEducation = JSON.parse(education);
      } catch {
        // fallback
      }
    } else if (typeof education === "object" && education !== null) {
      cleanEducation = education;
    }
    if (college !== undefined) cleanEducation.college = String(college).trim();
    if (degree !== undefined) cleanEducation.degree = String(degree).trim();
    if (fieldOfStudy !== undefined) cleanEducation.fieldOfStudy = String(fieldOfStudy).trim();
    if (graduationYear !== undefined) cleanEducation.graduationYear = String(graduationYear).trim();

    // Sanitize availability
    let cleanAvailability = currentProfile.availability || "Available";
    if (availability === "Available" || availability === "Not Available") {
      cleanAvailability = availability;
    }

    // Sanitize URLs
    const sanitizeUrl = (val) => {
      if (!val || typeof val !== "string") return "";
      const trimmed = val.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
      return `https://${trimmed}`;
    };

    user.profile = {
      ...currentProfile,
      avatar: newAvatar,
      gender: cleanGender,
      dateOfBirth: cleanDOB,
      location: cleanLocation,
      role: role !== undefined ? String(role).trim() : currentProfile.role || "Participant",
      bio: cleanBio,
      availability: cleanAvailability,
      skills: cleanSkills,
      education: cleanEducation,
      college: cleanEducation.college || currentProfile.college || "",
      degree: cleanEducation.degree || currentProfile.degree || "",
      experienceLevel: experienceLevel !== undefined ? String(experienceLevel).trim() : currentProfile.experienceLevel || "Intermediate",
      experienceDetails: experienceDetails !== undefined ? String(experienceDetails).trim() : currentProfile.experienceDetails || "",
      interests: cleanInterests,
      github: github !== undefined ? sanitizeUrl(github) : currentProfile.github || "",
      linkedin: linkedin !== undefined ? sanitizeUrl(linkedin) : currentProfile.linkedin || "",
      portfolio: portfolio !== undefined ? sanitizeUrl(portfolio) : currentProfile.portfolio || "",
      handle: currentProfile.handle || `GH-${user._id.toString().slice(-6).toUpperCase()}`,
    };

    try {
      await user.save();
    } catch (saveError) {
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, () => {});
      }
      throw saveError;
    }

    // Atomic old avatar cleanup AFTER database save succeeds
    if (oldAvatarPath && oldAvatarPath !== user.profile.avatar && oldAvatarPath.startsWith("/uploads/")) {
      const oldFilename = path.basename(oldAvatarPath);
      const oldFilePath = path.join(__dirname, "../public/uploads", oldFilename);
      fs.unlink(oldFilePath, (unlinkErr) => {
        if (unlinkErr && unlinkErr.code !== "ENOENT") {
          console.warn("Old avatar cleanup notice:", oldFilePath, unlinkErr.message);
        }
      });
    }

    const profileCompletion = calculateProfileCompletion(user);

    return res.status(200).json({
      message: "Participant profile updated successfully.",
      user: user.toSafeUser(),
      profileCompletion,
    });
  } catch (error) {
    console.error("Error in updateOwnParticipantProfile:", error);
    return res.status(500).json({ message: error.message || "Failed to update participant profile." });
  }
};

// ---------------------------------------------------------------------------
// GET /api/users/participant/:id — Fetch Participant Profile (Public View)
// ---------------------------------------------------------------------------
const getParticipantProfile = async (req, res) => {
  try {
    let { id } = req.params;

    if (id === "me") {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthenticated." });
      }
      id = req.user._id.toString();
    }

    let targetUser = null;

    // Search by ObjectId or handle
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      targetUser = await User.findById(id);
    }

    if (!targetUser) {
      targetUser = await User.findOne({ "profile.handle": id });
    }

    if (!targetUser) {
      return res.status(404).json({ message: "Participant profile not found." });
    }

    const isOwner = req.user && req.user._id.toString() === targetUser._id.toString();
    const safeUser = targetUser.toSafeUser();
    const profileCompletion = calculateProfileCompletion(targetUser);

    let connectionState = {
      status: "none", // 'none' | 'pending' | 'accepted' | 'rejected'
      isSender: false,
      requestId: null,
      note: null,
    };

    if (req.user && !isOwner) {
      const Connection = require("../models/connection");
      const existingConn = await Connection.findOne({
        $or: [
          { sender: req.user._id, receiver: targetUser._id },
          { sender: targetUser._id, receiver: req.user._id },
        ],
      });

      if (existingConn) {
        connectionState = {
          status: existingConn.status,
          isSender: existingConn.sender.toString() === req.user._id.toString(),
          requestId: existingConn._id.toString(),
          note: existingConn.note || null,
        };
      }
    }

    return res.status(200).json({
      user: safeUser,
      profileCompletion,
      isOwner,
      connectionState,
    });
  } catch (error) {
    console.error("Error in getParticipantProfile:", error);
    return res.status(500).json({ message: "Unable to load participant profile." });
  }
};

module.exports = {
  getOrganizerProfile,
  updateOwnOrganizerProfile,
  getOwnProfile,
  updateOwnParticipantProfile,
  getParticipantProfile,
};
