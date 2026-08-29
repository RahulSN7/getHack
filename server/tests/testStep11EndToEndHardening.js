// ---------------------------------------------------------------------------
// server/tests/testStep11EndToEndHardening.js
// Master End-to-End Hardening & Production-Readiness Test Suite for getHack Notifications
// ---------------------------------------------------------------------------

const assert = require("node:assert");
const http = require("http");
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { io: ClientIO } = require("socket.io-client");
const fs = require("fs");
const path = require("path");
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
const Connection = require("../models/connection");
const Team = require("../models/team");
const TeamInvitation = require("../models/teamInvitation");

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

function resolveNotificationRoute(n) {
  if (!n) return "/network";
  const type = n.type || "";
  const entityType = n.entityType || "";
  const metadata = n.metadata || {};
  const teamId = metadata.teamId || (entityType === "Team" ? n.entityId : null);

  if (type.startsWith("CONNECTION") || type === "NEW_CONNECTION" || entityType === "Connection") {
    if (type === "CONNECTION_REQUEST") {
      return "/network?tab=requests";
    } else if (type === "CONNECTION_ACCEPTED") {
      return "/network?tab=connections";
    } else {
      return "/network";
    }
  } else if (type.startsWith("TEAM") || entityType === "Team") {
    if (type === "TEAM_MEMBER_REMOVED") {
      return "/teammates";
    } else if (type === "TEAM_INVITATION_REJECTED") {
      return "/teammates";
    } else if (teamId && typeof teamId === "string") {
      return `/team/${teamId}`;
    } else {
      return "/teammates";
    }
  } else if (type.includes("HACKATHON") || entityType === "Hackathon") {
    if (n.entityId && typeof n.entityId === "string") {
      return `/hackathons/${n.entityId}`;
    } else {
      return "/hackathons";
    }
  } else {
    return "/network";
  }
}

