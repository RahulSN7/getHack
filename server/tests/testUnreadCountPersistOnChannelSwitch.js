// ---------------------------------------------------------------------------
// server/tests/testUnreadCountPersistOnChannelSwitch.js
// Integration Test Suite for Unread Count Persistence across Channel Switching
// ---------------------------------------------------------------------------

const assert = require("node:assert");

function getChannelUnreadCount(channel, currentUserId, isActive, clearedAt) {
  if (!channel) return 0;
  if (isActive) return 0;

  const clearTime = clearedAt ? new Date(clearedAt).getTime() : 0;
  const rawMessages = channel.state?.messages || [];
  const visibleMessages = clearTime
    ? rawMessages.filter((m) => {
        const t = new Date(m.created_at || m.createdAt).getTime();
        return !isNaN(t) && t > clearTime;
      })
    : rawMessages;

  if (clearTime && visibleMessages.length === 0) return 0;

  const userReadState = channel.state?.read?.[String(currentUserId)];
  if (userReadState?.last_read) {
    const lastReadTime = new Date(userReadState.last_read).getTime();
    if (!isNaN(lastReadTime)) {
      const unreadIncoming = visibleMessages.filter((m) => {
        const msgSenderId = String(m.user?.id || m.user_id || "");
        if (msgSenderId === String(currentUserId)) return false;
        const msgTime = new Date(m.created_at || m.createdAt).getTime();
        return !isNaN(msgTime) && msgTime > lastReadTime;
      });
      return unreadIncoming.length;
    }
  }

  if (typeof channel.state?.unreadCount === "number" && channel.state.unreadCount === 0) {
    return 0;
  }

  return channel.countUnread?.() || channel.state?.unreadCount || 0;
}

function markChannelAsRead(channel, currentUserId) {
  if (!channel.state) channel.state = { messages: [], unreadCount: 0 };
  channel.state.unreadCount = 0;
  if (!channel.state.read) channel.state.read = {};

  let latestMsgTime = Date.now();
  if (channel.state.messages.length > 0) {
    const lastMsg = channel.state.messages[channel.state.messages.length - 1];
    const t = new Date(lastMsg.created_at || lastMsg.createdAt).getTime();
    if (!isNaN(t)) latestMsgTime = t;
  }

  channel.state.read[String(currentUserId)] = {
    last_read: new Date(latestMsgTime + 10).toISOString(),
    user: { id: String(currentUserId) },
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
console.log("Running Unread Count Channel Switching Tests");
console.log("==============================================\n");

const currentUserId = "user-a";

// Setup Channel Rahul
const channelRahul = {
  cid: "messaging:rahul",
  state: {
    messages: [
      { id: "m1", text: "hello", created_at: "2026-08-28T11:00:00Z", user: { id: "rahul-id" } }
    ],
    unreadCount: 1,
    read: {},
  },
  countUnread: () => 1,
};

// Setup Channel Priya
const channelPriya = {
  cid: "messaging:priya",
  state: {
    messages: [
      { id: "m10", text: "hi there", created_at: "2026-08-28T10:00:00Z", user: { id: "priya-id" } }
    ],
    unreadCount: 0,
    read: {
      "user-a": { last_read: "2026-08-28T10:05:00Z" }
    },
  },
  countUnread: () => 0,
};

// TEST 1: Initial state before opening Rahul's chat -> unread count is 1
runTest("Test 1: Rahul has 1 unread message before opening chat", () => {
  const unreadRahul = getChannelUnreadCount(channelRahul, currentUserId, false, null);
  assert.strictEqual(unreadRahul, 1);
});

// TEST 2: Open Rahul's chat -> unread count becomes 0
runTest("Test 2: Open Rahul's chat -> unread count becomes 0 and markRead updates state", () => {
  markChannelAsRead(channelRahul, currentUserId);
  const unreadRahul = getChannelUnreadCount(channelRahul, currentUserId, true, null);
  assert.strictEqual(unreadRahul, 0);
  assert.strictEqual(channelRahul.state.unreadCount, 0);
  assert.ok(channelRahul.state.read[currentUserId]?.last_read);
});

// TEST 3: Switch to Priya's chat -> Rahul's unread count STAYS 0 (does not revert to 1)
runTest("Test 3: Switch to Priya's chat -> Rahul unread count STAYS 0 (does NOT revert to 1)", () => {
  // Rahul is now inactive (isActive = false)
  const unreadRahul = getChannelUnreadCount(channelRahul, currentUserId, false, null);
  assert.strictEqual(unreadRahul, 0, "Rahul's unread count must remain 0 after switching to another chat");
});

// TEST 4: Rahul sends a NEW message while User A is on Priya's chat -> Rahul unread becomes 1
runTest("Test 4: Rahul sends new message -> Rahul unread count becomes 1 for new message", () => {
  channelRahul.state.messages.push({
    id: "m2",
    text: "how are you?",
    created_at: new Date(Date.now() + 1000).toISOString(),
    user: { id: "rahul-id" },
  });

  const unreadRahul = getChannelUnreadCount(channelRahul, currentUserId, false, null);
  assert.strictEqual(unreadRahul, 1, "Rahul's unread count must become 1 for the new message");
});

// TEST 5: Open Rahul's chat again -> unread count becomes 0 again and stays 0 on switch away
runTest("Test 5: Open Rahul's chat again -> unread count becomes 0 and stays 0 after switching away", () => {
  markChannelAsRead(channelRahul, currentUserId);
  const unreadRahulActive = getChannelUnreadCount(channelRahul, currentUserId, true, null);
  assert.strictEqual(unreadRahulActive, 0);

  // Switch back to Priya
  const unreadRahulInactive = getChannelUnreadCount(channelRahul, currentUserId, false, null);
  assert.strictEqual(unreadRahulInactive, 0, "Rahul's unread count must remain 0 after switching back to Priya");
});

console.log("\n==============================================");
console.log(`Test Summary: ${passedTests}/${totalTests} tests passed.`);
console.log("==============================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
