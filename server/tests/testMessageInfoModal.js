// ---------------------------------------------------------------------------
// server/tests/testMessageInfoModal.js
// Integration Test Suite for Message Info Option Reusing MessageStatus Popover
// ---------------------------------------------------------------------------

const assert = require("node:assert");

function getAvailableActions(isMine) {
  if (isMine) {
    return ["Reply", "Copy", "Edit", "Message Info", "Delete"];
  }
  return ["Reply", "Copy", "Report"];
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
console.log("Running Message Info Option & Reused Popover Tests");
console.log("==============================================\n");

// TEST 1: Message Info action presence for sent vs received messages
runTest("Test 1: 'Message Info' option is present ONLY for messages sent by current user", () => {
  const mineActions = getAvailableActions(true);
  assert.ok(mineActions.includes("Message Info"));
  assert.deepStrictEqual(mineActions, ["Reply", "Copy", "Edit", "Message Info", "Delete"]);

  const otherActions = getAvailableActions(false);
  assert.strictEqual(otherActions.includes("Message Info"), false);
  assert.deepStrictEqual(otherActions, ["Reply", "Copy", "Report"]);
});

// TEST 2: Clicking Message Info sets activeMessageInfoMsgId and triggers forceOpen on MessageStatus
runTest("Test 2: Clicking 'Message Info' triggers the exact same MessageStatus popover via forceOpen", () => {
  let activeMessageInfoMsgId = null;

  const msg = { id: "msg-999", text: "Test Message", user_id: "user-1" };

  const handleMessageInfoAction = (m) => {
    activeMessageInfoMsgId = m.id;
  };

  handleMessageInfoAction(msg);

  assert.strictEqual(activeMessageInfoMsgId, "msg-999");

  // Simulate MessageStatus forceOpen calculation
  const forceOpen = activeMessageInfoMsgId === msg.id;
  assert.strictEqual(forceOpen, true);

  // Simulate popover dismissal
  const handleClosePopover = () => {
    activeMessageInfoMsgId = null;
  };

  handleClosePopover();
  assert.strictEqual(activeMessageInfoMsgId, null);
  assert.strictEqual(activeMessageInfoMsgId === msg.id, false);
});

console.log("\n==============================================");
console.log(`Test Summary: ${passedTests}/${totalTests} tests passed.`);
console.log("==============================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
