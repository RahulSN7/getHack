// ---------------------------------------------------------------------------
// server/tests/testNotificationSystem.js
// Unit & Integration Test Suite for getHack Notification System Foundation
// ---------------------------------------------------------------------------

const assert = require("node:assert");
const mongoose = require("mongoose");
const dns = require("dns");
require("dotenv").config();

try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder("ipv4first");
  }
  dns.setServers(["1.1.1.1", "8.8.8.8", "8.8.4.4"]);
} catch (err) {
  // Ignore DNS fallback error
}

const User = require("../models/user");
const Notification = require("../models/notification");
const { NOTIFICATION_TYPES } = require("../models/notification");
const { createNotification } = require("../services/notificationService");
const {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require("../controllers/notificationController");

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    const result = fn();
    if (result && typeof result.then === "function") {
      return result
        .then(() => {
          passedTests++;
          console.log(`  ✓ PASSED: ${name}`);
        })
        .catch((err) => {
          console.error(`  ✗ FAILED: ${name}`);
          console.error(`    ${err.message}`);
        });
    } else {
      passedTests++;
      console.log(`  ✓ PASSED: ${name}`);
    }
  } catch (err) {
    console.error(`  ✗ FAILED: ${name}`);
    console.error(`    ${err.message}`);
  }
}

// Helper mock response object generator for testing Express controllers
function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
}

