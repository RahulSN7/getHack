// ---------------------------------------------------------------------------
// CreateTeamModal.jsx — Modal component for creating a new hackathon team
// Follows getHack form & modal design system
// ---------------------------------------------------------------------------

import { useState } from "react";
import { HACKATHONS } from "../../../data/hackathons";
import { useAuth } from "../../../context/useAuth";
import { teamService } from "../../../services/teamService";

export default function CreateTeamModal({ isOpen, onClose, onCreateTeam }) {
  const { user: currentUser } = useAuth();
  const [hackathonId, setHackathonId] = useState(HACKATHONS[0]?.id || "");
  const [teamName, setTeamName] = useState("");
  const [description, setDescription] = useState("");
  const [maxSize, setMaxSize] = useState("4");
  const [techInput, setTechInput] = useState("");
  const [techStack, setTechStack] = useState(["React", "Node.js"]);
  const [roleInput, setRoleInput] = useState("");
  const [rolesNeeded, setRolesNeeded] = useState(["Backend Developer"]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddTech = (e) => {
    e.preventDefault();
    if (techInput.trim() && !techStack.includes(techInput.trim())) {
      setTechStack([...techStack, techInput.trim()]);
      setTechInput("");
    }
  };

  const handleRemoveTech = (techToRemove) => {
    setTechStack(techStack.filter((t) => t !== techToRemove));
  };

  const handleAddRole = (e) => {
    e.preventDefault();
    if (roleInput.trim() && !rolesNeeded.includes(roleInput.trim())) {
      setRolesNeeded([...rolesNeeded, roleInput.trim()]);
      setRoleInput("");
    }
  };

  const handleRemoveRole = (roleToRemove) => {
    setRolesNeeded(rolesNeeded.filter((r) => r !== roleToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!teamName.trim()) {
      newErrors.teamName = "Team name is required";
    } else if (teamName.trim().length < 3) {
      newErrors.teamName = "Team name must be at least 3 characters";
    }

    if (!description.trim()) {
      newErrors.description = "Team description is required";
    } else if (description.trim().length < 10) {
      newErrors.description = "Description must be at least 10 characters";
    }

    if (!hackathonId) {
      newErrors.hackathonId = "Please select a hackathon";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    const selectedHackathon = HACKATHONS.find((h) => h.id === hackathonId) || HACKATHONS[0];

    const payload = {
      teamName: teamName.trim(),
      hackathon: hackathonId,
      hackathonName: selectedHackathon?.name || selectedHackathon?.title || "Hackathon",
      description: description.trim(),
      rolesNeeded: rolesNeeded.length > 0 ? rolesNeeded : ["Developer"],
      techStack: techStack.length > 0 ? techStack : ["React"],
      maxSize: parseInt(maxSize, 10),
      location: "Remote",
      accent: "indigo",
    };

    try {
      const res = await teamService.createTeam(payload);
      const createdTeam = res?.team || {
        id: `team-${Date.now()}`,
        ...payload,
        currentSize: 1,
        createdBy: currentUser?.id || currentUser?._id || "current-user",
        memberIds: [currentUser?.id || currentUser?._id || "current-user"],
      };

      if (onCreateTeam) {
        onCreateTeam(createdTeam);
      }
      onClose();
    } catch (err) {
      console.error("Modal create team error:", err);
      setErrors({ form: err.message || "Failed to create team. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4 dark:border-neutral-800">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              Create a Team
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Form a new team and recruit developers for an upcoming hackathon.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Hackathon Select */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Select Hackathon <span className="text-red-500">*</span>
            </label>
            <select
              value={hackathonId}
              onChange={(e) => setHackathonId(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white p-2.5 text-xs text-neutral-900 focus:border-indigo-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            >
              {HACKATHONS.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name || h.title}
                </option>
              ))}
            </select>
            {errors.hackathonId && (
              <p className="mt-1 text-[11px] text-red-500">{errors.hackathonId}</p>
            )}
          </div>

          {/* Team Name */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Team Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. AI Healthcare Innovators"
              className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white p-2.5 text-xs text-neutral-900 focus:border-indigo-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
            {errors.teamName && (
              <p className="mt-1 text-[11px] text-red-500">{errors.teamName}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Team Description <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefly describe what your team is building and what problem it solves..."
              className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white p-2.5 text-xs text-neutral-900 focus:border-indigo-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
            {errors.description && (
              <p className="mt-1 text-[11px] text-red-500">{errors.description}</p>
            )}
          </div>

          {/* Max Team Size */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Maximum Team Size
            </label>
            <select
              value={maxSize}
              onChange={(e) => setMaxSize(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white p-2.5 text-xs text-neutral-900 focus:border-indigo-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            >
              <option value="2">2 Members</option>
              <option value="3">3 Members</option>
              <option value="4">4 Members (Standard)</option>
              <option value="5">5 Members</option>
            </select>
          </div>

          {/* Roles Needed */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Roles Needed
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                type="text"
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                placeholder="e.g. ML Engineer"
                className="flex-1 rounded-lg border border-neutral-300 bg-white p-2 text-xs text-neutral-900 focus:border-indigo-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddRole}
                className="rounded-lg bg-neutral-950 px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
              >
                + Add
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {rolesNeeded.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1 rounded-md bg-indigo-500/10 px-2 py-0.5 text-[11px] font-medium text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
                >
                  {r}
                  <button
                    type="button"
                    onClick={() => handleRemoveRole(r)}
                    className="hover:text-indigo-900 dark:hover:text-white"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Tech Stack */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Tech Stack & Skills Required
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                type="text"
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                placeholder="e.g. Python, TensorFlow"
                className="flex-1 rounded-lg border border-neutral-300 bg-white p-2 text-xs text-neutral-900 focus:border-indigo-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddTech}
                className="rounded-lg bg-neutral-950 px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
              >
                + Add
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {techStack.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => handleRemoveTech(t)}
                    className="hover:text-neutral-900 dark:hover:text-white"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              Create Team
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
