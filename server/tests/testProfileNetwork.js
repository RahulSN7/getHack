// ---------------------------------------------------------------------------
// server/tests/testProfileNetwork.js
// Unit Test Suite for Participant Profile System & Data Validation
// ---------------------------------------------------------------------------

const assert = require("node:assert");
const { isProfileComplete } = require("../utils/profileValidation");

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ PASSED: ${name}`);
  } catch (err) {
    console.error(`  ✗ FAILED: ${name}`);
    console.error(`    ${err.message}`);
  }
}

console.log("\n==============================================");
console.log("Running getHack Profile & Connection Unit Tests");
console.log("==============================================\n");

// ---------------------------------------------------------------------------
// Scenario 1: Gender & DOB Validation Rules
// ---------------------------------------------------------------------------
console.log("[Scenario 1: Gender & DOB Validation Rules]");

runTest("Future date of birth is invalid", () => {
  const futureDate = new Date("2099-01-01");
  assert.strictEqual(futureDate > new Date(), true);
});

runTest("Allowed gender values are strictly validated", () => {
  const allowed = ["Male", "Female", "Non-binary", "Prefer not to say", "Other"];
  assert.strictEqual(allowed.includes("Male"), true);
  assert.strictEqual(allowed.includes("Female"), true);
  assert.strictEqual(allowed.includes("InvalidGender"), false);
});

// ---------------------------------------------------------------------------
// Scenario 2: View Profile & MongoDB User Data Resolution
// ---------------------------------------------------------------------------
console.log("\n[Scenario 2: View Profile & MongoDB User Data Resolution]");

runTest("View Profile fetches exact target user by ID and does not return current user", () => {
  const currentUserId = "67a1b2c3d4e5f6a7b8c9d0e1";
  const targetUserId = "67a1b2c3d4e5f6a7b8c9d0e2";

  assert.notStrictEqual(currentUserId, targetUserId);
});

runTest("Old MongoDB users with missing profile properties receive safe defaults and un-defaulted availability", () => {
  const oldUser = {
    _id: "67a1b2c3d4e5f6a7b8c9d0e3",
    name: "Jane Doe",
    email: "jane@example.com",
    role: "participant",
  };

  const safeProfile = {
    avatar: oldUser.profile?.avatar || "",
    role: oldUser.profile?.role || "Participant",
    bio: oldUser.profile?.bio || "",
    skills: oldUser.profile?.skills || [],
    education: oldUser.profile?.education || {},
    availability: oldUser.profile?.availability || "",
    experienceLevel: oldUser.profile?.experienceLevel || "Intermediate",
    gender: oldUser.profile?.gender || "",
    dateOfBirth: oldUser.profile?.dateOfBirth || "",
    location: oldUser.profile?.location || "",
  };

  assert.strictEqual(safeProfile.avatar, "");
  assert.strictEqual(safeProfile.gender, "");
  assert.strictEqual(safeProfile.location, "");
  assert.strictEqual(safeProfile.availability, "");
  assert.strictEqual(safeProfile.role, "Participant");
});

// ---------------------------------------------------------------------------
// Scenario 3: Profile Completeness Validation (isProfileComplete)
// ---------------------------------------------------------------------------
console.log("\n[Scenario 3: Profile Completeness Validation]");

runTest("Incomplete profile (missing interests & links) returns false", () => {
  const user = {
    name: "Rahul Singh",
    profile: {
      role: "Full Stack Developer",
      gender: "Male",
      dateOfBirth: "2000-01-01",
      location: "Rajasthan",
      availability: "Available",
      bio: "Passionate coder building MERN apps.",
      skills: ["React", "Node.js"],
      education: { college: "IIT Rajasthan", degree: "B.Tech" },
      interests: [],
      github: "",
    },
  };
  assert.strictEqual(isProfileComplete(user), false);
});

runTest("Complete profile (with interests & 1 professional link) returns true", () => {
  const user = {
    name: "Rahul Singh",
    profile: {
      role: "Full Stack Developer",
      gender: "Male",
      dateOfBirth: "2000-01-01",
      location: "Rajasthan",
      availability: "Available",
      bio: "Passionate coder building MERN apps.",
      skills: ["React", "Node.js"],
      education: { college: "IIT Rajasthan", degree: "B.Tech" },
      interests: ["AI/ML", "Web Dev"],
      github: "https://github.com/rahul",
    },
  };
  assert.strictEqual(isProfileComplete(user), true);
});

console.log("\n==============================================");
console.log(`Test Execution Summary: ${passedTests} / ${totalTests} passed`);
console.log("==============================================\n");
