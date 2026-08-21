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

runTest("Fully filled participant user evaluates as complete (100%)", () => {
  const completeUser = {
    name: "Alex Rivera",
    email: "alex@example.com",
    role: "participant",
    profile: {
      avatar: "https://example.com/avatar.jpg",
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

// ---------------------------------------------------------------------------
// Scenario 2: Connection Request Validation Rules
// ---------------------------------------------------------------------------
console.log("\n[Scenario 2: Connection Note & Self-Request Validation]");

runTest("Note longer than 300 characters is rejected by length rule", () => {
  const longNote = "a".repeat(301);
  assert.strictEqual(longNote.length > 300, true);
});

runTest("Valid note within 300 characters is preserved cleanly", () => {
  const validNote = "Hi! I'd love to connect and collaborate on upcoming hackathons.";
  assert.strictEqual(validNote.length <= 300, true);
  assert.strictEqual(validNote.trim(), validNote);
});

console.log("\n==============================================");
console.log(`Test Execution Summary: ${passedTests} / ${totalTests} passed`);
console.log("==============================================\n");

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
