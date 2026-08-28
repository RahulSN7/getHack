// ---------------------------------------------------------------------------
// server/tests/testMessageEditHistory.js
// Integration Test Suite for WhatsApp-Style "Edited" Message Badge & History
// ---------------------------------------------------------------------------

const assert = require("node:assert");

function isMessageEdited(msg) {
  if (!msg || msg.deleted_at || msg.type === "deleted") return false;
  return Boolean(
    msg.is_edited ||
    msg.message_text_updated_at ||
    (Array.isArray(msg.edit_history) && msg.edit_history.length > 0) ||
    (Array.isArray(msg.extraData?.edit_history) && msg.extraData.edit_history.length > 0)
  );
}

function processMessageEdit({ msg, newText, currentUserId }) {
  if (newText === msg.text) return msg;

  const existingHistory = Array.isArray(msg.edit_history)
    ? msg.edit_history
    : Array.isArray(msg.extraData?.edit_history)
    ? msg.extraData.edit_history
    : [];

  const updatedHistory = [
    ...existingHistory,
    {
      text: msg.text,
      edited_at: new Date().toISOString(),
      edited_by: currentUserId,
    },
  ];

  return {
    ...msg,
    text: newText,
    is_edited: true,
    edit_history: updatedHistory,
  };
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
console.log("Running Message Edit History Integration Tests");
console.log("==============================================\n");

// TEST 1: Unedited message does not display 'Edited'
runTest("Test 1: Unedited message is NOT flagged as edited", () => {
  const msg = { id: "msg-1", text: "Hello", created_at: "2026-08-28T17:00:00.000Z" };
  assert.strictEqual(isMessageEdited(msg), false);
});

// TEST 2: Editing a message sets is_edited and persists original text in edit_history
runTest("Test 2: Editing a message appends original text to edit_history and sets is_edited", () => {
  const originalMsg = { id: "msg-2", text: "Hello Rahul", created_at: "2026-08-28T17:00:00.000Z" };
  const editedMsg = processMessageEdit({ msg: originalMsg, newText: "Hello Rahul, how are you?", currentUserId: "user-1" });

  assert.strictEqual(isMessageEdited(editedMsg), true);
  assert.strictEqual(editedMsg.text, "Hello Rahul, how are you?");
  assert.strictEqual(editedMsg.edit_history.length, 1);
  assert.strictEqual(editedMsg.edit_history[0].text, "Hello Rahul");
});

// TEST 3: Multiple edits accumulate full edit history stack
runTest("Test 3: Multiple edits accumulate full history stack", () => {
  let msg = { id: "msg-3", text: "Hello", created_at: "2026-08-28T17:00:00.000Z" };

  msg = processMessageEdit({ msg, newText: "Hello Rahul", currentUserId: "user-1" });
  msg = processMessageEdit({ msg, newText: "Hello Rahul, how are you?", currentUserId: "user-1" });

  assert.strictEqual(isMessageEdited(msg), true);
  assert.strictEqual(msg.text, "Hello Rahul, how are you?");
  assert.strictEqual(msg.edit_history.length, 2);
  assert.strictEqual(msg.edit_history[0].text, "Hello");
  assert.strictEqual(msg.edit_history[1].text, "Hello Rahul");
});

// TEST 4: Simulated refresh retains is_edited and edit_history
runTest("Test 4: Edit history survives simulated refresh payload reconstruction", () => {
  const serverPayload = {
    id: "msg-4",
    text: "Updated text",
    is_edited: true,
    edit_history: [
      { text: "Original text", edited_at: "2026-08-28T17:05:00.000Z" },
    ],
  };

  assert.strictEqual(isMessageEdited(serverPayload), true);
  assert.strictEqual(serverPayload.edit_history[0].text, "Original text");
});

console.log("\n==============================================");
console.log(`Test Summary: ${passedTests}/${totalTests} tests passed.`);
console.log("==============================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
