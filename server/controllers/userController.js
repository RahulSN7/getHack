// ---------------------------------------------------------------------------
// server/controllers/userController.js — User & Organizer Profile Controllers
// ---------------------------------------------------------------------------



const fs = require("fs");
const path = require("path");

const User = require("../models/user");
const Hackathon = require("../models/hackathon");
const Connection = require("../models/connection");
const { isProfileComplete } = require("../utils/profileValidation");

// ============================================================
// DATE FORMATTER
// ============================================================

function formatMonthYear(date) {
  if (!date) return "N/A";

  try {
    const d = new Date(date);

    if (isNaN(d.getTime())) {
      return "N/A";
    }

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return "N/A";
  }
}

// ============================================================
// GET OWN PROFILE
// ============================================================

const getOwnProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthenticated.",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User account not found.",
      });
    }

    return res.status(200).json({
      user: user.toSafeUser(),
    });
  } catch (error) {
    console.error("GET OWN PROFILE ERROR:", error);

    return res.status(500).json({
      message: "Unable to load profile.",
    });
  }
};

// ============================================================
// UPDATE PARTICIPANT PROFILE
// ============================================================

const updateOwnParticipantProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthenticated.",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User account not found.",
      });
    }

    if (user.role !== "participant") {
      return res.status(403).json({
        message: "Only participants can update this profile.",
      });
    }

    const currentProfile = user.profile || {};
    const body = req.body || {};

    const {
      name,
      role,
      gender,
      dateOfBirth,
      location,
      bio,
      availability,
      skills,
      education,
      experienceLevel,
      experienceDetails,
      interests,
      github,
      linkedin,
      portfolio,
      removePhoto,
    } = body;

    // ========================================================
    // NORMALIZE REQUIRED FIELDS
    // ========================================================

    const cleanName =
      name !== undefined
        ? String(name).trim()
        : String(user.name || "").trim();

    const cleanRole =
      role !== undefined
        ? String(role).trim()
        : String(currentProfile.role || "").trim();

    const cleanGender =
      gender !== undefined
        ? String(gender).trim()
        : String(currentProfile.gender || "").trim();

    const cleanDOB =
      dateOfBirth !== undefined
        ? String(dateOfBirth).trim()
        : String(currentProfile.dateOfBirth || "").trim();

    const cleanLocation =
      location !== undefined
        ? String(location).trim()
        : String(currentProfile.location || "").trim();

    const cleanBio =
      bio !== undefined
        ? String(bio).trim()
        : String(currentProfile.bio || "").trim();

    const cleanAvailability =
      availability !== undefined
        ? String(availability).trim()
        : String(currentProfile.availability || "").trim();

    // ========================================================
    // REQUIRED FIELD VALIDATION
    // ========================================================

    const validationErrors = {};

    if (!cleanName) {
      validationErrors.name = "Full Name is required.";
    }

    if (!cleanRole) {
      validationErrors.role = "Role / Headline is required.";
    }

    const allowedGenders = [
      "Male",
      "Female",
      "Non-binary",
      "Prefer not to say",
      "Other",
    ];

    if (!cleanGender) {
      validationErrors.gender = "Gender is required.";
    } else if (!allowedGenders.includes(cleanGender)) {
      validationErrors.gender = "Invalid gender selection.";
    }

    if (!cleanDOB) {
      validationErrors.dateOfBirth = "Date of Birth is required.";
    } else {
      const dob = new Date(cleanDOB);

      if (isNaN(dob.getTime())) {
        validationErrors.dateOfBirth =
          "Please enter a valid Date of Birth.";
      } else if (dob > new Date()) {
        validationErrors.dateOfBirth =
          "Date of birth cannot be in the future.";
      }
    }

    if (!cleanLocation) {
      validationErrors.location = "Location is required.";
    }

    if (!cleanAvailability) {
      validationErrors.availability =
        "Availability status is required.";
    }

    if (!cleanBio) {
      validationErrors.bio = "Bio is required.";
    } else if (cleanBio.length > 300) {
      validationErrors.bio =
        "Bio cannot exceed 300 characters.";
    }

    // ========================================================
    // SKILLS
    // ========================================================

    let parsedSkills = skills;

    if (typeof parsedSkills === "string") {
      try {
        parsedSkills = JSON.parse(parsedSkills);
      } catch {
        parsedSkills = parsedSkills
          .split(",")
          .map((item) => item.trim());
      }
    }

    let cleanSkills = Array.isArray(parsedSkills)
      ? parsedSkills
        .flatMap((item) => (typeof item === "string" ? item.split(",") : []))
        .map((skill) => skill.trim())
        .filter((skill) => skill.length > 0)
      : currentProfile.skills || [];

    // Remove duplicate skills
    cleanSkills = [...new Map(
      cleanSkills.map((skill) => [
        skill.toLowerCase(),
        skill,
      ])
    ).values()];

    if (cleanSkills.length === 0) {
      validationErrors.skills =
        "At least one skill is required.";
    }

    if (cleanSkills.length > 15) {
      cleanSkills = cleanSkills.slice(0, 15);
    }

    // ========================================================
    // EDUCATION
    // ========================================================

    let cleanEducation = {};

    if (typeof education === "string") {
      try {
        cleanEducation = JSON.parse(education);
      } catch {
        cleanEducation = {};
      }
    } else if (
      typeof education === "object" &&
      education !== null
    ) {
      cleanEducation = education;
    }

    const educationCollege = String(
      cleanEducation.college ??
      currentProfile.education?.college ??
      ""
    ).trim();

    const educationDegree = String(
      cleanEducation.degree ??
      currentProfile.education?.degree ??
      ""
    ).trim();

    const educationField = String(
      cleanEducation.fieldOfStudy ??
      currentProfile.education?.fieldOfStudy ??
      ""
    ).trim();

    const educationYear = String(
      cleanEducation.graduationYear ??
      currentProfile.education?.graduationYear ??
      ""
    ).trim();

    if (!educationCollege && !educationDegree) {
      validationErrors.education =
        "College / University or Degree is required.";
    }

    cleanEducation = {
      college: educationCollege,
      degree: educationDegree,
      fieldOfStudy: educationField,
      graduationYear: educationYear,
    };

    // ========================================================
    // INTERESTS
    // ========================================================

    let parsedInterests = interests;

    if (typeof parsedInterests === "string") {
      try {
        parsedInterests = JSON.parse(parsedInterests);
      } catch {
        parsedInterests = parsedInterests
          .split(",")
          .map((item) => item.trim());
      }
    }

    let cleanInterests = Array.isArray(parsedInterests)
      ? parsedInterests
        .flatMap((item) => (typeof item === "string" ? item.split(",") : []))
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
      : currentProfile.interests || [];

    cleanInterests = [
      ...new Map(
        cleanInterests.map((item) => [
          item.toLowerCase(),
          item,
        ])
      ).values(),
    ];

    if (cleanInterests.length === 0) {
      validationErrors.interests = "Please select at least one interest.";
    }

    // ========================================================
    // URL SANITIZER & LINKS VALIDATION
    // ========================================================

    const sanitizeUrl = (value) => {
      if (!value || typeof value !== "string") {
        return "";
      }

      const clean = value.trim();

      if (!clean) {
        return "";
      }

      if (
        clean.startsWith("http://") ||
        clean.startsWith("https://")
      ) {
        return clean;
      }

      return `https://${clean}`;
    };

    const cleanGithub = github !== undefined ? sanitizeUrl(github) : currentProfile.github || "";
    const cleanLinkedin = linkedin !== undefined ? sanitizeUrl(linkedin) : currentProfile.linkedin || "";
    const cleanPortfolio = portfolio !== undefined ? sanitizeUrl(portfolio) : currentProfile.portfolio || "";

    if (!cleanGithub && !cleanLinkedin && !cleanPortfolio) {
      validationErrors.links = "Please provide at least one professional link (GitHub, LinkedIn, or Portfolio).";
    }

    // Check if any validation errors occurred
    if (Object.keys(validationErrors).length > 0) {
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, () => { });
      }
      const firstErrorKey = Object.keys(validationErrors)[0];
      return res.status(400).json({
        success: false,
        message: validationErrors[firstErrorKey],
        errors: validationErrors,
      });
    }

    // ========================================================
    // AVATAR HANDLING
    // ========================================================

    const oldAvatar = currentProfile.avatar || "";

    let newAvatar = oldAvatar;

    if (req.file) {
      newAvatar = `/uploads/${req.file.filename}`;
    } else if (
      removePhoto === "true" ||
      removePhoto === true
    ) {
      newAvatar = "";
    }

    // ========================================================
    // UPDATE USER
    // ========================================================

    user.name = cleanName;

    user.profile = {
      ...currentProfile,

      avatar: newAvatar,

      role: cleanRole,

      gender: cleanGender,

      dateOfBirth: cleanDOB,

      location: cleanLocation,

      availability: cleanAvailability,

      bio: cleanBio,

      skills: cleanSkills,

      education: cleanEducation,

      // Keep compatibility with older UI
      college: educationCollege,
      degree: educationDegree,

      experienceLevel:
        experienceLevel !== undefined
          ? String(experienceLevel).trim()
          : currentProfile.experienceLevel || "",

      experienceDetails:
        experienceDetails !== undefined
          ? String(experienceDetails).trim()
          : currentProfile.experienceDetails || "",

      interests: cleanInterests,

      github:
        github !== undefined
          ? sanitizeUrl(github)
          : currentProfile.github || "",

      linkedin:
        linkedin !== undefined
          ? sanitizeUrl(linkedin)
          : currentProfile.linkedin || "",

      portfolio:
        portfolio !== undefined
          ? sanitizeUrl(portfolio)
          : currentProfile.portfolio || "",

      handle:
        currentProfile.handle ||
        `GH-${user._id
          .toString()
          .slice(-6)
          .toUpperCase()}`,
    };

    // Reject Available selection if candidate profile is incomplete
    if (cleanAvailability === "Available" && !isProfileComplete(user)) {
      if (req.file?.path) {
        fs.unlink(req.file.path, () => { });
      }
      return res.status(400).json({
        success: false,
        code: "PROFILE_INCOMPLETE",
        message: "Complete your profile before becoming available to teammates.",
      });
    }

    // ========================================================
    // SAVE DATABASE
    // ========================================================

    try {
      await user.save();
    } catch (saveError) {
      // If DB save fails, remove newly uploaded image.
      if (req.file?.path) {
        fs.unlink(req.file.path, () => { });
      }

      throw saveError;
    }

    // ========================================================
    // DELETE OLD AVATAR AFTER SUCCESSFUL SAVE
    // ========================================================

    if (
      req.file &&
      oldAvatar &&
      oldAvatar !== newAvatar &&
      oldAvatar.startsWith("/uploads/")
    ) {
      const oldFilename = path.basename(oldAvatar);

      const oldFilePath = path.join(
        __dirname,
        "../public/uploads",
        oldFilename
      );

      fs.unlink(oldFilePath, (error) => {
        if (
          error &&
          error.code !== "ENOENT"
        ) {
          console.warn(
            "Unable to delete old avatar:",
            error.message
          );
        }
      });
    }

    // ========================================================
    // RETURN UPDATED USER
    // ========================================================

    return res.status(200).json({
      success: true,
      message: "Participant profile updated successfully.",
      user: user.toSafeUser(),
    });
  } catch (error) {
    console.error(
      "UPDATE PARTICIPANT PROFILE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to update participant profile.",
    });
  }
};

