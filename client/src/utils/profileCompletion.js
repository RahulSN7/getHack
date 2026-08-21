// ---------------------------------------------------------------------------
// client/src/utils/profileCompletion.js — Client-Side Profile Completion Calculator
// Evaluates real user profile objects and calculates completion percentage (0% - 100%)
// Safe for null/undefined objects and empty fields.
// ---------------------------------------------------------------------------

export function calculateProfileCompletion(user) {
  if (!user) {
    return {
      percentage: 0,
      isComplete: false,
      missingFields: [
        "name",
        "location",
        "profilePhoto",
        "gender",
        "dateOfBirth",
        "role",
        "bio",
        "skills",
        "availability",
        "education",
        "links",
      ],
    };
  }

  const profile = user.profile || user || {};

  const name = typeof user.name === "string" ? user.name.trim() : typeof profile.name === "string" ? profile.name.trim() : "";
  const avatar = typeof profile.avatar === "string" ? profile.avatar.trim() : typeof profile.profilePhoto === "string" ? profile.profilePhoto.trim() : "";
  const gender = typeof profile.gender === "string" ? profile.gender.trim() : "";
  const dateOfBirth = typeof profile.dateOfBirth === "string" ? profile.dateOfBirth.trim() : "";
  const location = typeof profile.location === "string" ? profile.location.trim() : "";
  const role = typeof profile.role === "string" ? profile.role.trim() : "";
  const bio = typeof profile.bio === "string" ? profile.bio.trim() : "";

  const skills = Array.isArray(profile.skills)
    ? profile.skills.filter((s) => typeof s === "string" && s.trim().length > 0)
    : [];

  const availability = typeof profile.availability === "string" ? profile.availability.trim() : "";

  const college = typeof profile.college === "string" ? profile.college.trim() : typeof profile.education?.college === "string" ? profile.education.college.trim() : "";
  const degree = typeof profile.degree === "string" ? profile.degree.trim() : typeof profile.education?.degree === "string" ? profile.education.degree.trim() : "";
  const hasEducation = Boolean(college || degree);

  const github = typeof profile.github === "string" ? profile.github.trim() : "";
  const linkedin = typeof profile.linkedin === "string" ? profile.linkedin.trim() : "";
  const portfolio = typeof profile.portfolio === "string" ? profile.portfolio.trim() : "";
  const hasLink = Boolean(github || linkedin || portfolio);

  const checks = [
    { key: "name", label: "Name", score: 10, isFilled: Boolean(name) },
    { key: "location", label: "Location (Mandatory)", score: 15, isFilled: Boolean(location) },
    { key: "profilePhoto", label: "Profile Photo", score: 10, isFilled: Boolean(avatar) },
    { key: "gender", label: "Gender", score: 10, isFilled: Boolean(gender) },
    { key: "dateOfBirth", label: "Date of Birth", score: 10, isFilled: Boolean(dateOfBirth) },
    { key: "role", label: "Role / Headline", score: 10, isFilled: Boolean(role) },
    { key: "bio", label: "Bio", score: 10, isFilled: Boolean(bio && bio.length >= 10) },
    { key: "skills", label: "Skills", score: 10, isFilled: skills.length > 0 },
    { key: "availability", label: "Availability", score: 5, isFilled: Boolean(availability) },
    { key: "education", label: "Education / College", score: 5, isFilled: hasEducation },
    { key: "links", label: "GitHub, LinkedIn or Portfolio Link", score: 5, isFilled: hasLink },
  ];

  let percentage = 0;
  const missingFields = [];

  for (const check of checks) {
    if (check.isFilled) {
      percentage += check.score;
    } else {
      missingFields.push(check.key);
    }
  }

  percentage = Math.min(100, Math.max(0, percentage));

  const isComplete =
    Boolean(name) &&
    Boolean(location) &&
    Boolean(avatar) &&
    Boolean(gender) &&
    Boolean(dateOfBirth) &&
    Boolean(role) &&
    Boolean(bio && bio.length >= 10) &&
    skills.length > 0 &&
    Boolean(availability) &&
    hasEducation &&
    hasLink;

  return {
    percentage: isComplete ? 100 : percentage,
    isComplete,
    missingFields,
  };
}
