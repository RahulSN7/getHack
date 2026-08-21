// ---------------------------------------------------------------------------
// server/tests/runTests.js
// Test Suite for getHack — Mode Removal & Registration CTA Separation Strategy
// ---------------------------------------------------------------------------

const assert = require("node:assert");
const { validateRegistrationUrl } = require("../services/detectors/urlValidator");
const { processPipeline } = require("../services/dataCorrectionPipeline");
const { validate } = require("../services/hackathonValidator");

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
console.log("Running getHack Mode Removal & Registration CTA Tests");
console.log("==============================================\n");

// ---------------------------------------------------------------------------
// Scenario 1: registrationUrl Normalization & Preservation
// ---------------------------------------------------------------------------
console.log("[Scenario 1: registrationUrl Normalization & Preservation]");

runTest("Valid registration URL is recognized and normalized to HTTPS", () => {
  const res = validateRegistrationUrl("http://unstop.com/hackathons/example");
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.normalizedUrl, "https://unstop.com/hackathons/example");
});

runTest("Data pipeline preserves registrationUrl field", () => {
  const raw = {
    title: "AI Hackathon 2026",
    platform: "devfolio",
    externalId: "def-123",
    registrationUrl: "https://aihack.devfolio.co",
  };
  const processed = processPipeline(raw);
  assert.strictEqual(processed.registrationUrl, "https://aihack.devfolio.co/");
});

// ---------------------------------------------------------------------------
// Scenario 2: Missing registrationUrl Handling
// ---------------------------------------------------------------------------
console.log("\n[Scenario 2: Missing registrationUrl Handling]");

runTest("Empty or missing registration URL is flagged as invalid", () => {
  assert.strictEqual(validateRegistrationUrl("").isValid, false);
  assert.strictEqual(validateRegistrationUrl(null).isValid, false);
  assert.strictEqual(validateRegistrationUrl("Not available").isValid, false);
  assert.strictEqual(validateRegistrationUrl("#").isValid, false);
});

// ---------------------------------------------------------------------------
// Scenario 3: Prize Pool & Separation of Responsibilities
// ---------------------------------------------------------------------------
console.log("\n[Scenario 3: Prize Pool & Separation of Responsibilities]");

runTest("Prize pool formatting returns prize info only", () => {
  const processed = processPipeline({
    title: "Web3 Global Hack",
    platform: "devpost",
    externalId: "dp-888",
    registrationUrl: "https://web3hack.devpost.com",
    prizeAmount: 50000,
    prizeCurrency: "USD",
  });
  assert.strictEqual(processed.prizePool.amount, 50000);
  assert.strictEqual(processed.prizePool.currency, "USD");
  assert.strictEqual(validate(processed).isValid, true);
});

// ---------------------------------------------------------------------------
// Scenario 4: Smart Deadline Calculation & Execution Integrity
// ---------------------------------------------------------------------------
console.log("\n[Scenario 4: Smart Deadline & Pipeline Execution]");

runTest("Deadline calculation accurately determines Open status for future deadlines", () => {
  const futureDate = new Date(Date.now() + 86400000 * 10).toISOString();
  const processed = processPipeline({
    title: "Future Hackathon",
    platform: "unstop",
    externalId: "fut-1",
    registrationDeadline: futureDate,
  });
  assert.strictEqual(processed.registration.status, "Open");
});

runTest("Deadline calculation accurately determines Closed status for past deadlines", () => {
  const pastDate = new Date(Date.now() - 86400000).toISOString();
  const processed = processPipeline({
    title: "Past Hackathon",
    platform: "unstop",
    externalId: "past-1",
    registrationDeadline: pastDate,
  });
  assert.strictEqual(processed.registration.status, "Closed");
});

console.log("\n==============================================");
console.log(`Test Execution Summary: ${passedTests} / ${totalTests} passed`);
console.log("==============================================\n");

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
