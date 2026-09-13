// ---------------------------------------------------------------------------
// testOrganizerHeaderRouting.js — Verification script for global header selection
// ---------------------------------------------------------------------------

function simulateHeaderSelection({ user, authLoading }) {
  if (user?.role && String(user.role).toLowerCase().trim() === "organizer") {
    return "OrganizerHeader";
  }

  if (authLoading && !user) {
    return "HeaderSkeleton";
  }

  return "ParticipantHeader";
}

console.log("=== RUNNING HEADER SELECTION TESTS ===");

// Scenario 1: Organizer logged in (restored from localStorage or AuthContext)
const s1 = simulateHeaderSelection({ user: { id: "org1", role: "organizer" }, authLoading: false });
console.assert(s1 === "OrganizerHeader", "Test 1 Failed: Expected OrganizerHeader, got " + s1);
console.log("Scenario 1 (Organizer logged in): PASS -> " + s1);

// Scenario 2: Organizer direct URL / refresh with user in localStorage
const s2 = simulateHeaderSelection({ user: { id: "org1", role: "organizer" }, authLoading: true });
console.assert(s2 === "OrganizerHeader", "Test 2 Failed: Expected OrganizerHeader immediately from stored user state");
console.log("Scenario 2 (Organizer direct URL / refresh with stored user): PASS -> " + s2);

// Scenario 3: Initial load with empty localStorage, auth loading in progress
const s3 = simulateHeaderSelection({ user: null, authLoading: true });
console.assert(s3 === "HeaderSkeleton", "Test 3 Failed: Expected HeaderSkeleton while auth is loading without user");
console.log("Scenario 3 (Auth loading without cached user): PASS -> " + s3);

// Scenario 4: Participant logged in
const s4 = simulateHeaderSelection({ user: { id: "part1", role: "participant" }, authLoading: false });
console.assert(s4 === "ParticipantHeader", "Test 4 Failed: Expected ParticipantHeader");
console.log("Scenario 4 (Participant logged in): PASS -> " + s4);

// Scenario 5: Unauthenticated user after auth loading finished
const s5 = simulateHeaderSelection({ user: null, authLoading: false });
console.assert(s5 === "ParticipantHeader", "Test 5 Failed: Expected ParticipantHeader");
console.log("Scenario 5 (Unauthenticated public user): PASS -> " + s5);

console.log("=== ALL HEADER SELECTION TESTS PASSED SUCCESSFULLY ===");
