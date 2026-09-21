// server/tests/testAiProfileGate.js
// Automated Test Suite for getHack AI Assistant Profile-Completion Gate

const assert = require("assert");
const { isProfileComplete } = require("../utils/profileValidation");

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  ✓ PASSED: ${name}`);
  } catch (err) {
    console.error(`  ✗ FAILED: ${name}`);
    console.error(err);
  }
}

console.log("\n==============================================");
console.log("Running getHack AI Profile Completion Gate Tests");
console.log("==============================================\n");

// ── Scenario 1: Incomplete Participant Profile ──
runTest("Incomplete participant (missing skills/interests/links) returns false", () => {
  const user = {
    name: "Incomplete User",
    role: "participant",
    profile: {
      role: "Developer",
      gender: "Male",
      dateOfBirth: "2000-01-01",
      location: "Delhi",
      availability: "Available",
      bio: "Short bio",
      skills: [],
      interests: [],
    },
  };
  assert.strictEqual(isProfileComplete(user), false);
});

// ── Scenario 2: Complete Participant Profile ──
runTest("Complete participant returns true", () => {
  const user = {
    name: "Complete User",
    role: "participant",
    profile: {
      role: "Developer",
      gender: "Female",
      dateOfBirth: "1999-05-15",
      location: "Bangalore",
      availability: "Available",
      bio: "Fullstack web developer.",
      skills: ["React", "Node.js"],
      education: { college: "IIT Delhi", degree: "B.Tech" },
      interests: ["AI/ML", "Web3"],
      github: "https://github.com/completeuser",
    },
  };
  assert.strictEqual(isProfileComplete(user), true);
});

// ── Scenario 3: Incomplete Organizer Profile ──
runTest("Incomplete organizer (missing location & links) returns false", () => {
  const user = {
    name: "Incomplete Org",
    role: "organizer",
    profile: {
      organizationName: "DevClub",
      organizationDescription: "Tech community",
      location: "",
      website: "",
    },
  };
  assert.strictEqual(isProfileComplete(user), false);
});

// ── Scenario 4: Complete Organizer Profile ──
runTest("Complete organizer returns true", () => {
  const user = {
    name: "Complete Org",
    role: "organizer",
    profile: {
      organizationName: "DevClub",
      organizationDescription: "Global tech hackathon community",
      location: "Mumbai",
      website: "https://devclub.org",
    },
  };
  assert.strictEqual(isProfileComplete(user), true);
});

console.log("\n==============================================");
console.log(`Test Execution Summary: ${passed} / ${total} passed`);
console.log("==============================================\n");
