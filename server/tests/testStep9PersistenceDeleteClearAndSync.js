// ---------------------------------------------------------------------------
// server/tests/testStep9PersistenceDeleteClearAndSync.js
// Automated Test Suite for Step 9: Notification History, Persistence, Delete/Clear & Security
// ---------------------------------------------------------------------------

const assert = require("node:assert");
const http = require("http");
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { io: ClientIO } = require("socket.io-client");
const dns = require("dns");
require("dotenv").config();

try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder("ipv4first");
  }
  dns.setServers(["1.1.1.1", "8.8.8.8", "8.8.4.4"]);
} catch (err) {
  // Ignore DNS fallback
}

const User = require("../models/user");
const Notification = require("../models/notification");

const { initSocketService } = require("../services/socketService");
const { createNotification } = require("../services/notificationService");
const {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
} = require("../controllers/notificationController");

let totalTests = 0;
let passedTests = 0;

async function runTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ PASSED: ${name}`);
  } catch (err) {
    console.error(`  ✗ FAILED: ${name}`);
    console.error(`    ${err.message}`);
  }
}

function mockRes() {
  const res = {};
  res.statusCode = 200;
  res.data = null;
  res.status = function (code) {
    this.statusCode = code;
    return this;
  };
  res.json = function (obj) {
    this.data = obj;
    return this;
  };
  return res;
}

async function runStep9Tests() {
  console.log("\n==============================================");
  console.log("Running getHack Step 9 Persistence, Delete/Clear & Security Test Suite");
  console.log("==============================================\n");

  const app = express();
  app.use(express.json());
  const server = http.createServer(app);
  initSocketService(server);

  await new Promise((res) => server.listen(0, res));
  const port = server.address().port;

  const userAId = new mongoose.Types.ObjectId();
  const userBId = new mongoose.Types.ObjectId();

  await User.deleteMany({ email: { $in: ["step9userA@example.com", "step9userB@example.com"] } });
  await Notification.deleteMany({ recipient: { $in: [userAId, userBId] } });

  const userA = await User.create({
    _id: userAId,
    name: "Step 9 User A",
    email: "step9userA@example.com",
    password: "Password123!",
    role: "participant",
  });

  const userB = await User.create({
    _id: userBId,
    name: "Step 9 User B",
    email: "step9userB@example.com",
    password: "Password123!",
    role: "participant",
  });

  // Test Set 1: Persistence across simulated refreshes
  console.log("[Test Set 1: Persistence Across Simulated Refreshes]");

  await runTest("Notifications & unread badge count persist accurately from MongoDB", async () => {
    await createNotification({ recipient: userAId, sender: userBId, type: "CONNECTION_REQUEST", title: "N1", message: "M1" });
    const n2 = await createNotification({ recipient: userAId, sender: userBId, type: "TEAM_INVITATION", title: "N2", message: "M2" });
    await createNotification({ recipient: userAId, sender: userBId, type: "CONNECTION_ACCEPTED", title: "N3", message: "M3" });

    // Mark N2 read
    n2.isRead = true;
    await n2.save();

    // Simulate page refresh (fetch from backend)
    const resCount = mockRes();
    await getUnreadNotificationCount({ user: userA }, resCount);
    assert.strictEqual(resCount.data.count, 2);

    const resList = mockRes();
    await getNotifications({ user: userA, query: { page: 1, limit: 20 } }, resList);
    assert.strictEqual(resList.data.notifications.length, 3);
  });

  // Test Set 2: Single Notification Delete & Security
  console.log("\n[Test Set 2: Delete Single Notification & Authorization Security]");

  let targetNotifId = null;
  await runTest("User A can delete their own notification", async () => {
    const listRes = mockRes();
    await getNotifications({ user: userA, query: {} }, listRes);
    targetNotifId = listRes.data.notifications[0]._id.toString();

    const delRes = mockRes();
    await deleteNotification({ user: userA, params: { notificationId: targetNotifId } }, delRes);
    assert.strictEqual(delRes.statusCode, 200);

    const checkDoc = await Notification.findById(targetNotifId);
    assert.strictEqual(checkDoc, null);
  });

  await runTest("User B CANNOT delete User A's notification (Security)", async () => {
    const notifA = await createNotification({ recipient: userAId, sender: userBId, type: "CONNECTION_REQUEST", title: "A Secret", message: "Msg" });

    const delRes = mockRes();
    await deleteNotification({ user: userB, params: { notificationId: notifA._id.toString() } }, delRes);
    assert.strictEqual(delRes.statusCode, 404);

    const checkDoc = await Notification.findById(notifA._id);
    assert.ok(checkDoc);
  });

  // Test Set 3: Clear All & Recipient Isolation Security
  console.log("\n[Test Set 3: Clear All & Recipient Isolation]");

  await runTest("Clear All deletes User A notifications but preserves User B notifications", async () => {
    await createNotification({ recipient: userBId, sender: userAId, type: "TEAM_MEMBER_ADDED", title: "For B", message: "Keep me" });

    const clearRes = mockRes();
    await clearAllNotifications({ user: userA }, clearRes);
    assert.strictEqual(clearRes.statusCode, 200);

    const countA = await Notification.countDocuments({ recipient: userAId });
    assert.strictEqual(countA, 0);

    const countB = await Notification.countDocuments({ recipient: userBId });
    assert.strictEqual(countB, 1);
  });

  // Test Set 4: Business Data Safety
  console.log("\n[Test Set 4: Business Model Safety]");

  await runTest("Clearing notifications does NOT delete underlying User models", async () => {
    const checkUserA = await User.findById(userAId);
    const checkUserB = await User.findById(userBId);
    assert.ok(checkUserA);
    assert.ok(checkUserB);
  });

  // Test Set 5: Real-Time Compatibility after Clear All
  console.log("\n[Test Set 5: Real-Time Delivery After Clear All]");

  await runTest("New notification arrives live after Clear All and updates count to 1", async () => {
    const token = jwt.sign({ id: userAId.toString() }, process.env.JWT_SECRET || "gethack_super_secret_jwt_key_2026", { expiresIn: "1h" });
    const clientSocket = ClientIO(`http://localhost:${port}`, { path: "/socket.io/", auth: { token } });

    await new Promise((res) => { if (clientSocket.connected) res(); else clientSocket.on("connect", res); });

    let receivedNotif = null;
    clientSocket.on("notification:created", (d) => {
      receivedNotif = d.notification;
    });

    await createNotification({ recipient: userAId, sender: userBId, type: "CONNECTION_REQUEST", title: "Post Clear Test", message: "Live after clear" });

    await new Promise((r) => setTimeout(r, 200));

    assert.ok(receivedNotif);
    assert.strictEqual(receivedNotif.title, "Post Clear Test");

    const resCount = mockRes();
    await getUnreadNotificationCount({ user: userA }, resCount);
    assert.strictEqual(resCount.data.count, 1);

    clientSocket.disconnect();
  });

  await new Promise((r) => server.close(r));

  console.log("\n==============================================");
  console.log(`Step 9 Test Summary: ${passedTests} / ${totalTests} passed`);
  console.log("==============================================\n");
}

if (require.main === module) {
  const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/getHack";
  mongoose
    .connect(MONGO_URI)
    .then(async () => {
      await runStep9Tests();
      await mongoose.connection.close();
      process.exit(passedTests === totalTests ? 0 : 1);
    })
    .catch((err) => {
      console.error("MongoDB connection failed:", err.message);
      process.exit(1);
    });
}
