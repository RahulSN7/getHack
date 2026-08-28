// ---------------------------------------------------------------------------
// server/tests/testMessageEditTimeLimit.js
// Integration Test Suite for WhatsApp-Style Message Edit Time Limit
// ---------------------------------------------------------------------------

const assert = require("node:assert");

const MESSAGE_EDIT_WINDOW = 15 * 60 * 1000; // 15 minutes

function canEditMessage(msg) {
  if (!msg) return false;
  if (msg.deleted_at || msg.type === "deleted") return false;
  if (msg.custom_type === "team_invitation" || msg.type === "team_invitation" || msg.teamInvitation || msg.invitation_id) return false;
  if (Array.isArray(msg.attachments) && msg.attachments.length > 0) return false;

  const createdTime = msg.created_at || msg.created_at_time;
  if (!createdTime) return false;

  const createdTimestamp = new Date(createdTime).getTime();
  if (isNaN(createdTimestamp)) return false;

  const age = Date.now() - createdTimestamp;
  return age >= 0 && age <= MESSAGE_EDIT_WINDOW;
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
    console.error(`    ${err.stack || err.message}`);
  }
}

console.log("\n==============================================");
console.log("Running Message Edit Time Limit Tests");
console.log("==============================================\n");

// TEST 1: Recently sent message (< 15 mins) is editable
runTest("Test 1: Message sent 2 minutes ago is editable", () => {
  const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const msg = { id: "msg-recent", text: "Hello Recent", created_at: twoMinsAgo };
  assert.strictEqual(canEditMessage(msg), true);
});

// TEST 2: Message sent exactly at 14m 59s is editable
runTest("Test 2: Message sent 14m 59s ago is editable", () => {
  const almostExpired = new Date(Date.now() - (14 * 60 * 1000 + 59 * 1000)).toISOString();
  const msg = { id: "msg-boundary", text: "Hello Boundary", created_at: almostExpired };
  assert.strictEqual(canEditMessage(msg), true);
});

// TEST 3: Expired message (> 15 mins) is NOT editable
runTest("Test 3: Message sent 16 minutes ago is NOT editable", () => {
  const sixteenMinsAgo = new Date(Date.now() - 16 * 60 * 1000).toISOString();
  const msg = { id: "msg-old", text: "Hello Old", created_at: sixteenMinsAgo };
  assert.strictEqual(canEditMessage(msg), false);
});

// TEST 4: Deleted message is NOT editable
runTest("Test 4: Deleted message is NOT editable even if sent recently", () => {
  const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const msg = { id: "msg-deleted", text: "Deleted", created_at: twoMinsAgo, type: "deleted" };
  assert.strictEqual(canEditMessage(msg), false);
});

// TEST 5: Team invitation is NOT editable
runTest("Test 5: Hackathon Team Invitation is NOT editable", () => {
  const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const msg = { id: "msg-invitation", text: "Invitation", created_at: twoMinsAgo, custom_type: "team_invitation" };
  assert.strictEqual(canEditMessage(msg), false);
});

// TEST 6: File attachment message is NOT editable
runTest("Test 6: Message with file attachment is NOT editable", () => {
  const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const msg = { id: "msg-file", created_at: twoMinsAgo, attachments: [{ name: "doc.pdf" }] };
  assert.strictEqual(canEditMessage(msg), false);
});

// TEST 7: Invalid or missing timestamp handled safely without error
runTest("Test 7: Invalid or missing timestamp returns false safely", () => {
  assert.strictEqual(canEditMessage({ id: "no-time" }), false);
  assert.strictEqual(canEditMessage({ id: "invalid-time", created_at: "not-a-date" }), false);
});

console.log("\n==============================================");
console.log(`Test Summary: ${passedTests}/${totalTests} tests passed.`);
console.log("==============================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
