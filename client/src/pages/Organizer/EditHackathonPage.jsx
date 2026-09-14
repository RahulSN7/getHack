// ---------------------------------------------------------------------------
// EditHackathonPage.jsx — Pre-filled Multi-Section Hackathon Edit Form
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { hackathonService } from "../../services/hackathonService";
import { chatService } from "../../services/chatService";
import { ORGANIZER_HACKATHONS } from "../../data/organizerData";
import BackButton from "../../components/common/BackButton";

function formatDateForInput(dateVal) {
  if (!dateVal) return "";

  // If dateVal is already a YYYY-MM-DD string (e.g. "2026-09-15" or "2026-09-15T...")
  if (typeof dateVal === "string") {
    const trimmed = dateVal.trim();
    const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) {
      return match[1];
    }
  }

  // If it's a Date object or ISO timestamp
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";

    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return "";
  }
}

function EditHackathonPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    organizerName: "",
    image: "",
    hostedOn: "",
    registrationOpens: "",
    registrationDeadline: "",
    startDate: "",
    endDate: "",
    format: "Online",
    venue: "",
    city: "",
    country: "",
    registrationUrl: "",
    prizes: "",
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError("");

    if (!file.type.startsWith("image/")) {
      setPhotoError("Please select a valid image file (PNG, JPG, WebP, GIF, SVG).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setPhotoError("Image size must be less than 10MB.");
      return;
    }

    setPhotoFile(file);
    try {
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview("");
    setPhotoError("");
  };

  useEffect(() => {
    let isMounted = true;
    async function loadHackathon() {
      try {
        setLoading(true);
        console.log("Hackathon ID:", id);

        let h = null;
        try {
          const res = await hackathonService.getOrganizerHackathonById(id);
          h = res?.hackathon || res?.data;
        } catch {
          try {
            const res = await hackathonService.getHackathonById(id);
            h = res?.hackathon || res?.data;
          } catch {
            const staticItem = ORGANIZER_HACKATHONS.find((item) => item.id === id);
            if (staticItem) h = staticItem;
          }
        }

        console.log("Fetched hackathon:", h);

        if (isMounted && h) {
          const startDateRaw = h.startDate || h.event?.startDate || h.eventStartDate;
          const endDateRaw = h.endDate || h.event?.endDate || h.eventEndDate;
          const regOpensRaw = h.registrationOpens || h.registration?.startDate || h.registrationStart;
          const regDeadlineRaw = h.registrationDeadline || h.registration?.deadline || h.deadline;

          console.log("Saved start date:", startDateRaw);
          console.log("Saved end date:", endDateRaw);

          const formattedStartDate = formatDateForInput(startDateRaw);
          const formattedEndDate = formatDateForInput(endDateRaw);

          console.log("Edit form start date:", formattedStartDate);
          console.log("Edit form end date:", formattedEndDate);

          const existingImage = h.image || h.photo || h.logo || h.hackathonImage || "";
          setPhotoPreview(existingImage);

          setFormData({
            title: h.title || h.name || "",
            description: h.description || "",
            organizerName:
              h.organizerName ||
              (typeof h.organizer === "object" ? h.organizer?.name : h.organizer) ||
              "",
            image: existingImage,
            hostedOn: h.hostedOn || h.platform || (typeof h.source === "object" ? h.source?.platform : "") || "",
            registrationOpens: formatDateForInput(regOpensRaw),
            registrationDeadline: formatDateForInput(regDeadlineRaw),
            startDate: formattedStartDate,
            endDate: formattedEndDate,
            format: h.format || h.mode || h.event?.mode || "Online",
            venue: h.location?.venue || h.venue || "",
            city: h.location?.city || h.city || "",
            country: h.location?.country || h.country || "",
            registrationUrl: h.registrationUrl || h.url || h.source?.externalUrl || "",
            prizes:
              typeof h.prizes === "string"
                ? h.prizes
                : h.prizePool?.description || h.prizes || "",
          });
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage(err.message || "Failed to load hackathon details.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadHackathon();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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

    if (!formData.title.trim()) {
      setErrorMessage("Hackathon Name is required.");
      return;
    }

    if (!formData.description.trim()) {
      setErrorMessage("Detailed Description is required.");
      return;
    }

    if (!formData.registrationUrl.trim()) {
      setErrorMessage("External Registration Link is required.");
      return;
    }

    if (!validateUrl(formData.registrationUrl.trim())) {
      setErrorMessage("Please enter a valid Registration URL starting with http:// or https://");
      return;
    }

    const dateErr = validateDates();
    if (dateErr) {
      setErrorMessage(dateErr);
      return;
    }

    try {
      setSubmitting(true);

      let finalImageUrl = photoPreview && !photoPreview.startsWith("blob:") ? photoPreview : "";
      if (photoFile) {
        try {
          const res = await chatService.uploadFile(photoFile);
          const uploadedUrl = res?.fileUrl || res?.publicUrl || res?.url;
          if (uploadedUrl) {
            finalImageUrl = uploadedUrl;
          } else {
            finalImageUrl = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(photoFile);
            });
          }
        } catch {
          finalImageUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(photoFile);
          });
        }
      }

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        organizerName: formData.organizerName.trim(),
        image: finalImageUrl,
        hostedOn: formData.hostedOn.trim() || undefined,
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
        prizes: formData.prizes.trim(),
      };

      await hackathonService.updateHackathon(id, payload);

      // Return to My Hackathons
      navigate("/organizer/hackathons");
    } catch (err) {
      setErrorMessage(err.message || "Failed to update hackathon.");
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

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
          <svg className="h-4 w-4 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10" />
          </svg>
          <span>Loading hackathon details...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* ── Page Header ── */}
      <div className="space-y-4">
        <div>
          <BackButton fallbackPath="/organizer/hackathons" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            ORGANIZER PORTAL
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl dark:text-white">
            Edit Hackathon
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Update the hackathon details, schedule, or external registration link.
          </p>
        </div>
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
      <form onSubmit={handleSubmit} className="space-y-8">
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
                required
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter hackathon name (e.g. India AI Innovation Challenge 2026)"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="organizerName" className={labelClass}>
                Organizer / Organization Name <span className="text-red-500">*</span>
              </label>
              <input
                id="organizerName"
                type="text"
                name="organizerName"
                required
                value={formData.organizerName}
                onChange={handleChange}
                placeholder="Enter organizer or organization name (e.g. Google Developer Student Club)"
                className={inputClass}
              />
            </div>

            {/* Hackathon Photo Section */}
            <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-950/40 space-y-3">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Hackathon Photo / Logo
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {photoPreview ? (
                  <div className="relative group shrink-0">
                    <img
                      src={photoPreview}
                      alt="Hackathon preview"
                      className="h-20 w-20 rounded-xl object-cover ring-1 ring-black/5 dark:ring-white/10"
                    />
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-red-600 text-white text-[10px] shadow-sm hover:bg-red-700 transition-colors"
                      title="Remove Photo"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-indigo-50 border-2 border-dashed border-indigo-200 text-indigo-400 dark:bg-neutral-900 dark:border-neutral-800">
                    <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                  </div>
                )}

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                      <svg className="h-4 w-4 text-neutral-500 dark:text-neutral-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      <span>{photoPreview ? "Change Photo" : "Upload Photo"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {photoError && (
                    <p className="text-xs font-medium text-red-600 dark:text-red-400">
                      {photoError}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="hostedOn" className={labelClass}>
                Hosted On
              </label>
              <input
                id="hostedOn"
                type="text"
                name="hostedOn"
                value={formData.hostedOn}
                onChange={handleChange}
                placeholder="e.g. Unstop, Devfolio, Devpost"
                className={inputClass}
              />
              <p className="mt-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                Optional: Platform where your hackathon is hosted or listed.
              </p>
            </div>

            <div>
              <label htmlFor="description" className={labelClass}>
                Detailed Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                required
                rows={5}
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your hackathon, problem statements, guidelines, and target participants"
                className="w-full rounded-lg border border-neutral-200 bg-white p-3.5 text-sm text-neutral-900 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white dark:focus:border-indigo-400"
              />
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
                Registration Opens
              </label>
              <input
                id="registrationOpens"
                type="date"
                name="registrationOpens"
                value={formData.registrationOpens}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="registrationDeadline" className={labelClass}>
                Registration Deadline <span className="text-red-500">*</span>
              </label>
              <input
                id="registrationDeadline"
                type="date"
                name="registrationDeadline"
                required
                value={formData.registrationDeadline}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="startDate" className={labelClass}>
                Hackathon Start Date <span className="text-red-500">*</span>
              </label>
              <input
                id="startDate"
                type="date"
                name="startDate"
                required
                value={formData.startDate}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="endDate" className={labelClass}>
                Hackathon End Date <span className="text-red-500">*</span>
              </label>
              <input
                id="endDate"
                type="date"
                name="endDate"
                required
                value={formData.endDate}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Format & Location */}
        <div className="space-y-5 rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              3. Event Format
            </h2>
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

            {(formData.format === "Offline" || formData.format === "Hybrid") && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2">
                <div>
                  <label htmlFor="venue" className={labelClass}>
                    Venue
                  </label>
                  <input
                    id="venue"
                    type="text"
                    name="venue"
                    value={formData.venue}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="city" className={labelClass}>
                    City
                  </label>
                  <input
                    id="city"
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="country" className={labelClass}>
                    Country
                  </label>
                  <input
                    id="country"
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Registration Link */}
        <div className="space-y-5 rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              4. Registration Link
            </h2>
          </div>

          <div>
            <label htmlFor="registrationUrl" className={labelClass}>
              External Registration Link <span className="text-red-500">*</span>
            </label>
            <input
              id="registrationUrl"
              type="url"
              name="registrationUrl"
              required
              value={formData.registrationUrl}
              onChange={handleChange}
              className={inputClass}
            />
            <p className="mt-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
              Participants will be redirected to this link to complete registration.
            </p>
          </div>
        </div>

        {/* Section 5: Additional Information */}
        <div className="space-y-5 rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              5. Additional Information
            </h2>
          </div>

          <div className="space-y-4">

            <div>
              <label htmlFor="prizes" className={labelClass}>
                Prize Information
              </label>
              <input
                id="prizes"
                type="text"
                name="prizes"
                value={formData.prizes}
                onChange={handleChange}
                className={inputClass}
              />
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
                <span>Updating Hackathon...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </form>
    </main>
  );
}

export default EditHackathonPage;