// ============================================================
// GET PARTICIPANT PROFILE
// ============================================================

const getParticipantProfile = async (req, res) => {
  try {
    let { id } = req.params;

    if (id === "me") {
      if (!req.user) {
        return res.status(401).json({
          message: "Unauthenticated.",
        });
      }

      id = req.user._id.toString();
    }

    let targetUser = null;

    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      targetUser = await User.findById(id);
    }

    if (!targetUser) {
      targetUser = await User.findOne({
        "profile.handle": id,
      });
    }

    if (!targetUser) {
      return res.status(404).json({
        message: "Participant profile not found.",
      });
    }

    if (targetUser.role !== "participant") {
      return res.status(404).json({
        message: "Participant profile not found.",
      });
    }

    const isOwner =
      req.user &&
      req.user._id.toString() ===
      targetUser._id.toString();

    let connectionState = {
      status: "none",
      isSender: false,
      requestId: null,
      note: null,
    };

    if (req.user && !isOwner) {
      const existingConnection = await Connection.findOne({
        $or: [
          { sender: req.user._id, receiver: targetUser._id },
          { sender: targetUser._id, receiver: req.user._id },
        ],
      });

      if (existingConnection) {
        connectionState = {
          status: existingConnection.status,
          isSender: existingConnection.sender.toString() === req.user._id.toString(),
          requestId: existingConnection._id.toString(),
          note: existingConnection.note || null,
        };
      }
    }

    return res.status(200).json({
      success: true,
      user: targetUser.toSafeUser(),
      isOwner,
      connectionState,
    });
  } catch (error) {
    console.error(
      "GET PARTICIPANT PROFILE ERROR:",
      error
    );

    return res.status(500).json({
      message: "Unable to load participant profile.",
    });
  }
};

