// ---------------------------------------------------------------------------
// CreateHackathonPage.jsx — Professional Multi-Section Hackathon Creation Form
// ---------------------------------------------------------------------------

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { hackathonService } from "../../services/hackathonService";

function CreateHackathonPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    organizerName: user?.name || "",
    registrationOpens: "",
    registrationDeadline: "",
    startDate: "",
    endDate: "",
    format: "Online",
    venue: "",
    city: "",
    country: "",
    registrationUrl: "",
    skills: "",
    themes: "",
    eligibility: "",
    minTeamSize: 1,
    maxTeamSize: 4,
    prizes: "",
    rules: "",
    contact: "",
    fee: "Free",
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (errorMessage) setErrorMessage("");
  };

  const validateDates = () => {
    const { registrationOpens, registrationDeadline, startDate, endDate } = formData;

    if (!registrationDeadline || !startDate || !endDate) {
      return "Registration Deadline, Start Date, and End Date are required.";
    }

    const regOpens = registrationOpens ? new Date(registrationOpens) : null;
    const regDeadline = new Date(registrationDeadline);
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (regOpens && regOpens > regDeadline) {
      return "Registration Opens date cannot be after Registration Deadline.";
    }

    if (regDeadline > start) {
      return "Registration Deadline cannot be after Hackathon Start Date.";
    }

    if (start > end) {
      return "Hackathon Start Date cannot be after End Date.";
    }

    return null;
  };

  const validateUrl = (url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    const newErrors = {};

    // Section 1: Basic Information
    if (!formData.title.trim()) {
      newErrors.title = "Hackathon Name is required.";
    }

    if (!formData.organizerName.trim()) {
      newErrors.organizerName = "Organizer Name is required.";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required.";
    }

    // Section 2: Schedule
    if (!formData.registrationOpens) {
      newErrors.registrationOpens = "Registration Opens date is required.";
    }

    if (!formData.registrationDeadline) {
      newErrors.registrationDeadline = "Registration Deadline is required.";
    }

    if (!formData.startDate) {
      newErrors.startDate = "Start Date is required.";
    }

    if (!formData.endDate) {
      newErrors.endDate = "End Date is required.";
    }

    const dateErr = validateDates();
    if (dateErr && !newErrors.registrationOpens && !newErrors.registrationDeadline && !newErrors.startDate && !newErrors.endDate) {
      setErrorMessage(dateErr);
    }

    // Section 3: Event Format & Location
    if (!formData.format) {
      newErrors.format = "Event Format is required.";
    }

    if (formData.format === "Offline" || formData.format === "Hybrid") {
      if (!formData.venue.trim()) {
        newErrors.venue = "Venue is required.";
      }
      if (!formData.city.trim()) {
        newErrors.city = "City is required.";
      }
      if (!formData.country.trim()) {
        newErrors.country = "Country is required.";
      }
    }

    // Section 4: Registration Link
    if (!formData.registrationUrl.trim()) {
      newErrors.registrationUrl = "External Registration Link is required.";
    } else if (!validateUrl(formData.registrationUrl.trim())) {
      newErrors.registrationUrl = "Please enter a valid Registration URL starting with http:// or https://";
    }

    // Section 5: Additional Information
    if (!formData.skills.trim()) {
      newErrors.skills = "Please enter at least one technology or skill.";
    }

    if (!formData.themes.trim()) {
      newErrors.themes = "Please enter at least one theme.";
    }

    if (!formData.eligibility.trim()) {
      newErrors.eligibility = "Please specify the eligibility criteria.";
    }

    if (formData.minTeamSize === "" || formData.minTeamSize === null || Number(formData.minTeamSize) < 1) {
      newErrors.minTeamSize = "Please enter a valid minimum team size.";
    }

    if (formData.maxTeamSize === "" || formData.maxTeamSize === null || Number(formData.maxTeamSize) < 1) {
      newErrors.maxTeamSize = "Please enter a valid maximum team size.";
    } else if (Number(formData.maxTeamSize) < Number(formData.minTeamSize)) {
      newErrors.maxTeamSize = "Max team size cannot be less than min team size.";
    }

    if (!formData.prizes.trim()) {
      newErrors.prizes = "Please enter prize information.";
    }

    if (!formData.fee.trim()) {
      newErrors.fee = "Please enter registration fee information.";
    }

    if (!formData.rules.trim()) {
      newErrors.rules = "Please enter rules & guidelines.";
    }

    if (!formData.contact.trim()) {
      newErrors.contact = "Please enter a contact number.";
    }

    if (Object.keys(newErrors).length > 0 || dateErr) {
      setErrors(newErrors);
      if (!errorMessage && !dateErr) {
        setErrorMessage("Please fix the highlighted errors before submitting.");
      }
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        organizerName: formData.organizerName.trim() || user?.name || "Organizer",
        registrationOpens: formData.registrationOpens || undefined,
        registrationDeadline: formData.registrationDeadline,
        startDate: formData.startDate,
        endDate: formData.endDate,
        format: formData.format,
        location:
          formData.format === "Online"
            ? { venue: "", city: "", country: "" }
            : {
                venue: formData.venue.trim(),
                city: formData.city.trim(),
                country: formData.country.trim(),
              },
        registrationUrl: formData.registrationUrl.trim(),
        skills: formData.skills.split(",").map((s) => s.trim()).filter(Boolean),
        themes: formData.themes.split(",").map((t) => t.trim()).filter(Boolean),
        eligibility: formData.eligibility.trim(),
        minTeamSize: Number(formData.minTeamSize) || 1,
        maxTeamSize: Number(formData.maxTeamSize) || 4,
        prizes: formData.prizes.trim(),
        rules: formData.rules.trim(),
        contact: formData.contact.trim(),
        fee: formData.fee.trim() || "Free",
      };

      await hackathonService.createHackathon(payload);

      // Redirect immediately to My Hackathons page
      navigate("/organizer/hackathons");
    } catch (err) {
      setErrorMessage(err.message || "Failed to add hackathon. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = `
    h-10
    w-full
    rounded-lg
    border
    border-neutral-200
    bg-white
    px-3.5
    text-sm
    text-neutral-900
    outline-none
    transition-colors
    focus:border-indigo-500
    focus:ring-1
    focus:ring-indigo-500/20
    dark:border-neutral-800
    dark:bg-neutral-950
    dark:text-white
    dark:focus:border-indigo-400
  `;

  const labelClass = "block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1";

  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* ── Page Header ── */}
      <div>
        <Link
          to="/organizer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white mb-2"
        >
          <span>← Back</span>
        </Link>
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
          ORGANIZER PORTAL
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl dark:text-white">
          Add Hackathon
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Publish your event to help developers discover and register on your platform.
        </p>
      </div>

      {/* Error Feedback */}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-600 dark:border-red-900/50 dark:bg-red-950/60 dark:text-red-300">
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ── Multi-Section Form ── */}
      <form onSubmit={handleSubmit} noValidate className="space-y-8">
        {/* Section 1: Basic Information */}
        <div className="space-y-5 rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              1. Basic Information
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Core identity and summary of your hackathon.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="title" className={labelClass}>
                Hackathon Name <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. India AI Innovation Challenge 2026"
                className={`${inputClass} ${errors.title ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
              />
              {errors.title && (
                <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                  {errors.title}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="organizerName" className={labelClass}>
                Organizer / Organization Name <span className="text-red-500">*</span>
              </label>
              <input
                id="organizerName"
                type="text"
                name="organizerName"
                value={formData.organizerName}
                onChange={handleChange}
                placeholder="e.g. TechCommunity India"
                className={`${inputClass} ${errors.organizerName ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
              />
              {errors.organizerName && (
                <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                  {errors.organizerName}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="description" className={labelClass}>
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                rows={5}
                value={formData.description}
                onChange={handleChange}
                placeholder="Comprehensive details about the hackathon goals, problem statements, guidelines, and target participants."
                className={`w-full rounded-lg border bg-white p-3.5 text-sm text-neutral-900 outline-none transition-colors dark:bg-neutral-950 dark:text-white ${
                  errors.description
                    ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                    : "border-neutral-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white dark:focus:border-indigo-400"
                }`}
              />
              {errors.description && (
                <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                  {errors.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Schedule */}
        <div className="space-y-5 rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              2. Schedule
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Registration dates and event execution window.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="registrationOpens" className={labelClass}>
                Registration Opens <span className="text-red-500">*</span>
              </label>
              <input
                id="registrationOpens"
                type="date"
                name="registrationOpens"
                value={formData.registrationOpens}
                onChange={handleChange}
                className={`${inputClass} ${errors.registrationOpens ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
              />
              {errors.registrationOpens && (
                <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                  {errors.registrationOpens}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="registrationDeadline" className={labelClass}>
                Registration Deadline <span className="text-red-500">*</span>
              </label>
              <input
                id="registrationDeadline"
                type="date"
                name="registrationDeadline"
                value={formData.registrationDeadline}
                onChange={handleChange}
                className={`${inputClass} ${errors.registrationDeadline ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
              />
              {errors.registrationDeadline && (
                <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                  {errors.registrationDeadline}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="startDate" className={labelClass}>
                Hackathon Start Date <span className="text-red-500">*</span>
              </label>
              <input
                id="startDate"
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className={`${inputClass} ${errors.startDate ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
              />
              {errors.startDate && (
                <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                  {errors.startDate}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="endDate" className={labelClass}>
                Hackathon End Date <span className="text-red-500">*</span>
              </label>
              <input
                id="endDate"
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className={`${inputClass} ${errors.endDate ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
              />
              {errors.endDate && (
                <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                  {errors.endDate}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Format & Location */}
        <div className="space-y-5 rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              3. Event Format
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Choose whether the event is held online, offline, or hybrid.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="format" className={labelClass}>
                Format <span className="text-red-500">*</span>
              </label>
              <select
                id="format"
                name="format"
                value={formData.format}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>

            {/* Display location fields conditionally when Offline or Hybrid */}
            {(formData.format === "Offline" || formData.format === "Hybrid") && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2">
                <div>
                  <label htmlFor="venue" className={labelClass}>
                    Venue <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="venue"
                    type="text"
                    name="venue"
                    value={formData.venue}
                    onChange={handleChange}
                    placeholder="e.g. KTPO Convention Center"
                    className={`${inputClass} ${errors.venue ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                  />
                  {errors.venue && (
                    <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                      {errors.venue}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="city" className={labelClass}>
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="city"
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="e.g. Bengaluru"
                    className={`${inputClass} ${errors.city ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                  />
                  {errors.city && (
                    <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                      {errors.city}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="country" className={labelClass}>
                    Country <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="country"
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    placeholder="e.g. India"
                    className={`${inputClass} ${errors.country ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                  />
                  {errors.country && (
                    <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                      {errors.country}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Registration */}
        <div className="space-y-5 rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              4. Registration Link
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Direct participants to your official external platform.
            </p>
          </div>

          <div>
            <label htmlFor="registrationUrl" className={labelClass}>
              External Registration Link <span className="text-red-500">*</span>
            </label>
            <input
              id="registrationUrl"
              type="url"
              name="registrationUrl"
              value={formData.registrationUrl}
              onChange={handleChange}
              placeholder="https://devfolio.co/my-hackathon or https://unstop.com/hackathon/example"
              className={`${inputClass} ${errors.registrationUrl ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
            />
            {errors.registrationUrl ? (
              <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                {errors.registrationUrl}
              </p>
            ) : (
              <p className="mt-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                Participants will be redirected to this link to complete registration.
              </p>
            )}
          </div>
        </div>

        {/* Section 5: Additional Information */}
        <div className="space-y-5 rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              5. Additional Information
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Specify themes, skills, eligibility, team size, and prizes.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="skills" className={labelClass}>
                Technologies / Skills <span className="text-red-500">*</span>
              </label>
              <input
                id="skills"
                type="text"
                name="skills"
                value={formData.skills}
                onChange={handleChange}
                placeholder="React, Python, Node.js, AI/ML"
                className={`${inputClass} ${errors.skills ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
              />
              {errors.skills && (
                <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                  {errors.skills}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="themes" className={labelClass}>
                Themes <span className="text-red-500">*</span>
              </label>
              <input
                id="themes"
                type="text"
                name="themes"
                value={formData.themes}
                onChange={handleChange}
                placeholder="Generative AI, Social Impact, FinTech"
                className={`${inputClass} ${errors.themes ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
              />
              {errors.themes && (
                <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                  {errors.themes}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="minTeamSize" className={labelClass}>
                Min Team Size <span className="text-red-500">*</span>
              </label>
              <input
                id="minTeamSize"
                type="number"
                min="1"
                max="10"
                name="minTeamSize"
                value={formData.minTeamSize}
                onChange={handleChange}
                className={`${inputClass} ${errors.minTeamSize ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
              />
              {errors.minTeamSize && (
                <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                  {errors.minTeamSize}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="maxTeamSize" className={labelClass}>
                Max Team Size <span className="text-red-500">*</span>
              </label>
              <input
                id="maxTeamSize"
                type="number"
                min="1"
                max="10"
                name="maxTeamSize"
                value={formData.maxTeamSize}
                onChange={handleChange}
                className={`${inputClass} ${errors.maxTeamSize ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
              />
              {errors.maxTeamSize && (
                <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                  {errors.maxTeamSize}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="prizes" className={labelClass}>
                Prizes <span className="text-red-500">*</span>
              </label>
              <input
                id="prizes"
                type="text"
                name="prizes"
                value={formData.prizes}
                onChange={handleChange}
                placeholder="e.g. ₹1,00,000 Total Prize Pool"
                className={`${inputClass} ${errors.prizes ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
              />
              {errors.prizes && (
                <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                  {errors.prizes}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="fee" className={labelClass}>
                Registration Fee <span className="text-red-500">*</span>
              </label>
              <input
                id="fee"
                type="text"
                name="fee"
                value={formData.fee}
                onChange={handleChange}
                placeholder="e.g. Free or ₹499"
                className={`${inputClass} ${errors.fee ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
              />
              {errors.fee && (
                <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                  {errors.fee}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="eligibility" className={labelClass}>
                Eligibility <span className="text-red-500">*</span>
              </label>
              <input
                id="eligibility"
                type="text"
                name="eligibility"
                value={formData.eligibility}
                onChange={handleChange}
                placeholder="Open to developers, students, and working professionals worldwide."
                className={`${inputClass} ${errors.eligibility ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
              />
              {errors.eligibility && (
                <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                  {errors.eligibility}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="rules" className={labelClass}>
                Rules <span className="text-red-500">*</span>
              </label>
              <textarea
                id="rules"
                name="rules"
                rows={3}
                value={formData.rules}
                onChange={handleChange}
                placeholder="Submission guidelines, code of conduct, and evaluation criteria."
                className={`w-full rounded-lg border bg-white p-3.5 text-sm text-neutral-900 outline-none transition-colors dark:bg-neutral-950 dark:text-white ${
                  errors.rules
                    ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                    : "border-neutral-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 dark:border-neutral-800 dark:focus:border-indigo-400"
                }`}
              />
              {errors.rules && (
                <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                  {errors.rules}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="contact" className={labelClass}>
                Contact <span className="text-red-500">*</span>
              </label>
              <input
                id="contact"
                type="text"
                name="contact"
                value={formData.contact}
                onChange={handleChange}
                placeholder="e.g. +91 9876543210 or hackathon@example.com"
                className={`${inputClass} ${errors.contact ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
              />
              {errors.contact && (
                <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                  {errors.contact}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Form Actions ── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => navigate("/organizer")}
            className="
              rounded-lg
              border
              border-neutral-200
              bg-white
              px-4
              py-2.5
              text-xs
              font-semibold
              text-neutral-700
              transition-colors
              hover:bg-neutral-50
              disabled:opacity-50
              dark:border-neutral-800
              dark:bg-neutral-900
              dark:text-neutral-300
              dark:hover:bg-neutral-800
            "
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="
              inline-flex
              items-center
              gap-2
              rounded-lg
              bg-indigo-600
              px-6
              py-2.5
              text-xs
              font-semibold
              text-white
              shadow-sm
              transition-colors
              hover:bg-indigo-500
              disabled:opacity-60
              dark:bg-indigo-500
              dark:hover:bg-indigo-400
            "
          >
            {submitting ? (
              <>
                <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10" />
                </svg>
                <span>Adding Hackathon...</span>
              </>
            ) : (
              <span>Add Hackathon</span>
            )}
          </button>
        </div>
      </form>
    </main>
  );
}

export default CreateHackathonPage;