async function runNotificationTests() {
  console.log("\n==============================================");
  console.log("Running getHack Notification System Backend Tests");
  console.log("==============================================\n");

  const userAId = new mongoose.Types.ObjectId();
  const userBId = new mongoose.Types.ObjectId();
  const userCId = new mongoose.Types.ObjectId();

  // Test 1: Controlled Notification Types Enum Validation
  console.log("[Test Set 1: Controlled Notification Types]");
  await runTest("Controlled notification types include all required enums", () => {
    const expectedTypes = [
      "CONNECTION_REQUEST",
      "CONNECTION_ACCEPTED",
      "CONNECTION_REJECTED",
      "NEW_CONNECTION",
      "TEAM_INVITATION",
      "TEAM_INVITATION_ACCEPTED",
      "TEAM_INVITATION_REJECTED",
      "TEAM_MEMBER_ADDED",
      "TEAM_MEMBER_REMOVED",
      "NEW_MESSAGE",
      "MESSAGE_REPLY",
      "SAVED_HACKATHON_UPDATE",
      "SAVED_HACKATHON_DEADLINE",
      "REGISTRATION_HACAKATHON_UPDATE",
    ];

    expectedTypes.forEach((type) => {
      assert.strictEqual(
        NOTIFICATION_TYPES.includes(type),
        true,
        `Type ${type} missing from NOTIFICATION_TYPES`
      );
    });
  });

  // Test 2: Notification Service Creation & Protections
  console.log("\n[Test Set 2: Notification Service & Protections]");

  let notification1;
  let notification2;
  let userBNotification;

  await runTest("createNotification creates a valid notification document", async () => {
    notification1 = await createNotification({
      recipient: userAId,
      sender: userBId,
      type: "CONNECTION_REQUEST",
      title: "New Connection Request",
      message: "User B sent you a connection request",
      entityType: "Connection",
      entityId: new mongoose.Types.ObjectId(),
      metadata: { actionId: "action-101" },
    });

    assert.strictEqual(notification1.recipient.toString(), userAId.toString());
    assert.strictEqual(notification1.sender.toString(), userBId.toString());
    assert.strictEqual(notification1.type, "CONNECTION_REQUEST");
    assert.strictEqual(notification1.isRead, false);
  });

  await runTest("createNotification prevents self-notifications (sender === recipient)", async () => {
    const selfNotif = await createNotification({
      recipient: userAId,
      sender: userAId, // Same user
      type: "CONNECTION_ACCEPTED",
      title: "Self action",
      message: "You accepted your own request",
    });

    assert.strictEqual(selfNotif, null);
  });

  await runTest("createNotification prevents duplicate notifications when actionId matches", async () => {
    const duplicateNotif = await createNotification({
      recipient: userAId,
      sender: userBId,
      type: "CONNECTION_REQUEST",
      title: "New Connection Request",
      message: "User B sent you a connection request",
      metadata: { actionId: "action-101" }, // Duplicate actionId
    });

    assert.strictEqual(duplicateNotif._id.toString(), notification1._id.toString());
  });

  await runTest("User A and User B notification generation", async () => {
    notification2 = await createNotification({
      recipient: userAId,
      sender: userCId,
      type: "TEAM_INVITATION",
      title: "Team Invitation",
      message: "User C invited you to join CodeHackers",
    });

    userBNotification = await createNotification({
      recipient: userBId,
      sender: userAId,
      type: "NEW_MESSAGE",
      title: "New Message",
      message: "User A sent you a message",
    });

    assert.ok(notification2._id);
    assert.ok(userBNotification._id);
  });

  // Test 3: User Scoping (Security)
  console.log("\n[Test Set 3: User Scoping Security]");

  await runTest("GET /api/notifications returns ONLY authenticated user's notifications", async () => {
    const reqA = { user: { _id: userAId }, query: {} };
    const resA = createMockRes();
    await getNotifications(reqA, resA);

    assert.strictEqual(resA.statusCode, 200);
    assert.strictEqual(resA.body.success, true);
    assert.strictEqual(resA.body.notifications.length, 2);

    const recipientIds = resA.body.notifications.map((n) => n.recipient.toString());
    assert.ok(recipientIds.every((id) => id === userAId.toString()));
  });

  await runTest("User B does NOT see User A's notifications", async () => {
    const reqB = { user: { _id: userBId }, query: {} };
    const resB = createMockRes();
    await getNotifications(reqB, resB);

    assert.strictEqual(resB.statusCode, 200);
    assert.strictEqual(resB.body.success, true);
    assert.strictEqual(resB.body.notifications.length, 1);
    assert.strictEqual(resB.body.notifications[0]._id.toString(), userBNotification._id.toString());
  });

  // Test 4: Unread Count API
  console.log("\n[Test Set 4: Unread Count API]");

  await runTest("GET /api/notifications/unread-count returns exact unread count", async () => {
    const reqA = { user: { _id: userAId } };
    const resA = createMockRes();
    await getUnreadNotificationCount(reqA, resA);

    assert.strictEqual(resA.statusCode, 200);
    assert.strictEqual(resA.body.success, true);
    assert.strictEqual(resA.body.count, 2);
  });

  // Test 5: Mark Single Notification as Read
  console.log("\n[Test Set 5: Mark Single Notification Read]");

  await runTest("PATCH /api/notifications/:notificationId/read marks single notification as read", async () => {
    const reqRead = {
      user: { _id: userAId },
      params: { notificationId: notification1._id.toString() },
    };
    const resRead = createMockRes();
    await markNotificationAsRead(reqRead, resRead);

    assert.strictEqual(resRead.statusCode, 200);
    assert.strictEqual(resRead.body.success, true);
    assert.strictEqual(resRead.body.notification.isRead, true);

    // Verify unread count decreased to 1
    const reqCount = { user: { _id: userAId } };
    const resCount = createMockRes();
    await getUnreadNotificationCount(reqCount, resCount);
    assert.strictEqual(resCount.body.count, 1);
  });

  await runTest("User B cannot mark User A's notification as read (Authorization check)", async () => {
    const reqUnauthorized = {
      user: { _id: userBId }, // User B trying to mark User A's notification
      params: { notificationId: notification2._id.toString() },
    };
    const resUnauthorized = createMockRes();
    await markNotificationAsRead(reqUnauthorized, resUnauthorized);

    assert.strictEqual(resUnauthorized.statusCode, 404);
    assert.strictEqual(resUnauthorized.body.success, false);
  });

  // Test 6: Mark All Notifications Read & Persistence
  console.log("\n[Test Set 6: Mark All Notifications Read & User B Isolation]");

  await runTest("PATCH /api/notifications/read-all marks all User A notifications as read", async () => {
    const reqReadAll = { user: { _id: userAId } };
    const resReadAll = createMockRes();
    await markAllNotificationsAsRead(reqReadAll, resReadAll);

    assert.strictEqual(resReadAll.statusCode, 200);
    assert.strictEqual(resReadAll.body.success, true);

    // Verify User A unread count is now 0
    const resCountA = createMockRes();
    await getUnreadNotificationCount({ user: { _id: userAId } }, resCountA);
    assert.strictEqual(resCountA.body.count, 0);
  });

  await runTest("User B's notifications remain untouched after User A read-all", async () => {
    const resCountB = createMockRes();
    await getUnreadNotificationCount({ user: { _id: userBId } }, resCountB);
    assert.strictEqual(resCountB.body.count, 1);
  });

  await runTest("Persisted database state matches marked read statuses", async () => {
    const doc1 = await Notification.findById(notification1._id);
    const doc2 = await Notification.findById(notification2._id);
    const docB = await Notification.findById(userBNotification._id);

    assert.strictEqual(doc1.isRead, true);
    assert.strictEqual(doc2.isRead, true);
    assert.strictEqual(docB.isRead, false);
  });

  // Test 7: Pagination Structure
  console.log("\n[Test Set 7: Pagination & Limit Constraints]");

  await runTest("GET /api/notifications returns standard pagination metadata", async () => {
    const reqPaginated = { user: { _id: userAId }, query: { page: "1", limit: "1" } };
    const resPaginated = createMockRes();
    await getNotifications(reqPaginated, resPaginated);

    assert.strictEqual(resPaginated.statusCode, 200);
    assert.strictEqual(resPaginated.body.pagination.page, 1);
    assert.strictEqual(resPaginated.body.pagination.limit, 1);
    assert.strictEqual(resPaginated.body.pagination.total, 2);
    assert.strictEqual(resPaginated.body.pagination.hasMore, true);
  });

  console.log("\n==============================================");
  console.log(`Notification Test Summary: ${passedTests} / ${totalTests} passed`);
  console.log("==============================================\n");
}

module.exports = runNotificationTests;

if (require.main === module) {
  const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/getHack";
  mongoose
    .connect(MONGO_URI)
    .then(async () => {
      console.log("Connected to MongoDB for Notification Test Suite execution");
      await runNotificationTests();
      await mongoose.connection.close();
      process.exit(passedTests === totalTests ? 0 : 1);
    })
    .catch(async (err) => {
      console.error("MongoDB connection failed, running tests in memory mode:", err.message);
      // Fallback in case MongoDB service is offline during test run
      try {
        const { MongoMemoryServer } = require("mongodb-memory-server");
        const mongod = await MongoMemoryServer.create();
        await mongoose.connect(mongod.getUri());
        await runNotificationTests();
        await mongoose.connection.close();
        await mongod.stop();
        process.exit(passedTests === totalTests ? 0 : 1);
      } catch (memoryErr) {
        console.error("Could not run in-memory MongoDB tests:", memoryErr.message);
        process.exit(1);
      }
    });
}
