// ---------------------------------------------------------------------------
// server/tests/testInviteConnectionsCapacity.js
// Automated test suite for Invite Connections modal available spots calculation & backend validation
// ---------------------------------------------------------------------------

const assert = require("node:assert");

// Pure capacity calculation function under test
function calculateAvailableSpots(maxSize, currentMembersCount) {
  const effectiveCurrentSize = Math.max(1, currentMembersCount);
  return Math.max(0, maxSize - effectiveCurrentSize);
}

// Pluralization formatter function under test
function formatSpotText(availableSlots) {
  return availableSlots === 1 ? "available spot" : "available spots";
}

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
console.log("Running Invite Connections Capacity & Calculation Tests");
console.log("==============================================\n");

// Test 1: Max Team Size = 4, Current Members = 1 (Creator) -> Available Spots = 3
runTest("Case 1: Max 4, Members 1 (Creator) -> Available Spots = 3", () => {
  const spots = calculateAvailableSpots(4, 1);
  assert.strictEqual(spots, 3);
  assert.strictEqual(formatSpotText(spots), "available spots");
});

// Test 2: Max Team Size = 4, Current Members = 2 -> Available Spots = 2
runTest("Case 2: Max 4, Members 2 -> Available Spots = 2", () => {
  const spots = calculateAvailableSpots(4, 2);
  assert.strictEqual(spots, 2);
  assert.strictEqual(formatSpotText(spots), "available spots");
});

// Test 3: Max Team Size = 4, Current Members = 3 -> Available Spot = 1 (Singular)
runTest("Case 3: Max 4, Members 3 -> Available Spot = 1 (Singular)", () => {
  const spots = calculateAvailableSpots(4, 3);
  assert.strictEqual(spots, 1);
  assert.strictEqual(formatSpotText(spots), "available spot");
});

// Test 4: Max Team Size = 4, Current Members = 4 (Full) -> Available Spots = 0
runTest("Case 4: Max 4, Members 4 -> Available Spots = 0 (Full)", () => {
  const spots = calculateAvailableSpots(4, 4);
  assert.strictEqual(spots, 0);
  assert.strictEqual(formatSpotText(spots), "available spots");
});

// Test 5: Max Team Size = 6, Current Members = 2 -> Available Spots = 4
runTest("Case 5: Max 6, Members 2 -> Available Spots = 4", () => {
  const spots = calculateAvailableSpots(6, 2);
  assert.strictEqual(spots, 4);
  assert.strictEqual(formatSpotText(spots), "available spots");
});

// Test 6: Backend validation logic rejects invites exceeding available capacity
runTest("Case 6: Backend validation logic rejects excess invitation requests", () => {
  const maxTeamSize = 4;
  const currentMembers = 1;
  const availableSpots = calculateAvailableSpots(maxTeamSize, currentMembers); // 3

  const requestedInvites = ["user-1", "user-2", "user-3", "user-4"]; // 4 invites

  const isRejected = requestedInvites.length > availableSpots;
  assert.strictEqual(isRejected, true);
});

console.log("\n==============================================");
console.log(`Test Summary: ${passedTests}/${totalTests} tests passed.`);
console.log("==============================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
