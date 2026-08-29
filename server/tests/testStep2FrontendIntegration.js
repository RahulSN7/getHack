// ---------------------------------------------------------------------------
// server/tests/testStep2FrontendIntegration.js
// Unit & Integration Test for Notification UI Service & Real Data Binding
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

async function runStep2Tests() {
  console.log("\n==============================================");
  console.log("Running getHack Step 2 Frontend Integration Tests");
  console.log("==============================================\n");

  const testUserA = new mongoose.Types.ObjectId();
  const testUserB = new mongoose.Types.ObjectId();

  // Test 1: Empty State
  await runTest("Empty user returns notifications: [] and unread-count: 0 (No static data fallback)", async () => {
    const reqNotifications = { user: { _id: testUserA }, query: {} };
    const resNotifications = createMockRes();
    await getNotifications(reqNotifications, resNotifications);

    assert.strictEqual(resNotifications.body.success, true);
    assert.strictEqual(resNotifications.body.notifications.length, 0);

    const reqCount = { user: { _id: testUserA } };
    const resCount = createMockRes();
    await getUnreadNotificationCount(reqCount, resCount);

    assert.strictEqual(resCount.body.success, true);
    assert.strictEqual(resCount.body.count, 0);
  });

  // Test 2: Real Database Data Binding
  let notif1, notif2, notif3;
  await runTest("Creating 3 notifications (2 unread, 1 read) for User A binds real database data", async () => {
    notif1 = await createNotification({
      recipient: testUserA,
      sender: testUserB,
      type: "CONNECTION_REQUEST",
      title: "New connection request",
      message: "TestUserB sent you a connection request",
    });

    notif2 = await createNotification({
      recipient: testUserA,
      sender: testUserB,
      type: "TEAM_INVITATION",
      title: "Team Invitation",
      message: "TestUserB invited you to join team Alpha",
    });

    notif3 = await createNotification({
      recipient: testUserA,
      sender: testUserB,
      type: "NEW_MESSAGE",
      title: "New Message",
      message: "TestUserB sent you a message",
    });

    // Mark notif3 as read manually to simulate existing read notification
    await Notification.findByIdAndUpdate(notif3._id, { isRead: true });

    const resNotifications = createMockRes();
    await getNotifications({ user: { _id: testUserA }, query: {} }, resNotifications);

    assert.strictEqual(resNotifications.body.notifications.length, 3);

    const resCount = createMockRes();
    await getUnreadNotificationCount({ user: { _id: testUserA } }, resCount);
    assert.strictEqual(resCount.body.count, 2); // 2 unread, 1 read
  });

  // Test 3: Mark single notification read
  await runTest("Clicking one notification marks ONLY that notification read and decreases unread count", async () => {
    const resMark = createMockRes();
    await markNotificationAsRead(
      { user: { _id: testUserA }, params: { notificationId: notif1._id.toString() } },
      resMark
    );

    assert.strictEqual(resMark.body.success, true);
    assert.strictEqual(resMark.body.notification.isRead, true);

    const resCount = createMockRes();
    await getUnreadNotificationCount({ user: { _id: testUserA } }, resCount);
    assert.strictEqual(resCount.body.count, 1);

    // Verify notif2 is still unread
    const doc2 = await Notification.findById(notif2._id);
    assert.strictEqual(doc2.isRead, false);
  });

  // Test 4: Mark all notifications read
  await runTest("Mark all read sets all User A notifications as read and count to 0", async () => {
    const resMarkAll = createMockRes();
    await markAllNotificationsAsRead({ user: { _id: testUserA } }, resMarkAll);

    assert.strictEqual(resMarkAll.body.success, true);

    const resCount = createMockRes();
    await getUnreadNotificationCount({ user: { _id: testUserA } }, resCount);
    assert.strictEqual(resCount.body.count, 0);

    const doc2 = await Notification.findById(notif2._id);
    assert.strictEqual(doc2.isRead, true);
  });

  // Test 5: Isolation check
  await runTest("User B has 0 notifications and is completely isolated from User A", async () => {
    const resCountB = createMockRes();
    await getUnreadNotificationCount({ user: { _id: testUserB } }, resCountB);
    assert.strictEqual(resCountB.body.count, 0);

    const resNotifsB = createMockRes();
    await getNotifications({ user: { _id: testUserB }, query: {} }, resNotifsB);
    assert.strictEqual(resNotifsB.body.notifications.length, 0);
  });

  console.log("\n==============================================");
  console.log(`Step 2 Integration Summary: ${passedTests} / ${totalTests} passed`);
  console.log("==============================================\n");
}

if (require.main === module) {
  const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/getHack";
  mongoose
    .connect(MONGO_URI)
    .then(async () => {
      await runStep2Tests();
      await mongoose.connection.close();
      process.exit(passedTests === totalTests ? 0 : 1);
    })
    .catch((err) => {
      console.error("MongoDB connection failed:", err.message);
      process.exit(1);
    });
}
