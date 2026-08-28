// ---------------------------------------------------------------------------
// server/tests/testMessageStatusResolution.js
// Integration Test Suite for WhatsApp-Style Message Status System
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
  } else if (deliveredDetails.length === recipientIds.length && deliveredDetails.length > 0) {
    status = "delivered";
  }

  return { status, readDetails, deliveredDetails };
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
console.log("Running Message Status System Resolution Tests");
console.log("==============================================\n");

// TEST 1: Sending message status
runTest("Test 1: Message in sending state resolves status 'sending'", () => {
  const msg = { id: "m1", status: "sending", created_at: new Date().toISOString() };
  const channel = { state: { members: {}, read: {} } };
  const res = getMessageStatusDetails(msg, channel, "user-sender");
  assert.strictEqual(res.status, "sending");
});

// TEST 2: Failed message status
runTest("Test 2: Message with send failure resolves status 'failed'", () => {
  const msg = { id: "m2", status: "failed", error: true, created_at: new Date().toISOString() };
  const channel = { state: { members: {}, read: {} } };
  const res = getMessageStatusDetails(msg, channel, "user-sender");
  assert.strictEqual(res.status, "failed");
});

// TEST 3: Sent status (accepted by server, recipient unread & offline)
runTest("Test 3: Server-accepted message with offline unread recipient resolves status 'sent'", () => {
  const msg = { id: "m3", status: "received", created_at: "2026-08-28T10:00:00.000Z" };
  const channel = {
    state: {
      members: {
        "user-sender": { user_id: "user-sender" },
        "user-recipient": { user_id: "user-recipient", user: { online: false } },
      },
      read: {
        "user-recipient": { last_read: "2026-08-28T09:50:00.000Z" },
      },
    },
  };
  const res = getMessageStatusDetails(msg, channel, "user-sender");
  assert.strictEqual(res.status, "sent");
});

// TEST 4: Delivered status (recipient online & connected)
runTest("Test 4: Online connected recipient resolves status 'delivered'", () => {
  const msg = { id: "m4", status: "received", created_at: "2026-08-28T10:00:00.000Z" };
  const channel = {
    state: {
      members: {
        "user-sender": { user_id: "user-sender" },
        "user-recipient": { user_id: "user-recipient", user: { online: true, name: "Rahul" } },
      },
      read: {
        "user-recipient": { last_read: "2026-08-28T09:50:00.000Z" },
      },
    },
  };
  const res = getMessageStatusDetails(msg, channel, "user-sender");
  assert.strictEqual(res.status, "delivered");
  assert.strictEqual(res.deliveredDetails.length, 1);
  assert.strictEqual(res.deliveredDetails[0].name, "Rahul");
});

// TEST 5: Read status (recipient last_read >= message created_at)
runTest("Test 5: Recipient last_read timestamp after message creation resolves status 'read'", () => {
  const msg = { id: "m5", status: "received", created_at: "2026-08-28T10:00:00.000Z" };
  const channel = {
    state: {
      members: {
        "user-sender": { user_id: "user-sender" },
        "user-recipient": { user_id: "user-recipient", user: { online: true, name: "Rahul" } },
      },
      read: {
        "user-recipient": { last_read: "2026-08-28T10:05:00.000Z" },
      },
    },
  };
  const res = getMessageStatusDetails(msg, channel, "user-sender");
  assert.strictEqual(res.status, "read");
  assert.strictEqual(res.readDetails.length, 1);
  assert.strictEqual(res.readDetails[0].name, "Rahul");
});

console.log("\n==============================================");
console.log(`Test Summary: ${passedTests}/${totalTests} tests passed.`);
console.log("==============================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