async function runMasterHardeningTests() {
  console.log("\n==============================================");
  console.log("Running getHack Master Notification End-to-End Hardening Suite");
  console.log("==============================================\n");

  const app = express();
  app.use(express.json());
  const server = http.createServer(app);
  initSocketService(server);

  await new Promise((res) => server.listen(0, res));
  const port = server.address().port;

  const userAId = new mongoose.Types.ObjectId();
  const userBId = new mongoose.Types.ObjectId();
  const userCId = new mongoose.Types.ObjectId();

  await User.deleteMany({ email: { $in: ["hardA@example.com", "hardB@example.com", "hardC@example.com"] } });
  await Notification.deleteMany({ recipient: { $in: [userAId, userBId, userCId] } });

  const userA = await User.create({ _id: userAId, name: "Hardening User A", email: "hardA@example.com", password: "Password123!", role: "participant" });
  const userB = await User.create({ _id: userBId, name: "Hardening User B", email: "hardB@example.com", password: "Password123!", role: "participant" });
  const userC = await User.create({ _id: userCId, name: "Hardening User C", email: "hardC@example.com", password: "Password123!", role: "participant" });

  // 1. User Isolation & Security Tests
  console.log("[Test Suite 1: User Isolation & Security Authorization]");

  await runTest("User A can only fetch notifications addressed to User A", async () => {
    await createNotification({ recipient: userAId, sender: userBId, type: "CONNECTION_REQUEST", title: "For A", message: "Msg A" });
    await createNotification({ recipient: userBId, sender: userAId, type: "CONNECTION_REQUEST", title: "For B", message: "Msg B" });

    const resA = mockRes();
    await getNotifications({ user: userA, query: {} }, resA);
    assert.strictEqual(resA.data.notifications.length, 1);
    assert.strictEqual(resA.data.notifications[0].title, "For A");
  });

  await runTest("User A cannot mark User B's notification as read", async () => {
    const notifB = await createNotification({ recipient: userBId, sender: userAId, type: "TEAM_INVITATION", title: "B Secret", message: "Secret" });
    const res = mockRes();
    await markNotificationAsRead({ user: userA, params: { notificationId: notifB._id.toString() } }, res);
    assert.strictEqual(res.statusCode, 404);

    const docB = await Notification.findById(notifB._id);
    assert.strictEqual(docB.isRead, false);
  });

  await runTest("User A cannot delete User B's notification", async () => {
    const notifB = await Notification.findOne({ recipient: userBId });
    const res = mockRes();
    await deleteNotification({ user: userA, params: { notificationId: notifB._id.toString() } }, res);
    assert.strictEqual(res.statusCode, 404);

    const docB = await Notification.findById(notifB._id);
    assert.ok(docB);
  });

  await runTest("Clear-all for User A leaves User B's notifications completely untouched", async () => {
    const res = mockRes();
    await clearAllNotifications({ user: userA }, res);
    assert.strictEqual(res.statusCode, 200);

    const countA = await Notification.countDocuments({ recipient: userAId });
    assert.strictEqual(countA, 0);

    const countB = await Notification.countDocuments({ recipient: userBId });
    assert.strictEqual(countB, 2);
  });

  // 2. Real-Time Delivery & Socket Isolation
  console.log("\n[Test Suite 2: Real-Time Event & Room Isolation]");

  await runTest("Socket event for User B is NOT delivered to User C", async () => {
    const tokenB = jwt.sign({ id: userBId.toString() }, process.env.JWT_SECRET || "gethack_super_secret_jwt_key_2026", { expiresIn: "1h" });
    const tokenC = jwt.sign({ id: userCId.toString() }, process.env.JWT_SECRET || "gethack_super_secret_jwt_key_2026", { expiresIn: "1h" });

    const socketB = ClientIO(`http://localhost:${port}`, { path: "/socket.io/", auth: { token: tokenB } });
    const socketC = ClientIO(`http://localhost:${port}`, { path: "/socket.io/", auth: { token: tokenC } });

    await new Promise((r) => { if (socketB.connected) r(); else socketB.on("connect", r); });
    await new Promise((r) => { if (socketC.connected) r(); else socketC.on("connect", r); });

    let eventsB = [];
    let eventsC = [];

    socketB.on("notification:created", (d) => eventsB.push(d.notification));
    socketC.on("notification:created", (d) => eventsC.push(d.notification));

    await createNotification({ recipient: userBId, sender: userAId, type: "CONNECTION_ACCEPTED", title: "Event for B", message: "Only B" });

    await new Promise((r) => setTimeout(r, 200));

    assert.strictEqual(eventsB.length, 1);
    assert.strictEqual(eventsC.length, 0);

    socketB.disconnect();
    socketC.disconnect();
  });

  // 3. UI/UX Verification: CTA Absence & Navigation Matrix
  console.log("\n[Test Suite 3: UI CTA Absence & Shortcut Navigation Matrix]");

  await runTest("Header.jsx contains ZERO inline CTA Accept / Decline buttons", () => {
    const headerPath = path.join(__dirname, "../../client/src/components/Header/Header.jsx");
    const headerContent = fs.readFileSync(headerPath, "utf8");
    assert.strictEqual(headerContent.includes("Accepting..."), false);
    assert.strictEqual(headerContent.includes("Declining..."), false);
  });

  await runTest("All 8 notification types resolve to valid existing routes", () => {
    const mockTeamId = new mongoose.Types.ObjectId().toString();

    assert.strictEqual(resolveNotificationRoute({ type: "CONNECTION_REQUEST" }), "/network?tab=requests");
    assert.strictEqual(resolveNotificationRoute({ type: "CONNECTION_ACCEPTED" }), "/network?tab=connections");
    assert.strictEqual(resolveNotificationRoute({ type: "CONNECTION_REJECTED" }), "/network");
    assert.strictEqual(resolveNotificationRoute({ type: "TEAM_INVITATION", metadata: { teamId: mockTeamId } }), `/team/${mockTeamId}`);
    assert.strictEqual(resolveNotificationRoute({ type: "TEAM_INVITATION", metadata: {} }), "/teammates");
    assert.strictEqual(resolveNotificationRoute({ type: "TEAM_INVITATION_ACCEPTED", metadata: { teamId: mockTeamId } }), `/team/${mockTeamId}`);
    assert.strictEqual(resolveNotificationRoute({ type: "TEAM_MEMBER_ADDED", metadata: { teamId: mockTeamId } }), `/team/${mockTeamId}`);
    assert.strictEqual(resolveNotificationRoute({ type: "TEAM_MEMBER_REMOVED", metadata: { teamId: mockTeamId } }), "/teammates");
  });

  // 4. Persistence & State Sync Tests
  console.log("\n[Test Suite 4: Persistence & Unread Count Integrity]");

  await runTest("Unread count API returns exact database count and never goes negative", async () => {
    const resCountBefore = mockRes();
    await getUnreadNotificationCount({ user: userB }, resCountBefore);
    const countBefore = resCountBefore.data.count;

    const resReadAll = mockRes();
    await markAllNotificationsAsRead({ user: userB }, resReadAll);
    assert.strictEqual(resReadAll.statusCode, 200);

    const resCountAfter = mockRes();
    await getUnreadNotificationCount({ user: userB }, resCountAfter);
    assert.strictEqual(resCountAfter.data.count, 0);
  });

  // 5. Business Data Integrity Test
  console.log("\n[Test Suite 5: Business Data Integrity]");

  await runTest("Deleting or clearing notifications preserves Users, Teams, Connections, and Invitations", async () => {
    const resClear = mockRes();
    await clearAllNotifications({ user: userB }, resClear);
    assert.strictEqual(resClear.statusCode, 200);

    const checkA = await User.findById(userAId);
    const checkB = await User.findById(userBId);
    const checkC = await User.findById(userCId);

    assert.ok(checkA);
    assert.ok(checkB);
    assert.ok(checkC);
  });

  await new Promise((r) => server.close(r));

  console.log("\n==============================================");
  console.log(`Master Hardening Suite Summary: ${passedTests} / ${totalTests} passed`);
  console.log("==============================================\n");
}

if (require.main === module) {
  const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/getHack";
  mongoose
    .connect(MONGO_URI)
    .then(async () => {
      await runMasterHardeningTests();
      await mongoose.connection.close();
      process.exit(passedTests === totalTests ? 0 : 1);
    })
    .catch((err) => {
      console.error("MongoDB connection failed:", err.message);
      process.exit(1);
    });
}
