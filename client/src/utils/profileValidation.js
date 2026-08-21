// ---------------------------------------------------------------------------
// client/src/utils/profileValidation.js
// Centralized profile completion validation helper for getHack
// ---------------------------------------------------------------------------

export function isProfileComplete(user) {
  if (!user) return false;
  const p = user.profile || {};

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