// ============================================================
// ORGANIZER PROFILE
// ============================================================

const getOrganizerProfile = async (req, res) => {
  try {
    let { id } = req.params;

    if (id === "me") {
      if (!req.user) {
        return res.status(401).json({
          message: "Unauthenticated.",
        });
      }

      id = req.user._id.toString();
    }

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(404).json({
        message: "Organizer profile not found.",
      });
    }

    const organizer = await User.findById(id);

    if (
      !organizer ||
      organizer.role !== "organizer"
    ) {
      return res.status(404).json({
        message: "Organizer profile not found.",
      });
    }

    const isOwner =
      req.user &&
      req.user._id.toString() ===
      organizer._id.toString();

    const now = new Date();

    const totalHackathons =
      await Hackathon.countDocuments({
        organizer: organizer._id,
      });

    const completedCount =
      await Hackathon.countDocuments({
        organizer: organizer._id,
        endDate: { $lt: now },
      });

    const upcomingCount =
      await Hackathon.countDocuments({
        organizer: organizer._id,
        endDate: { $gte: now },
      });

    const rawHackathons =
      await Hackathon.find({
        organizer: organizer._id,
      }).sort({
        createdAt: -1,
      });

    const hackathons = rawHackathons.map((h) => ({
      id: h._id.toString(),
      _id: h._id.toString(),
      title: h.title,
      name: h.title,
      description: h.description,
      shortDescription:
        h.shortDescription || h.description,
      organizerName:
        h.organizerName || organizer.name,
      registrationOpens:
        h.registrationOpens,
      registrationDeadline:
        h.registrationDeadline,
      startDate: h.startDate,
      endDate: h.endDate,
      format: h.format,
      mode: h.format,
      location: h.location,
      registrationUrl:
        h.registrationUrl,
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

      status:
        new Date(h.endDate) < now
          ? "Completed"
          : new Date(h.registrationDeadline) >= now
            ? "Active"
            : "Upcoming",
    }));

    const safeUser =
      organizer.toSafeUser();

    const profileData = {
      id: safeUser.id,
      _id: safeUser.id,
      name: safeUser.name,
      role: safeUser.role,
      handle:
        safeUser.profile?.handle ||
        `@${safeUser.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")}`,
      avatar:
        safeUser.profile?.avatar || "",
      bio:
        safeUser.profile?.bio || "",
      location:
        safeUser.profile?.location || "",
      organizationName:
        safeUser.profile?.organizationName ||
        safeUser.name,
      organizationType:
        safeUser.profile?.organizationType ||
        "Student Club",
      organizationDescription:
        safeUser.profile
          ?.organizationDescription || "",
      website:
        safeUser.profile?.website || "",
      github:
        safeUser.profile?.github || "",
      linkedin:
        safeUser.profile?.linkedin || "",
      twitter:
        safeUser.profile?.twitter || "",
      instagram:
        safeUser.profile?.instagram || "",
      discord:
        safeUser.profile?.discord || "",
      contactNumber:
        safeUser.profile?.contactNumber || "",
      isVerified: Boolean(
        safeUser.profile?.isVerified
      ),
      createdAt: safeUser.createdAt,
      joinedDate:
        formatMonthYear(safeUser.createdAt),

      email: isOwner
        ? safeUser.email
        : undefined,
    };

    return res.status(200).json({
      profile: profileData,

      stats: {
        totalHackathons,
        completedCount,
        upcomingCount,
        joinedDate:
          formatMonthYear(
            safeUser.createdAt
          ),
      },

      hackathons,

      isOwner,
    });
  } catch (error) {
    console.error(
      "GET ORGANIZER PROFILE ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to load organizer profile.",
    });
  }
};

