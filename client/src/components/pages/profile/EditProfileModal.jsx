// ---------------------------------------------------------------------------
// EditProfileModal.jsx — Participant Profile Editing Modal Component
// Supports local file picker for avatar, gender, date of birth, mandatory location,
// bio length validation (300 char max), skill tags, education, and links.
// ---------------------------------------------------------------------------

import { useState, useRef } from "react";

export default function EditProfileModal({ isOpen, onClose, currentProfile, currentUser, onSave }) {
  if (!isOpen) return null;

  const profile = currentProfile || currentUser?.profile || {};

  const fileInputRef = useRef(null);

  const [name, setName] = useState(currentUser?.name || "");
  const [role, setRole] = useState(profile.role || "");
  const [gender, setGender] = useState(profile.gender || "Prefer not to say");
  const [dateOfBirth, setDateOfBirth] = useState(profile.dateOfBirth || "");
  const [location, setLocation] = useState(profile.location || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [availability, setAvailability] = useState(profile.availability || "Available");

  // Profile Photo File & Preview state
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(profile.avatar || "");
  const [removePhoto, setRemovePhoto] = useState(false);

  // Skills state
  const [skills, setSkills] = useState(Array.isArray(profile.skills) ? profile.skills : []);
  const [skillInput, setSkillInput] = useState("");

  // Education state
  const [college, setCollege] = useState(profile.college || profile.education?.college || "");
  const [degree, setDegree] = useState(profile.degree || profile.education?.degree || "");
  const [fieldOfStudy, setFieldOfStudy] = useState(profile.education?.fieldOfStudy || "");
  const [graduationYear, setGraduationYear] = useState(profile.education?.graduationYear || "");

  // Experience state
  const [experienceLevel, setExperienceLevel] = useState(profile.experienceLevel || "Intermediate");
  const [experienceDetails, setExperienceDetails] = useState(profile.experienceDetails || "");

  // Interests state
  const [interests, setInterests] = useState(Array.isArray(profile.interests) ? profile.interests : []);
  const [interestInput, setInterestInput] = useState("");

  // Links state
  const [github, setGithub] = useState(profile.github || "");
  const [linkedin, setLinkedin] = useState(profile.linkedin || "");
  const [portfolio, setPortfolio] = useState(profile.portfolio || "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Profile photo local file selection handler
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Please select a PNG, JPG, JPEG, or WEBP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5 MB.");
      return;
    }

    setError(null);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setRemovePhoto(false);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview("");
    setRemovePhoto(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Skill tag handlers
  const handleAddSkill = (e) => {
    e?.preventDefault();
    const clean = skillInput.trim();
    if (!clean) return;
    if (skills.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      setSkillInput("");
      return;
    }
    if (skills.length >= 15) {
      setError("Maximum 15 skills allowed.");
      return;
    }
    setSkills([...skills, clean]);
    setSkillInput("");
    setError(null);
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  // Interest tag handlers
  const handleAddInterest = (e) => {
    e?.preventDefault();
    const clean = interestInput.trim();
    if (!clean) return;
    if (interests.some((i) => i.toLowerCase() === clean.toLowerCase())) {
      setInterestInput("");
      return;
    }
    setInterests([...interests, clean]);
    setInterestInput("");
  };

  const handleRemoveInterest = (interestToRemove) => {
    setInterests(interests.filter((i) => i !== interestToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Full Name is required.");
      return;
    }

    // Location is mandatory
    if (!location.trim()) {
      setError("Location is required.");
      return;
    }

    // Date of Birth validation
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      if (isNaN(dob.getTime())) {
        setError("Please enter a valid Date of Birth.");
        return;
      }
      if (dob > new Date()) {
        setError("Date of birth cannot be in the future.");
        return;
      }
    }

    if (bio.length > 300) {
      setError("Bio cannot exceed 300 characters.");
      return;
    }

    try {
      setSaving(true);

      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("role", role.trim() || "Participant");
      formData.append("gender", gender);
      formData.append("dateOfBirth", dateOfBirth);
      formData.append("location", location.trim());
      formData.append("bio", bio.trim());
      formData.append("availability", availability);
      formData.append("skills", JSON.stringify(skills));
      formData.append(
        "education",
        JSON.stringify({
          college: college.trim(),
          degree: degree.trim(),
          fieldOfStudy: fieldOfStudy.trim(),
          graduationYear: graduationYear.trim(),
        })
      );
      formData.append("experienceLevel", experienceLevel);
      formData.append("experienceDetails", experienceDetails.trim());
      formData.append("interests", JSON.stringify(interests));
      formData.append("github", github.trim());
      formData.append("linkedin", linkedin.trim());
      formData.append("portfolio", portfolio.trim());

      if (photoFile) {
        formData.append("profilePhoto", photoFile);
      }
      if (removePhoto) {
        formData.append("removePhoto", "true");
      }

      await onSave(formData);
      onClose();
    } catch (err) {
      console.error("Failed to save profile:", err);
      setError(err.message || "Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-neutral-950/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4 dark:border-neutral-800">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              Edit Participant Profile
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              Update your real developer information so teammates can find and connect with you.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-500/10 p-3 text-xs font-medium text-red-600 dark:bg-red-500/15 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-6">
          {/* SECTION 1: Profile Photo File Upload */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Profile Photo
            </h3>
            <div className="flex items-center gap-4">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800">
                {photoPreview ? (
                  <img src={photoPreview} alt="Avatar preview" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-neutral-500 dark:text-neutral-400">
                    {name ? name.charAt(0).toUpperCase() : "P"}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    Choose Photo
                  </button>
                  {photoPreview && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                  Select a local PNG, JPG, JPEG, or WEBP image (max 5 MB).
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 2: Identity & Basic Info */}
          <div className="space-y-4 border-t border-neutral-100 pt-4 dark:border-neutral-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Basic Information
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  placeholder="e.g. Rahul Sharma"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Role / Headline *
                </label>
                <input
                  type="text"
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  placeholder="e.g. Full Stack Developer | AI Enthusiast"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Location * 
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  placeholder="e.g. Mumbai, Maharashtra, India"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Availability Status *
                </label>
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                >
                  <option value="Available">● Available for Teammates</option>
                  <option value="Not Available">○ Not Available</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Bio * (Max 300 characters)
                </label>
                <span className={`text-[11px] font-medium ${bio.length > 300 ? "text-red-500" : "text-neutral-400"}`}>
                  {bio.length} / 300
                </span>
              </div>
              <textarea
                rows={3}
                maxLength={300}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                placeholder="Brief summary of your skills, background, and what you enjoy building..."
              />
            </div>
          </div>

          {/* SECTION 3: Skills */}
          <div className="space-y-3 border-t border-neutral-100 pt-4 dark:border-neutral-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Skills *
            </h3>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddSkill(e);
                }}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                placeholder="Type a skill (e.g. React, Node.js, Python) and press Enter"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="shrink-0 rounded-lg bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                + Add
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 rounded-md bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="text-indigo-400 hover:text-indigo-600 dark:hover:text-white"
                  >
                    ✕
                  </button>
                </span>
              ))}
              {skills.length === 0 && (
                <p className="text-xs text-neutral-400 italic">No skills added yet. Add at least 1 skill.</p>
              )}
            </div>
          </div>

          {/* SECTION 4: Education */}
          <div className="space-y-4 border-t border-neutral-100 pt-4 dark:border-neutral-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Education *
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  College / University *
                </label>
                <input
                  type="text"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  placeholder="e.g. Stanford University"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Degree / Field of Study
                </label>
                <input
                  type="text"
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  placeholder="e.g. B.S. Computer Science"
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: Experience & Interests */}
          <div className="space-y-4 border-t border-neutral-100 pt-4 dark:border-neutral-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Experience & Interests
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Experience Level
                </label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                >
                  <option value="Beginner">Beginner (0 - 1 years)</option>
                  <option value="Intermediate">Intermediate (1 - 3 years)</option>
                  <option value="Advanced">Advanced (3+ years)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Previous Hackathons / Highlights
                </label>
                <input
                  type="text"
                  value={experienceDetails}
                  onChange={(e) => setExperienceDetails(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  placeholder="e.g. 3 hackathons completed, Winner @ BuildWithAI 2025"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Interests
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="text"
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddInterest(e);
                  }}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  placeholder="Add interest (e.g. AI Agents, Web3, Cloud) and press Enter"
                />
                <button
                  type="button"
                  onClick={handleAddInterest}
                  className="shrink-0 rounded-lg bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                  + Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-2">
                {interests.map((interest) => (
                  <span
                    key={interest}
                    className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                  >
                    <span>{interest}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveInterest(interest)}
                      className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 6: Professional Links */}
          <div className="space-y-4 border-t border-neutral-100 pt-4 dark:border-neutral-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Professional Links * (At least 1 required)
            </h3>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                GitHub URL
              </label>
              <input
                type="url"
                value={github}
                onChange={(e) => setGithub(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                placeholder="https://github.com/yourusername"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                LinkedIn URL
              </label>
              <input
                type="url"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                placeholder="https://linkedin.com/in/yourusername"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Portfolio URL
              </label>
              <input
                type="url"
                value={portfolio}
                onChange={(e) => setPortfolio(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                placeholder="https://yourportfolio.dev"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-neutral-100 pt-4 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
