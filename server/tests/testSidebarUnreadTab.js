// ---------------------------------------------------------------------------
// server/tests/testSidebarUnreadTab.js
// Unit & Logic Test Suite for Messages Sidebar Unread Tab
// ---------------------------------------------------------------------------

const assert = require("node:assert");

// Simulated channel filtering logic matching Messages.jsx
function filterChannels({ channels, activeFilter, searchQuery = "", chatStates = {}, currentUserId }) {
  let list = channels;

  if (activeFilter === "favourites") {
    list = list.filter((ch) => !!chatStates[ch.cid]?.isFavourite);
  } else if (activeFilter === "unread") {
    list = list.filter((ch) => (ch.countUnread?.() || ch.state?.unreadCount || 0) > 0);
  }

  if (!searchQuery.trim()) {
    return list;
  }

  const query = searchQuery.toLowerCase();

  return list.filter((channel) => {
    const members = Object.values(channel.state?.members || {});
    const other = members.find(
      (member) => String(member.user_id || member.user?.id) !== String(currentUserId)
    );
    const otherName = other?.user?.name || channel.data?.targetName || "";
    return otherName.toLowerCase().includes(query);
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
console.log("Running Messages Sidebar Unread Tab Logic Tests");
console.log("==============================================\n");

// Mock Stream Chat Channels
const channelRead1 = {
  cid: "messaging:chan-1",
  data: { targetName: "Rahul Singh" },
  state: {
    unreadCount: 0,
    members: {
      "user-1": { user_id: "user-1", user: { id: "user-1", name: "Current User" } },
      "user-2": { user_id: "user-2", user: { id: "user-2", name: "Rahul Singh" } },
    },
  },
  countUnread: () => 0,
};

const channelUnread2 = {
  cid: "messaging:chan-2",
  data: { targetName: "Aman Sharma" },
  state: {
    unreadCount: 2,
    members: {
      "user-1": { user_id: "user-1", user: { id: "user-1", name: "Current User" } },
      "user-3": { user_id: "user-3", user: { id: "user-3", name: "Aman Sharma" } },
    },
  },
  countUnread: () => 2,
  markRead: function () {
    this.state.unreadCount = 0;
    this.countUnread = () => 0;
  },
};

const channelFavAndUnread3 = {
  cid: "messaging:chan-3",
  data: { targetName: "Priya Singh" },
  state: {
    unreadCount: 1,
    members: {
      "user-1": { user_id: "user-1", user: { id: "user-1", name: "Current User" } },
      "user-4": { user_id: "user-4", user: { id: "user-4", name: "Priya Singh" } },
    },
  },
  countUnread: () => 1,
};

const allChannels = [channelRead1, channelUnread2, channelFavAndUnread3];
const chatStates = {
  "messaging:chan-3": { isFavourite: true },
};

// TEST 1: All tab returns all 3 channels
runTest("Test 1: All tab returns all 3 active channels", () => {
  const result = filterChannels({
    channels: allChannels,
    activeFilter: "all",
    chatStates,
    currentUserId: "user-1",
  });
  assert.strictEqual(result.length, 3);
});

// TEST 2: Unread tab returns ONLY channels with unreadCount > 0
runTest("Test 2: Unread tab returns ONLY channels with unreadCount > 0", () => {
  const result = filterChannels({
    channels: allChannels,
    activeFilter: "unread",
    chatStates,
    currentUserId: "user-1",
  });
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result.some((c) => c.cid === "messaging:chan-1"), false);
  assert.strictEqual(result.some((c) => c.cid === "messaging:chan-2"), true);
  assert.strictEqual(result.some((c) => c.cid === "messaging:chan-3"), true);
});

// TEST 3: Marking channel as read removes it from Unread tab
runTest("Test 3: markRead() updates unreadCount and removes channel from Unread tab", () => {
  channelUnread2.markRead(); // Mark Aman Sharma channel read

  const result = filterChannels({
    channels: allChannels,
    activeFilter: "unread",
    chatStates,
    currentUserId: "user-1",
  });
  assert.strictEqual(result.length, 1); // Only Priya Singh remains
  assert.strictEqual(result[0].cid, "messaging:chan-3");
});

// TEST 4: Favourites & Unread coexistence
runTest("Test 4: Channel can exist in both Favourites and Unread tabs", () => {
  const favs = filterChannels({
    channels: allChannels,
    activeFilter: "favourites",
    chatStates,
    currentUserId: "user-1",
  });
  assert.strictEqual(favs.length, 1);
  assert.strictEqual(favs[0].cid, "messaging:chan-3");

  const unreads = filterChannels({
    channels: allChannels,
    activeFilter: "unread",
    chatStates,
    currentUserId: "user-1",
  });
  assert.strictEqual(unreads.some((c) => c.cid === "messaging:chan-3"), true);
});

// TEST 5: Search filtering within Unread tab
runTest("Test 5: Search query filters within Unread tab conversations", () => {
  // Re-add unread count to chan-2 for test
  channelUnread2.state.unreadCount = 3;
  channelUnread2.countUnread = () => 3;

  const searchResult = filterChannels({
    channels: allChannels,
    activeFilter: "unread",
    searchQuery: "Aman",
    chatStates,
    currentUserId: "user-1",
  });
  assert.strictEqual(searchResult.length, 1);
  assert.strictEqual(searchResult[0].cid, "messaging:chan-2");
});

console.log("\n==============================================");
console.log(`Test Summary: ${passedTests}/${totalTests} tests passed.`);
console.log("==============================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
