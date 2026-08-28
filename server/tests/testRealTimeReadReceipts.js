// ---------------------------------------------------------------------------
// server/tests/testRealTimeReadReceipts.js
// Integration Test Suite for Real-Time Message Read-Receipt Synchronization
// ---------------------------------------------------------------------------

const assert = require("node:assert");

function getMessageStatusDetails(msg, channel, currentUserId) {
  if (!msg) return { status: "sent", readDetails: [], deliveredDetails: [] };

  if (msg.status === "failed" || msg.error || msg.send_failed) {
    return { status: "failed", readDetails: [], deliveredDetails: [] };
  }

  if (msg.status === "sending" || msg.sending || msg._local) {
    return { status: "sending", readDetails: [], deliveredDetails: [] };
  }

  const createdTime = new Date(msg.created_at || Date.now()).getTime();
  const readStates = channel?.state?.read || {};
  const members = channel?.state?.members || {};

  const recipientIds = Object.keys(members).filter(
    (uid) => String(uid) !== String(currentUserId)
  );

  if (recipientIds.length === 0) {
    return { status: "sent", readDetails: [], deliveredDetails: [] };
  }

  const readDetails = [];
  const deliveredDetails = [];

  for (const rId of recipientIds) {
    const memberObj = members[rId];
    const rName = memberObj?.user?.name || memberObj?.user?.id || "Participant";
    const rRead = readStates[rId];
    const rLastRead = rRead?.last_read ? new Date(rRead.last_read).getTime() : 0;

    if (rLastRead >= createdTime) {
      readDetails.push({ id: rId, name: rName, time: rRead.last_read });
      deliveredDetails.push({ id: rId, name: rName, time: rRead.last_read || msg.created_at });
    } else {
      const isOnline = Boolean(memberObj?.user?.online || memberObj?.online);
      if (isOnline) {
        deliveredDetails.push({ id: rId, name: rName, time: msg.created_at });
      }
    }
  }

  let status = "sent";
  if (readDetails.length === recipientIds.length && recipientIds.length > 0) {
    status = "read";
  } else if (deliveredDetails.length === recipientIds.length && recipientIds.length > 0) {
    status = "delivered";
  }

  return { status, readDetails, deliveredDetails };
}

function handleReadEvent(event, channel) {
  if ((event.type === "message.read" || event.type === "notification.mark_read") && event.user?.id) {
    if (!channel.state.read) channel.state.read = {};
    channel.state.read[event.user.id] = {
      last_read: event.created_at || new Date().toISOString(),
      user: event.user,
    };
  }
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
console.log("Running Real-Time Message Read-Receipt Tests");
console.log("==============================================\n");

// Mock Channel & Messages
const channel = {
  cid: "messaging:userA-userB",
  state: {
    members: {
      "user-A": { user_id: "user-A", user: { id: "user-A", name: "User A" } },
      "user-B": { user_id: "user-B", user: { id: "user-B", name: "User B", online: true } },
    },
    read: {
      "user-B": { last_read: "2026-08-28T10:00:00.000Z" },
    },
  },
};

const msg1 = { id: "m1", text: "Hello", created_at: "2026-08-28T10:05:00.000Z" };
const msg2 = { id: "m2", text: "Are you free?", created_at: "2026-08-28T10:10:00.000Z" };

// TEST 1: Initial status before User B reads (Delivered because User B is online)
runTest("Test 1: Status before User B reads returns 'delivered'", () => {
  const res1 = getMessageStatusDetails(msg1, channel, "user-A");
  assert.strictEqual(res1.status, "delivered");
});

// TEST 2: Simulate message.read event from User B at 10:07 AM (Partial read: msg1 read, msg2 unread)
runTest("Test 2: Partial read event (10:07 AM) transitions msg1 to 'read' and msg2 to 'delivered'", () => {
  const readEvent = {
    type: "message.read",
    cid: "messaging:userA-userB",
    user: { id: "user-B", name: "User B" },
    created_at: "2026-08-28T10:07:00.000Z",
  };

  handleReadEvent(readEvent, channel);

  const res1 = getMessageStatusDetails(msg1, channel, "user-A");
  const res2 = getMessageStatusDetails(msg2, channel, "user-A");

  assert.strictEqual(res1.status, "read");
  assert.strictEqual(res2.status, "delivered");
});

// TEST 3: Simulate message.read event from User B at 10:12 AM (Full read: msg1 & msg2 read)
runTest("Test 3: Full read event (10:12 AM) transitions both msg1 and msg2 to 'read'", () => {
  const readEvent2 = {
    type: "message.read",
    cid: "messaging:userA-userB",
    user: { id: "user-B", name: "User B" },
    created_at: "2026-08-28T10:12:00.000Z",
  };

  handleReadEvent(readEvent2, channel);

  const res1 = getMessageStatusDetails(msg1, channel, "user-A");
  const res2 = getMessageStatusDetails(msg2, channel, "user-A");

  assert.strictEqual(res1.status, "read");
  assert.strictEqual(res2.status, "read");
});

console.log("\n==============================================");
console.log(`Test Summary: ${passedTests}/${totalTests} tests passed.`);
console.log("==============================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
