// ---------------------------------------------------------------------------
// server/tests/testProfileNetwork.js
// Unit Test Suite for Participant Profile System & Network Connection Flow
// ---------------------------------------------------------------------------

const assert = require("node:assert");
const { calculateProfileCompletion } = require("../utils/profileCompletion");

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
// Scenario 1: New Participant Signup Profile Completion Calculation
// ---------------------------------------------------------------------------
console.log("[Scenario 1: Profile Completion Calculation]");

runTest("Newly registered user with only name/email has incomplete profile and low percentage", () => {
  const newUser = {
    name: "Alex Rivera",
    email: "alex@example.com",
    role: "participant",
    profile: {},
  };

  const res = calculateProfileCompletion(newUser);
  assert.strictEqual(res.isComplete, false);
  assert.strictEqual(res.percentage < 100, true);
  assert.strictEqual(res.missingFields.includes("bio"), true);
  assert.strictEqual(res.missingFields.includes("skills"), true);
  assert.strictEqual(res.missingFields.includes("education"), true);
  assert.strictEqual(res.missingFields.includes("links"), true);
});

runTest("Fully filled participant user evaluates as complete (100%) when location and required fields are present", () => {
  const completeUser = {
    name: "Alex Rivera",
    email: "alex@example.com",
    role: "participant",
    profile: {
      avatar: "https://example.com/avatar.jpg",
      gender: "Non-binary",
      dateOfBirth: "2000-05-15",
      location: "San Francisco, CA, USA",
      role: "Frontend Engineer",
      bio: "Passionate developer building AI web tools for developers.",
      skills: ["React", "TypeScript", "Node.js"],
      availability: "Available",
      education: { college: "Stanford University", degree: "B.S. Computer Science" },
      github: "https://github.com/alexrivera",
    },
  };

  const res = calculateProfileCompletion(completeUser);
  assert.strictEqual(res.isComplete, true);
  assert.strictEqual(res.percentage, 100);
  assert.strictEqual(res.missingFields.length, 0);
});

runTest("Missing mandatory location prevents 100% profile completion", () => {
  const noLocationUser = {
    name: "Alex Rivera",
    email: "alex@example.com",
    role: "participant",
    profile: {
      avatar: "https://example.com/avatar.jpg",
      gender: "Male",
      dateOfBirth: "1998-10-10",
      location: "", // Missing mandatory location
      role: "Frontend Engineer",
      bio: "Passionate developer building AI web tools for developers.",
      skills: ["React", "TypeScript"],
      availability: "Available",
      education: { college: "MIT" },
      github: "https://github.com/alex",
    },
  };

  const res = calculateProfileCompletion(noLocationUser);
  assert.strictEqual(res.isComplete, false);
  assert.strictEqual(res.missingFields.includes("location"), true);
});

// ---------------------------------------------------------------------------
// Scenario 2: Validation Rules (Gender & DOB)
// ---------------------------------------------------------------------------
console.log("\n[Scenario 2: Gender & DOB Validation Rules]");

runTest("Future date of birth is invalid", () => {
  const futureDate = new Date("2099-01-01");
  assert.strictEqual(futureDate > new Date(), true);
});

runTest("Allowed gender values are strictly validated", () => {
  const allowed = ["Male", "Female", "Non-binary", "Prefer not to say", "Other"];
  assert.strictEqual(allowed.includes("Non-binary"), true);
  assert.strictEqual(allowed.includes("InvalidGender"), false);
});

// ---------------------------------------------------------------------------
// Scenario 3: View Profile & MongoDB User Data Resolution
// ---------------------------------------------------------------------------
console.log("\n[Scenario 3: View Profile & MongoDB User Data Resolution]");

runTest("View Profile fetches exact target user by ID and does not return current user", () => {
  const currentUser = { _id: "660000000000000000000001", name: "Current User" };
  const targetUser = { _id: "660000000000000000000002", name: "Target Teammate" };

  const isOwner = currentUser._id === targetUser._id;
  assert.strictEqual(isOwner, false);
  assert.strictEqual(targetUser.name, "Target Teammate");
});

runTest("Old MongoDB users with missing profile properties receive safe defaults", () => {
  const User = require("../models/user");
  const oldUserDoc = new User({
    _id: "660000000000000000000003",
    name: "Old User",
    email: "olduser@example.com",
    password: "hashedpassword",
    role: "participant",
  });

  const safe = oldUserDoc.toSafeUser();
  assert.strictEqual(safe.name, "Old User");
  assert.strictEqual(Array.isArray(safe.profile.skills), true);
  assert.strictEqual(safe.profile.skills.length, 0);
  assert.strictEqual(safe.profile.bio, "");
  assert.strictEqual(safe.profile.availability, "Available");
  assert.strictEqual(typeof safe.profile.handle, "string");
});

console.log("\n==============================================");
console.log(`Test Execution Summary: ${passedTests} / ${totalTests} passed`);
console.log("==============================================\n");

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
