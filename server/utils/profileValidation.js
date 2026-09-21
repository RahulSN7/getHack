
// server/utils/profileValidation.js
// Centralized profile completion validation helper for getHack backend


function isProfileComplete(user) {
  if (!user) return false;
  const p = user.profile || {};

  const userRole = String(user.role || p.role || "").toLowerCase().trim();

  // ORGANIZER ROLE VALIDATION
  if (userRole === "organizer") {
    const nameValid = Boolean(user.name && String(user.name).trim());
    const orgNameValid = Boolean((p.organizationName || user.name) && String(p.organizationName || user.name).trim());
    const locationValid = Boolean(p.location && String(p.location).trim());
    const bioValid = Boolean(
      (p.bio || p.organizationDescription) &&
      String(p.bio || p.organizationDescription).trim()
    );
    const websiteStr = String(p.website || "").trim();
    const githubStr = String(p.github || "").trim();
    const linkedinStr = String(p.linkedin || "").trim();
    const twitterStr = String(p.twitter || "").trim();
    const portfolioStr = String(p.portfolio || "").trim();
    const instagramStr = String(p.instagram || "").trim();
    const discordStr = String(p.discord || "").trim();
    const linksValid = Boolean(
      websiteStr || githubStr || linkedinStr || twitterStr || portfolioStr || instagramStr || discordStr
    );

    return nameValid && orgNameValid && locationValid && bioValid && linksValid;
  }

  // PARTICIPANT ROLE VALIDATION
  const nameValid = Boolean(user.name && String(user.name).trim());
  const roleValid = Boolean(p.role && String(p.role).trim());
  const genderValid = Boolean(p.gender && String(p.gender).trim());

  let dobValid = false;
  if (p.dateOfBirth) {
    const dob = new Date(p.dateOfBirth);
    dobValid = !isNaN(dob.getTime()) && dob <= new Date();
  }

  const locationValid = Boolean(p.location && String(p.location).trim());
  const availabilityValid = Boolean(p.availability && String(p.availability).trim());
  const bioValid = Boolean(p.bio && String(p.bio).trim() && String(p.bio).length <= 300);

  const skillsValid = Array.isArray(p.skills) && p.skills.length > 0;

  const collegeStr = String(p.college || p.education?.college || "").trim();
  const degreeStr = String(p.degree || p.education?.degree || "").trim();
  const educationValid = Boolean(collegeStr || degreeStr);

  const interestsValid = Array.isArray(p.interests) && p.interests.length > 0;

  const githubStr = String(p.github || "").trim();
  const linkedinStr = String(p.linkedin || "").trim();
  const portfolioStr = String(p.portfolio || "").trim();
  const linksValid = Boolean(githubStr || linkedinStr || portfolioStr);

  return (
    nameValid &&
    roleValid &&
    genderValid &&
    dobValid &&
    locationValid &&
    availabilityValid &&
    bioValid &&
    skillsValid &&
    educationValid &&
    interestsValid &&
    linksValid
  );
}

module.exports = {
  isProfileComplete,
};