// ============================================================
// UPDATE ORGANIZER PROFILE
// ============================================================

const updateOwnOrganizerProfile = async (
  req,
  res
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthenticated.",
      });
    }

    if (req.user.role !== "organizer") {
      return res.status(403).json({
        message:
          "Forbidden. Organizer profile updates only.",
      });
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

    const user = await User.findById(
      req.user._id
    );

    if (!user) {
      return res.status(404).json({
        message: "User account not found.",
      });
    }

    if (
      name &&
      typeof name === "string" &&
      name.trim()
    ) {
      user.name = name.trim();
    }

    const currentProfile =
      user.profile || {};

    user.profile = {
      ...currentProfile,

      avatar:
        avatar !== undefined
          ? String(avatar).trim()
          : currentProfile.avatar || "",

      bio:
        bio !== undefined
          ? String(bio).trim()
          : currentProfile.bio || "",

      location:
        location !== undefined
          ? String(location).trim()
          : currentProfile.location || "",

      organizationName:
        organizationName !== undefined
          ? String(
            organizationName
          ).trim()
          : currentProfile.organizationName ||
          "",

      organizationType:
        organizationType !== undefined
          ? String(
            organizationType
          ).trim()
          : currentProfile.organizationType ||
          "Student Club",

      organizationDescription:
        organizationDescription !==
          undefined
          ? String(
            organizationDescription
          ).trim()
          : currentProfile.organizationDescription ||
          "",

      website:
        website !== undefined
          ? String(website).trim()
          : currentProfile.website || "",

      github:
        github !== undefined
          ? String(github).trim()
          : currentProfile.github || "",

      linkedin:
        linkedin !== undefined
          ? String(linkedin).trim()
          : currentProfile.linkedin || "",

      twitter:
        twitter !== undefined
          ? String(twitter).trim()
          : currentProfile.twitter || "",

      instagram:
        instagram !== undefined
          ? String(instagram).trim()
          : currentProfile.instagram || "",

      discord:
        discord !== undefined
          ? String(discord).trim()
          : currentProfile.discord || "",

      contactNumber:
        contactNumber !== undefined
          ? String(
            contactNumber
          ).trim()
          : currentProfile.contactNumber ||
          "",

      handle:
        handle !== undefined
          ? String(handle).trim()
          : currentProfile.handle || "",

      isVerified:
        currentProfile.isVerified ||
        false,
    };

    await user.save();

    return res.status(200).json({
      message:
        "Profile updated successfully.",

      user: user.toSafeUser(),
    });
  } catch (error) {
    console.error(
      "UPDATE ORGANIZER PROFILE ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to update profile.",
    });
  }
};

