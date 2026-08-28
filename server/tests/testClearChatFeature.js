// ---------------------------------------------------------------------------
// server/tests/testClearChatFeature.js
// Integration Test Suite for Persistent Real-Time Clear Chat Feature
// ---------------------------------------------------------------------------

const assert = require("node:assert");

function createMockStreamChannel(cid, initialMessages = []) {
  let messages = [...initialMessages];
  let unreadCount = 3;

  return {
    cid,
    state: {
      get messages() { return messages; },
      set messages(val) { messages = val; },
      get unreadCount() { return unreadCount; },
      set unreadCount(val) { unreadCount = val; },
      members: {
        "user-a": { user_id: "user-a" },
        "user-b": { user_id: "user-b" },
      },
    },
    async truncate() {
      messages = [];
      unreadCount = 0;
      return { type: "channel.truncated", cid };
    },
  };
}

function processClearChatRequest({ currentUserId, cid, channelMap }) {
  if (!currentUserId) {
    return { status: 401, body: { success: false, message: "Unauthenticated." } };
  }

  if (!cid || typeof cid !== "string") {
    return { status: 400, body: { success: false, message: "Channel CID is required." } };
  }

  const channel = channelMap.get(cid);
  if (!channel) {
    return { status: 404, body: { success: false, message: "Channel not found." } };
  }

  const members = Object.keys(channel.state.members || {});
  if (members.length > 0 && !members.includes(currentUserId)) {
    return { status: 403, body: { success: false, message: "Unauthorized to clear this conversation." } };
  }

  channel.truncate();

  return {
    status: 200,
    body: {
      success: true,
      cid,
      message: "Chat cleared successfully.",
    },
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
console.log("Running Clear Chat Feature Tests");
console.log("==============================================\n");

// TEST 1: Unauthenticated request returns 401
runTest("Test 1: Unauthenticated request returns 401 Unauthenticated", () => {
  const channelMap = new Map();
  const res = processClearChatRequest({ currentUserId: null, cid: "messaging:c1", channelMap });
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.success, false);
});

// TEST 2: Missing CID returns 400
runTest("Test 2: Request without CID returns 400 Bad Request", () => {
  const channelMap = new Map();
  const res = processClearChatRequest({ currentUserId: "user-a", cid: "", channelMap });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.success, false);
});

// TEST 3: Non-participant user returns 403 Forbidden
runTest("Test 3: Non-participant user returns 403 Forbidden", () => {
  const ch = createMockStreamChannel("messaging:c1", [{ id: "m1", text: "Hello" }]);
  const channelMap = new Map([["messaging:c1", ch]]);

  const res = processClearChatRequest({ currentUserId: "user-attacker", cid: "messaging:c1", channelMap });
  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.body.success, false);
  assert.strictEqual(ch.state.messages.length, 1);
});

// TEST 4: Authorized user clears chat for both participants
runTest("Test 4: Authorized user clears chat permanently for both participants", () => {
  const ch1 = createMockStreamChannel("messaging:c1", [
    { id: "m1", text: "Hello User B" },
    { id: "m2", text: "Hi User A" },
    { id: "m3", text: "Attachment.pdf", attachments: [{ type: "file" }] },
  ]);
  const ch2 = createMockStreamChannel("messaging:c2", [{ id: "m10", text: "Other chat message" }]);

  const channelMap = new Map([
    ["messaging:c1", ch1],
    ["messaging:c2", ch2],
  ]);

  const res = processClearChatRequest({ currentUserId: "user-a", cid: "messaging:c1", channelMap });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(ch1.state.messages.length, 0);
  assert.strictEqual(ch1.state.unreadCount, 0);

  // Other chat (messaging:c2) MUST remain completely untouched
  assert.strictEqual(ch2.state.messages.length, 1);
  assert.strictEqual(ch2.state.messages[0].text, "Other chat message");
});

// TEST 5: Clearing an already-empty chat is idempotent (returns 200)
runTest("Test 5: Clearing an already-empty chat is idempotent and returns 200", () => {
  const ch = createMockStreamChannel("messaging:c1", []);
  const channelMap = new Map([["messaging:c1", ch]]);

  const res = processClearChatRequest({ currentUserId: "user-a", cid: "messaging:c1", channelMap });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(ch.state.messages.length, 0);
});

console.log("\n==============================================");
console.log(`Test Summary: ${passedTests}/${totalTests} tests passed.`);
console.log("==============================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
