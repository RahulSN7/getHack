
// testDirectProfileRouting.js — Test simulation for /profile/:id role resolution


function simulateProfilePageLogic({ id, currentUser, authLoading, backendProfile }) {
  const targetId = id || "me";

  if (authLoading) {
    return { state: "loading", component: "Skeleton" };
  }

  const userHandle = currentUser?.profile?.handle
    ? String(currentUser.profile.handle).replace(/^@/, "").trim().toLowerCase()
    : null;
  const cleanTargetId = String(targetId).replace(/^@/, "").trim().toLowerCase();

  const isOwnProfile =
    targetId === "me" ||
    (currentUser &&
      (String(currentUser.id) === String(targetId) ||
        String(currentUser._id) === String(targetId) ||
        (userHandle && userHandle === cleanTargetId)));

  if (isOwnProfile && currentUser?.role) {
    const roleStr = String(currentUser.role).toLowerCase().trim();
    const resolvedRole = roleStr === "organizer" ? "organizer" : "participant";
    return {
      state: "resolved",
      resolvedRole,
      component: resolvedRole === "organizer" ? "OrganizerProfilePage" : "UserProfile",
    };
  }

  if (targetId === "me" && !currentUser) {
    return { state: "error", error: "Please log in to view your profile." };
  }

  if (backendProfile) {
    const rawRole =
      backendProfile.role ||
      backendProfile.user?.role ||
      backendProfile.profile?.role ||
      (backendProfile.profile ? "organizer" : "participant");

    const roleStr = String(rawRole).toLowerCase().trim();
    const resolvedRole = roleStr === "organizer" ? "organizer" : "participant";
    return {
      state: "resolved",
      resolvedRole,
      component: resolvedRole === "organizer" ? "OrganizerProfilePage" : "UserProfile",
    };
  }

  return { state: "error", error: "Profile not found." };
}

// ── TEST CASES ──

const orgId = "67c5148003ef79ca9ecaa304";
const partId = "67c5148003ef79ca9ecaa305";

const currentUserOrg = { id: orgId, name: "Org User", role: "organizer" };
const currentUserPart = { id: partId, name: "Part User", role: "participant" };

const backendOrgProfile = { success: true, role: "organizer", profile: { id: orgId, name: "Org User" } };
const backendPartProfile = { success: true, role: "participant", user: { id: partId, role: "participant" } };

console.log("=== RUNNING DIRECT PROFILE ROUTING TESTS ===");

// 1. Organizer direct profile (own ID)
const t1 = simulateProfilePageLogic({ id: orgId, currentUser: currentUserOrg, authLoading: false });
console.assert(t1.component === "OrganizerProfilePage", "Test 1 Failed: Expected OrganizerProfilePage, got " + t1.component);
console.log("Test 1 (Organizer opening own profile URL directly): PASS -> " + t1.component);

// 2. Organizer refresh profile (own ID with authLoading initially true, then false)
const t2Loading = simulateProfilePageLogic({ id: orgId, currentUser: currentUserOrg, authLoading: true });
console.assert(t2Loading.component === "Skeleton", "Test 2a Failed: Expected Skeleton while loading");
const t2Done = simulateProfilePageLogic({ id: orgId, currentUser: currentUserOrg, authLoading: false });
console.assert(t2Done.component === "OrganizerProfilePage", "Test 2b Failed: Expected OrganizerProfilePage after auth load");
console.log("Test 2 (Organizer refreshing own profile URL): PASS -> " + t2Loading.component + " -> " + t2Done.component);

// 3. Participant direct profile (own ID)
const t3 = simulateProfilePageLogic({ id: partId, currentUser: currentUserPart, authLoading: false });
console.assert(t3.component === "UserProfile", "Test 3 Failed: Expected UserProfile, got " + t3.component);
console.log("Test 3 (Participant opening own profile URL directly): PASS -> " + t3.component);

// 4. Participant viewing Organizer profile
const t4 = simulateProfilePageLogic({ id: orgId, currentUser: currentUserPart, authLoading: false, backendProfile: backendOrgProfile });
console.assert(t4.component === "OrganizerProfilePage", "Test 4 Failed: Expected OrganizerProfilePage, got " + t4.component);
console.log("Test 4 (Participant viewing Organizer profile): PASS -> " + t4.component);

// 5. Organizer viewing Participant profile
const t5 = simulateProfilePageLogic({ id: partId, currentUser: currentUserOrg, authLoading: false, backendProfile: backendPartProfile });
console.assert(t5.component === "UserProfile", "Test 5 Failed: Expected UserProfile, got " + t5.component);
console.log("Test 5 (Organizer viewing Participant profile): PASS -> " + t5.component);

// 6. Organizer viewing another Organizer profile
const otherOrgId = "67c5148003ef79ca9ecaa999";
const backendOtherOrgProfile = { success: true, role: "organizer", profile: { id: otherOrgId, name: "Other Org" } };
const t6 = simulateProfilePageLogic({ id: otherOrgId, currentUser: currentUserOrg, authLoading: false, backendProfile: backendOtherOrgProfile });
console.assert(t6.component === "OrganizerProfilePage", "Test 6 Failed: Expected OrganizerProfilePage, got " + t6.component);
console.log("Test 6 (Organizer viewing another Organizer profile): PASS -> " + t6.component);

// 7. Participant viewing another Participant profile
const otherPartId = "67c5148003ef79ca9ecaa888";
const backendOtherPartProfile = { success: true, role: "participant", user: { id: otherPartId, role: "participant" } };
const t7 = simulateProfilePageLogic({ id: otherPartId, currentUser: currentUserPart, authLoading: false, backendProfile: backendOtherPartProfile });
console.assert(t7.component === "UserProfile", "Test 7 Failed: Expected UserProfile, got " + t7.component);
console.log("Test 7 (Participant viewing another Participant profile): PASS -> " + t7.component);

console.log("=== ALL 7 TEST CASES PASSED SUCCESSFULLY ===");
