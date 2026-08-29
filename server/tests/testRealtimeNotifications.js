// ---------------------------------------------------------------------------
// server/tests/testRealtimeNotifications.js
// Unit & Integration Test Suite for Step 4 Real-Time Notifications
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
  // Ignore DNS fallback error
}

const User = require("../models/user");
const Notification = require("../models/notification");
const { initSocketService, emitNotificationToUser } = require("../services/socketService");
const { createNotification } = require("../services/notificationService");

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

function generateTestToken(userId) {
  return jwt.sign(
    { id: userId.toString() },
    process.env.JWT_SECRET || "gethack_super_secret_jwt_key_2026",
    { expiresIn: "1h" }
  );
}

async function runRealtimeNotificationTests() {
  console.log("\n==============================================");
  console.log("Running getHack Step 4 Real-Time Notification Tests");
  console.log("==============================================\n");

  const app = express();
  const server = http.createServer(app);
  const ioServer = initSocketService(server);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`[Test Server] Started test HTTP/Socket.IO server on port ${port}`);

  // Create mock MongoDB User documents in memory / DB
  const userAId = new mongoose.Types.ObjectId();
  const userBId = new mongoose.Types.ObjectId();
  const userCId = new mongoose.Types.ObjectId();

  await User.deleteMany({ email: { $in: ["testA@example.com", "testB@example.com", "testC@example.com"] } });

  const userA = await User.create({
    _id: userAId,
    name: "User A",
    email: "testA@example.com",
    password: "Password123!",
    role: "participant",
  });

  const userB = await User.create({
    _id: userBId,
    name: "User B",
    email: "testB@example.com",
    password: "Password123!",
    role: "participant",
  });

  const userC = await User.create({
    _id: userCId,
    name: "User C",
    email: "testC@example.com",
    password: "Password123!",
    role: "participant",
  });

  const tokenB = generateTestToken(userBId);
  const tokenC = generateTestToken(userCId);

  let socketB = null;
  let socketC = null;

  // Test 1: Socket Authentication & Room Joining
  console.log("[Test Set 1: Socket Authentication & Room Connection]");

  await runTest("Recipient User B connects successfully and joins user:userBId room", async () => {
    socketB = ClientIO(`http://localhost:${port}`, {
      path: "/socket.io/",
      auth: { token: tokenB },
      transports: ["websocket", "polling"],
    });

    await new Promise((resolve, reject) => {
      socketB.on("connect", resolve);
      socketB.on("connect_error", (err) => reject(new Error("Connection failed: " + err.message)));
    });

    assert.strictEqual(socketB.connected, true);
  });

  await runTest("User C connects to separate user:userCId room", async () => {
    socketC = ClientIO(`http://localhost:${port}`, {
      path: "/socket.io/",
      auth: { token: tokenC },
      transports: ["websocket", "polling"],
    });

    await new Promise((resolve, reject) => {
      socketC.on("connect", resolve);
      socketC.on("connect_error", (err) => reject(new Error("Connection failed: " + err.message)));
    });

    assert.strictEqual(socketC.connected, true);
  });

  // Test 2: Real-Time Notification Delivery on createNotification
  console.log("\n[Test Set 2: Real-Time Event Emission]");

  let receivedByB = null;
  let receivedByC = null;

  socketB.on("notification:created", (data) => {
    receivedByB = data;
  });

  socketC.on("notification:created", (data) => {
    receivedByC = data;
  });

  await runTest("User A sends connection request -> User B receives real-time notification:created event", async () => {
    const notif = await createNotification({
      recipient: userBId,
      sender: userAId,
      type: "CONNECTION_REQUEST",
      title: "New connection request",
      message: "User A sent you a connection request",
    });

    // Wait 200ms for event transmission
    await new Promise((res) => setTimeout(res, 200));

    assert.ok(receivedByB, "User B should have received real-time event");
    assert.strictEqual(receivedByB.notification._id.toString(), notif._id.toString());
    assert.strictEqual(receivedByB.notification.type, "CONNECTION_REQUEST");
    assert.strictEqual(receivedByB.notification.title, "New connection request");
  });

  // Test 3: User Isolation
  console.log("\n[Test Set 3: User Isolation Security]");

  await runTest("User C did NOT receive User B's notification event", () => {
    assert.strictEqual(receivedByC, null, "User C must NOT receive User B's private notification");
  });

  // Test 4: Team Invitation Real-Time Delivery
  console.log("\n[Test Set 4: Team Invitation Event]");

  let teamEventB = null;
  socketB.on("notification:created", (data) => {
    if (data.notification.type === "TEAM_INVITATION") {
      teamEventB = data;
    }
  });

  await runTest("User A invites User B to team -> User B receives TEAM_INVITATION event immediately", async () => {
    const teamId = new mongoose.Types.ObjectId();
    const teamNotif = await createNotification({
      recipient: userBId,
      sender: userAId,
      type: "TEAM_INVITATION",
      title: "Team Invitation",
      message: "User A invited you to join CodeHackers",
      entityType: "Team",
      entityId: teamId,
    });

    await new Promise((res) => setTimeout(res, 200));

    assert.ok(teamEventB, "User B should receive team invitation event");
    assert.strictEqual(teamEventB.notification._id.toString(), teamNotif._id.toString());
    assert.strictEqual(teamEventB.notification.entityId.toString(), teamId.toString());
  });

  // Test 5: Self-Notification & Cleanup
  console.log("\n[Test Set 5: Self-Notification Guard & Disconnect]");

  await runTest("Self-notification attempt emits 0 events", async () => {
    let selfReceived = false;
    socketB.on("notification:created", () => {
      selfReceived = true;
    });

    const selfRes = await createNotification({
      recipient: userBId,
      sender: userBId, // Same user
      type: "CONNECTION_ACCEPTED",
      title: "Self action",
      message: "Self message",
    });

    await new Promise((res) => setTimeout(res, 150));

    assert.strictEqual(selfRes, null);
    assert.strictEqual(selfReceived, false);
  });

  // Cleanup sockets & server
  if (socketB) socketB.disconnect();
  if (socketC) socketC.disconnect();
  await new Promise((res) => server.close(res));

  console.log("\n==============================================");
  console.log(`Real-Time Test Summary: ${passedTests} / ${totalTests} passed`);
  console.log("==============================================\n");
}

if (require.main === module) {
  const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/getHack";
  mongoose
    .connect(MONGO_URI)
    .then(async () => {
      await runRealtimeNotificationTests();
      await mongoose.connection.close();
      process.exit(passedTests === totalTests ? 0 : 1);
    })
    .catch((err) => {
      console.error("MongoDB connection failed:", err.message);
      process.exit(1);
    });
}