// ============================================================
// GET ALL PARTICIPANTS (For Find Teammates discovery)
// ============================================================

const getAllParticipants = async (req, res) => {
  try {
    const currentUserId = req.user?._id ? req.user._id.toString() : null;
    const limitParam = req.query.limit ? parseInt(req.query.limit, 10) : null;

    // Fetch connection records for current user if logged in
    let acceptedConnectedUserIds = new Set();
    let connectionsMap = {};

    if (currentUserId) {
      const connections = await Connection.find({
        $or: [{ sender: req.user._id }, { receiver: req.user._id }],
      });

      connections.forEach((c) => {
        const senderId = c.sender.toString();
        const receiverId = c.receiver.toString();
        const otherId = senderId === currentUserId ? receiverId : senderId;

        if (c.status === "accepted") {
          acceptedConnectedUserIds.add(otherId);
        }

        connectionsMap[otherId] = {
          status: c.status,
          isSender: senderId === currentUserId,
          requestId: c._id.toString(),
        };
      });
    }

    // Build excluded user IDs list: current user + all accepted connection partner IDs
    const excludedUserIds = currentUserId
      ? [currentUserId, ...Array.from(acceptedConnectedUserIds)]
      : [];

    // Fetch participant users excluding current user and accepted connections
    const users = await User.find({
      role: "participant",
      ...(excludedUserIds.length > 0 ? { _id: { $nin: excludedUserIds } } : {}),
    }).sort({ createdAt: -1 });

    // Enforce profile completion requirements and double check exclusions
    let eligibleUsers = users.filter((u) => {
      const isNotExcluded = currentUserId
        ? !excludedUserIds.includes(u._id.toString())
        : true;
      return isNotExcluded && isProfileComplete(u);
    });

    // Apply limit if specified
    if (limitParam && !isNaN(limitParam) && limitParam > 0) {
      eligibleUsers = eligibleUsers.slice(0, limitParam);
    }

    const participants = eligibleUsers.map((u) => {
      const safe = u.toSafeUser();
      const conn = connectionsMap[u._id.toString()] || { status: "none" };
      return {
        ...safe,
        connectionState: conn,
      };
    });

    return res.status(200).json({
      success: true,
      count: participants.length,
      participants,
      teammates: participants,
    });
  } catch (error) {
    console.error("GET ALL PARTICIPANTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch participants.",
    });
  }
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  getOwnProfile,
  updateOwnParticipantProfile,
  getParticipantProfile,
  getOrganizerProfile,
  updateOwnOrganizerProfile,
  getAllParticipants,
};