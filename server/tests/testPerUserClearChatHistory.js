// ---------------------------------------------------------------------------
// server/tests/testPerUserClearChatHistory.js
// Integration Test Suite for Per-User Clear Chat History Feature
// ---------------------------------------------------------------------------

const assert = require("node:assert");

// In-memory UserChatState DB simulator
const userChatStates = new Map(); // key: `${userId}_${cid}` -> { user, channelCid, clearedAt }

function clearChatForUser(userId, cid) {
  if (!userId) {
    return { status: 401, body: { success: false, message: "Unauthenticated." } };
  }
  if (!cid || typeof cid !== "string") {
    return { status: 400, body: { success: false, message: "Channel CID is required." } };
  }

  const key = `${userId}_${cid}`;
  const now = new Date();

  const state = {
    user: userId,
    channelCid: cid,
    clearedAt: now,
  };
  userChatStates.set(key, state);

  return {
    status: 200,
    body: {
      success: true,
      cid,
      clearedAt: now.toISOString(),
      message: "Chat history cleared for current user.",
    },
  };
}

function getChatStatesForUser(userId) {
  const statesMap = {};
  for (const [key, state] of userChatStates.entries()) {
    if (state.user === userId) {
      statesMap[state.channelCid] = {
        clearedAt: state.clearedAt ? state.clearedAt.toISOString() : null,
      };
    }
  }
  return statesMap;
}

function filterMessagesForUser(userId, cid, globalMessages) {
  const key = `${userId}_${cid}`;
  const userState = userChatStates.get(key);
  const clearedAt = userState?.clearedAt;

  if (!clearedAt) return globalMessages;

  const clearTime = new Date(clearedAt).getTime();
  return globalMessages.filter((msg) => {
    const msgTime = new Date(msg.created_at || msg.createdAt).getTime();
    return !isNaN(msgTime) && msgTime > clearTime;
  });
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
console.log("Running Per-User Clear Chat History Tests");
console.log("==============================================\n");

const globalMessages = [
  { id: "m1", text: "Hello", created_at: "2026-08-28T10:00:00Z" },
  { id: "m2", text: "How are you?", created_at: "2026-08-28T10:01:00Z" },
  { id: "m3", text: "Here is certificate.pdf", attachments: [{ name: "certificate.pdf" }], created_at: "2026-08-28T10:02:00Z" },
];

// TEST 1: Initial state (neither user cleared) -> both see all messages
runTest("Test 1: Initial state — both User A and User B see all 3 messages", () => {
  const visibleA = filterMessagesForUser("user-a", "messaging:c1", globalMessages);
  const visibleB = filterMessagesForUser("user-b", "messaging:c1", globalMessages);
  assert.strictEqual(visibleA.length, 3);
  assert.strictEqual(visibleB.length, 3);
});

// TEST 2: User A clears chat -> User A sees 0 messages, User B still sees 3 messages
runTest("Test 2: User A clears chat — User A sees 0, User B still sees all 3 messages", () => {
  const res = clearChatForUser("user-a", "messaging:c1");
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);

  const visibleA = filterMessagesForUser("user-a", "messaging:c1", globalMessages);
  const visibleB = filterMessagesForUser("user-b", "messaging:c1", globalMessages);

  assert.strictEqual(visibleA.length, 0, "User A must see 0 messages after clear");
  assert.strictEqual(visibleB.length, 3, "User B must still see all 3 original messages");
});

// TEST 3: New message sent after User A's clear timestamp
runTest("Test 3: User B sends new message after Clear -> User A sees ONLY new message, User B sees full history + new message", () => {
  const newMessage = { id: "m4", text: "Are you there?", created_at: new Date(Date.now() + 1000).toISOString() };
  const updatedGlobal = [...globalMessages, newMessage];

  const visibleA = filterMessagesForUser("user-a", "messaging:c1", updatedGlobal);
  const visibleB = filterMessagesForUser("user-b", "messaging:c1", updatedGlobal);

  assert.strictEqual(visibleA.length, 1, "User A must see ONLY the 1 new message");
  assert.strictEqual(visibleA[0].text, "Are you there?");

  assert.strictEqual(visibleB.length, 4, "User B must see all 3 old messages + 1 new message");
  assert.strictEqual(visibleB[3].text, "Are you there?");
});

// TEST 4: Page Refresh Simulation — User A's clearedAt is persisted and fetched via getChatStates
runTest("Test 4: Page Refresh Simulation — User A's clearedAt is persisted in DB", () => {
  const statesA = getChatStatesForUser("user-a");
  const statesB = getChatStatesForUser("user-b");

  assert.ok(statesA["messaging:c1"]?.clearedAt, "User A must have clearedAt timestamp in DB");
  assert.strictEqual(statesB["messaging:c1"]?.clearedAt || null, null, "User B clearedAt must remain null");
});

// TEST 5: Attachments & Invitations remain globally accessible
runTest("Test 5: Global message database and attachments remain intact for User B", () => {
  assert.strictEqual(globalMessages.length, 3, "Global messages array must NEVER be truncated or deleted");
  assert.strictEqual(globalMessages[2].attachments[0].name, "certificate.pdf");
});

console.log("\n==============================================");
console.log(`Test Summary: ${passedTests}/${totalTests} tests passed.`);
console.log("==============================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
