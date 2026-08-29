// ---------------------------------------------------------------------------
// GroupInfo.jsx — Detailed Group Information & Management Page (/group/:groupId)
// Displays group avatar, name, dynamic member count, description editing, member search,
// admin identification, admin avatar editing, admin group name editing, Add Members flow,
// and admin Member Removal with confirmation modal and backend authorization.
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../../context/useAuth";
import { chatService } from "../../../services/chatService";
import BackButton from "../../common/BackButton";
import AddGroupMembersModal from "./AddGroupMembersModal";

export default function GroupInfo() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Avatar upload / state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  // Group Name edit state
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameText, setNameText] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState(null);

  // Description edit state
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionText, setDescriptionText] = useState("");
  const [savingDescription, setSavingDescription] = useState(false);

  // Member search state
  const [searchQuery, setSearchQuery] = useState("");

  // Add members modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Removed-member read-only state (set from API response)
  const [isRemovedMember, setIsRemovedMember] = useState(false);

  // Remove member confirmation state
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  const currentUserId = currentUser?._id || currentUser?.id || "";

  useEffect(() => {
    if (!groupId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    async function fetchGroupDetails() {
      try {
        const res = await chatService.getGroupById(groupId);
        if (isMounted && res?.success && res.group) {
          setGroup(res.group);
          setNameText(res.group.name || "");
          setDescriptionText(res.group.description || "");
          setIsRemovedMember(Boolean(res.isRemovedMember));
        } else if (isMounted) {
          setError("Group not found or access denied.");
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to load group info:", err);
          setError(
            err.status === 403
              ? "You do not have permission to view this group."
              : "Group not found. This group may have been deleted or you may no longer have access."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchGroupDetails();

    return () => {
      isMounted = false;
    };
  }, [groupId]);

  const creatorIdStr = String(
    group?.creator?._id || group?.creator?.id || group?.creator || ""
  );

  // Authorization: Only the group creator/admin has management privileges
  // Removed members are NEVER admin, even if they were the creator (safety override)
  const isAdmin = !isRemovedMember && Boolean(currentUserId && creatorIdStr && String(currentUserId) === creatorIdStr);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin || uploadingAvatar) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (JPEG, PNG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be smaller than 5MB.");
      return;
    }

    setError(null);
    setUploadingAvatar(true);

    try {
      // 1. Upload file to storage endpoint
      const uploadRes = await chatService.uploadFile(file);
      const newAvatarUrl = uploadRes?.fileUrl || uploadRes?.url || uploadRes?.publicUrl;

      if (!newAvatarUrl) {
        throw new Error("Failed to upload avatar image.");
      }

      // 2. Persist new avatar in MongoDB (replaces old avatar reference and cleans up old file)
      const res = await chatService.updateGroupAvatar(groupId, newAvatarUrl);
      if (res?.success && res.group) {
        setGroup(res.group);
      } else {
        setError(res?.message || "Failed to update group avatar.");
      }
    } catch (err) {
      console.error("Avatar update failed:", err);
      setError(err.message || "Failed to update group avatar.");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSaveName = async () => {
    if (!groupId || savingName) return;
    const trimmed = nameText.trim();
    if (!trimmed) {
      setNameError("Group name cannot be empty.");
      return;
    }
    if (trimmed.length > 50) {
      setNameError("Group name cannot exceed 50 characters.");
      return;
    }

    setNameError(null);
    setSavingName(true);

    try {
      const res = await chatService.updateGroupName(groupId, trimmed);
      if (res?.success && res.group) {
        setGroup(res.group);
        setIsEditingName(false);
      } else {
        setNameError(res?.message || "Failed to update group name.");
      }
    } catch (err) {
      console.error("Failed to save group name:", err);
      setNameError(err.message || "Failed to update group name.");
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveDescription = async () => {
    if (!groupId || savingDescription) return;
    setSavingDescription(true);

    try {
      const res = await chatService.updateGroupDescription(groupId, descriptionText);
      if (res?.success && res.group) {
        setGroup(res.group);
        setIsEditingDescription(false);
      }
    } catch (err) {
      console.error("Failed to save description:", err);
    } finally {
      setSavingDescription(false);
    }
  };

  const handleCancelDescription = () => {
    setDescriptionText(group?.description || "");
    setIsEditingDescription(false);
  };

  const handleMembersAdded = (updatedGroup) => {
    if (updatedGroup) {
      setGroup(updatedGroup);
    }
  };

  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove || !groupId || isRemovingMember) return;
    setIsRemovingMember(true);
    setError(null);

    try {
      const res = await chatService.removeGroupMember(groupId, memberToRemove.id);
      if (res?.success && res.group) {
        setGroup(res.group);
        setMemberToRemove(null);
      } else {
        setError(res?.message || "Failed to remove member.");
      }
    } catch (err) {
      console.error("Remove member failed:", err);
      setError(err.message || "Failed to remove member from group.");
    } finally {
      setIsRemovingMember(false);
    }
  };

  // Filter members list based on searchQuery
  const membersList = Array.isArray(group?.members) ? group.members : [];
  const filteredMembers = membersList.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = (m.name || "").toLowerCase().includes(q);
    const roleMatch = (m.profile?.role || m.role || "").toLowerCase().includes(q);
    const bioMatch = (m.profile?.bio || "").toLowerCase().includes(q);
    const skillsMatch = Array.isArray(m.profile?.skills)
      ? m.profile.skills.some((s) => s.toLowerCase().includes(q))
      : false;
    const idMatch = String(m._id || m.id || "").toLowerCase().includes(q);

    return nameMatch || roleMatch || bioMatch || skillsMatch || idMatch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-neutral-900 transition-colors dark:bg-neutral-950 dark:text-neutral-100">
        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 space-y-6">
          <div className="h-8 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-8 border border-neutral-200 dark:border-neutral-800 flex flex-col items-center space-y-4 animate-pulse">
            <div className="h-24 w-24 rounded-full bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-6 w-48 bg-neutral-200 dark:bg-neutral-800 rounded" />
            <div className="h-4 w-24 bg-neutral-100 dark:bg-neutral-800/60 rounded" />
          </div>
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 space-y-3 animate-pulse">
            <div className="h-4 w-36 bg-neutral-200 dark:bg-neutral-800 rounded" />
            <div className="h-10 w-full bg-neutral-100 dark:bg-neutral-800/60 rounded" />
          </div>
        </main>
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="min-h-screen bg-slate-50 text-neutral-900 transition-colors dark:bg-neutral-950 dark:text-neutral-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl p-8 border border-neutral-200 dark:border-neutral-800 text-center space-y-4 shadow-xl">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
            Group Not Found
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {error || "This group may have been deleted or you may no longer have access."}
          </p>
          <div className="pt-2 flex justify-center">
            <BackButton fallbackPath="/messages" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-neutral-900 transition-colors dark:bg-neutral-950 dark:text-neutral-100 pb-16">
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 space-y-5">
        {/* Top-Left Back Button */}
        <div>
          <BackButton fallbackPath="/messages" />
        </div>
        {error && group && (
          <div className="text-xs font-medium text-rose-500 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-900/60">
            {error}
          </div>
        )}

        {/* Removed member informational banner */}
        {isRemovedMember && (
          <div className="rounded-xl bg-neutral-100/90 dark:bg-neutral-800/90 border border-neutral-200/80 dark:border-neutral-700/80 px-4 py-3 text-center space-y-0.5">
            <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              You were removed from this group.
            </p>
            <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              You can view group info but can no longer participate.
            </p>
          </div>
        )}

        {/* ── Group Profile Card ── */}
        <section className="bg-white dark:bg-neutral-900 rounded-2xl p-6 sm:p-8 border border-neutral-200 dark:border-neutral-800 shadow-2xs text-center flex flex-col items-center space-y-3.5">
          {/* Avatar Section */}
          <div className="relative">
            {/* Hidden File Input for Admin */}
            {isAdmin && (
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            )}

            {isAdmin ? (
              /* Admin Avatar - Interactive with Hover Overlay */
              <div
                onClick={() => !uploadingAvatar && fileInputRef.current?.click()}
                className="group relative cursor-pointer select-none rounded-full"
                title="Change group photo"
              >
                {group.avatar ? (
                  <img
                    src={group.avatar}
                    alt={group.name}
                    className="h-24 w-24 rounded-full object-cover border-2 border-neutral-200 dark:border-neutral-700 shadow-md transition-all group-hover:brightness-75"
                  />
                ) : (
                  <div className="grid h-24 w-24 place-items-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-2 border-neutral-200 dark:border-neutral-700 shadow-md transition-all group-hover:brightness-90">
                    <svg className="h-12 w-12 text-indigo-500 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                )}

                {/* Hover Overlay for Admin */}
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[11px] font-bold gap-1 p-1">
                  {uploadingAvatar ? (
                    <svg className="h-6 w-6 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10" />
                    </svg>
                  ) : (
                    <>
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      <span>Change photo</span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              /* Non-Admin Avatar - Plain & Non-interactive */
              <div className="relative select-none rounded-full">
                {group.avatar ? (
                  <img
                    src={group.avatar}
                    alt={group.name}
                    className="h-24 w-24 rounded-full object-cover border-2 border-neutral-200 dark:border-neutral-700 shadow-md"
                  />
                ) : (
                  <div className="grid h-24 w-24 place-items-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-2 border-neutral-200 dark:border-neutral-700 shadow-md">
                    <svg className="h-12 w-12 text-indigo-500 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Group Name & Member Count */}
          <div className="w-full flex flex-col items-center">
            {isEditingName ? (
              <div className="flex flex-col items-center gap-2 max-w-sm w-full">
                <input
                  type="text"
                  value={nameText}
                  onChange={(e) => {
                    setNameText(e.target.value);
                    if (nameError) setNameError(null);
                  }}
                  placeholder="Enter group name"
                  maxLength={50}
                  className="w-full text-center text-lg font-bold rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 p-2 text-neutral-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {nameError && (
                  <span className="text-[11px] font-medium text-rose-500">{nameError}</span>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setNameText(group.name);
                      setNameError(null);
                      setIsEditingName(false);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveName}
                    disabled={savingName}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
                  >
                    {savingName ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                  {group.name}
                </h2>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setNameText(group.name);
                      setNameError(null);
                      setIsEditingName(true);
                    }}
                    className="p-1 rounded-lg text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                    title="Edit group name"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            <p className="mt-1 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              {membersList.length} member{membersList.length === 1 ? "" : "s"}
            </p>
          </div>
        </section>

        {/* ── Group Description Card ── */}
        <section className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              About this group
            </h3>
            {isAdmin && group.description && !isEditingDescription && (
              <button
                type="button"
                onClick={() => setIsEditingDescription(true)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors cursor-pointer"
              >
                Edit
              </button>
            )}
          </div>

          {isEditingDescription ? (
            <div className="space-y-3 pt-1">
              <textarea
                value={descriptionText}
                onChange={(e) => setDescriptionText(e.target.value)}
                placeholder="What is this group about?"
                rows={3}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 p-3 text-xs text-neutral-800 placeholder-neutral-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancelDescription}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDescription}
                  disabled={savingDescription}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
                >
                  {savingDescription ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          ) : group.description ? (
            <p className="text-xs text-neutral-700 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap">
              {group.description}
            </p>
          ) : isAdmin ? (
            <button
              type="button"
              onClick={() => setIsEditingDescription(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors py-1 cursor-pointer"
            >
              <span>+ Add group description</span>
            </button>
          ) : (
            <p className="text-xs text-neutral-400 dark:text-neutral-500 italic">
              No description provided.
            </p>
          )}
        </section>

        {/* ── Group Actions Bar ── */}
        <section className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-200 dark:border-neutral-800 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Add Member Button — Admin Only */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-semibold text-xs transition-colors shadow-xs cursor-pointer shrink-0"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="17" y1="11" x2="23" y2="11" />
              </svg>
              <span>Add member</span>
            </button>
          )}

          {/* Search Members Bar */}
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search group members..."
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 py-2 pl-9 pr-3 text-xs text-neutral-800 placeholder-neutral-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500 transition-colors"
            />
          </div>
        </section>

        {/* ── Group Members List Section ── */}
        <section className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Members · {membersList.length}
            </h3>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
            {filteredMembers.length === 0 ? (
              <div className="p-8 text-center space-y-1.5">
                <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  No members found
                </p>
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                  Try a different name or getHack ID.
                </p>
              </div>
            ) : (
              filteredMembers.map((member) => {
                const memberId = String(member._id || member.id || "");
                const isCreator = memberId === creatorIdStr;
                const memberAvatar = member.profile?.avatar || member.avatar || "";
                const memberRole = member.profile?.role || member.role || "";
                const initials = (member.name || "Member")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <div
                    key={memberId}
                    onClick={() => memberId && navigate(`/profile/${memberId}`)}
                    className="flex items-center justify-between p-4 hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Avatar */}
                      {memberAvatar ? (
                        <img
                          src={memberAvatar}
                          alt={member.name}
                          className="h-10 w-10 rounded-full object-cover border border-neutral-200 dark:border-neutral-700 shrink-0 group-hover:opacity-90 transition-opacity"
                        />
                      ) : (
                        <div className="grid h-10 w-10 place-items-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-xs border border-neutral-200 dark:border-neutral-700 shrink-0 group-hover:opacity-90 transition-opacity">
                          {initials}
                        </div>
                      )}

                      {/* Name & Role */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-neutral-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {member.name}
                          </p>
                          {isCreator && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 shrink-0">
                              Admin
                            </span>
                          )}
                        </div>
                        {memberRole && (
                          <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 truncate">
                            {memberRole}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Admin Remove Button — Only for Non-Admin Members */}
                    {isAdmin && !isCreator && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMemberToRemove({ id: memberId, name: member.name });
                        }}
                        className="ml-3 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      {/* Add Members Modal — Rendered only if Admin opens it */}
      <AddGroupMembersModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        groupId={group.id || group._id || groupId}
        existingMemberIds={membersList.map((m) => String(m._id || m.id || m))}
        onMembersAdded={handleMembersAdded}
      />

      {/* Remove Member Confirmation Modal */}
      {memberToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="18" y1="8" x2="23" y2="13" />
                  <line x1="23" y1="8" x2="18" y2="13" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Remove member?
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Are you sure you want to remove <span className="font-semibold text-neutral-800 dark:text-neutral-200">{memberToRemove.name}</span> from this group?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                disabled={isRemovingMember}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveMember}
                disabled={isRemovingMember}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
              >
                {isRemovingMember ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
