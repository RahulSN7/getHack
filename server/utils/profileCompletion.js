// ---------------------------------------------------------------------------
// server/utils/profileCompletion.js — Profile Completion Utility
// Calculates real participant profile completion percentage and status
// ---------------------------------------------------------------------------

function calculateProfileCompletion(user) {
  if (!user) {
    return {
      percentage: 0,
      isComplete: false,
      missingFields: ["name", "avatar", "role", "bio", "skills", "availability", "education", "links"],
    };
  }

  const profile = user.profile || {};

  const name = typeof user.name === "string" ? user.name.trim() : "";
  const avatar = typeof profile.avatar === "string" ? profile.avatar.trim() : "";
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
    { key: "name", label: "Name", score: 15, isFilled: Boolean(name) },
    { key: "avatar", label: "Profile Photo", score: 10, isFilled: Boolean(avatar) },
    { key: "role", label: "Role / Headline", score: 15, isFilled: Boolean(role) },
    { key: "bio", label: "Bio", score: 15, isFilled: Boolean(bio && bio.length >= 10) },
    { key: "skills", label: "Skills", score: 15, isFilled: skills.length > 0 },
    { key: "availability", label: "Availability", score: 10, isFilled: Boolean(availability) },
    { key: "education", label: "Education / College", score: 10, isFilled: hasEducation },
    { key: "links", label: "GitHub, LinkedIn or Portfolio Link", score: 10, isFilled: hasLink },
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

  // Ensure percentage cap at 100
  percentage = Math.min(100, Math.max(0, percentage));

  // Required criteria for profile completion before sending connection requests
  const isComplete =
    Boolean(name) &&
    Boolean(avatar) &&
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

module.exports = {
  calculateProfileCompletion,
};
