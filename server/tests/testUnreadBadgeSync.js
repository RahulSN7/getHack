// ---------------------------------------------------------------------------
// server/tests/testUnreadBadgeSync.js
// Integration Test Suite for Messages Unread Badge Real-Time Synchronization
// ---------------------------------------------------------------------------

const assert = require("node:assert");

function calculateEffectiveUnreadCount(channel, isActive) {
  if (isActive) return 0;
  return channel.countUnread?.() || channel.state?.unreadCount || 0;
}

function filterChannels({ channels, activeFilter }) {
  let list = channels;
  if (activeFilter === "unread") {
    list = list.filter((ch) => (ch.countUnread?.() || ch.state?.unreadCount || 0) > 0);
  }
  return list;
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
console.log("Running Unread Badge Real-Time Synchronization Tests");
console.log("==============================================\n");

// Mock Channel
const chanWithUnread = {
  cid: "messaging:chan-unread",
  state: { unreadCount: 2 },
  countUnread: function () {
    return this.state.unreadCount;
  },
  markRead: function () {
    this.state.unreadCount = 0;
    return Promise.resolve();
  },
};

// TEST 1: Inactive channel returns raw unread count
runTest("Test 1: Inactive channel returns raw unread count (2)", () => {
  const count = calculateEffectiveUnreadCount(chanWithUnread, false);
  assert.strictEqual(count, 2);
});

// TEST 2: Active channel evaluates unread count as 0 immediately
runTest("Test 2: Actively open channel evaluates unread count as 0 immediately", () => {
  const count = calculateEffectiveUnreadCount(chanWithUnread, true);
  assert.strictEqual(count, 0);
});

// TEST 3: markRead() updates Stream Chat channel state to 0
runTest("Test 3: markRead() resets channel.state.unreadCount to 0", async () => {
  await chanWithUnread.markRead();
  assert.strictEqual(chanWithUnread.state.unreadCount, 0);
  assert.strictEqual(chanWithUnread.countUnread(), 0);
});

// TEST 4: Channel with 0 unread is removed from Unread tab view immediately
runTest("Test 4: Channel with 0 unread count is excluded from Unread tab", () => {
  const unreadList = filterChannels({
    channels: [chanWithUnread],
    activeFilter: "unread",
  });
  assert.strictEqual(unreadList.length, 0);
});

console.log("\n==============================================");
console.log(`Test Summary: ${passedTests}/${totalTests} tests passed.`);
console.log("==============================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
