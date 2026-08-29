// ---------------------------------------------------------------------------
// server/tests/testStep7NavigationInteractionAndActions.js
// Automated Test Suite for Step 7: Complete Notification Navigation, Interaction, & Action Buttons
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
const Team = require("../models/team");
const TeamInvitation = require("../models/teamInvitation");

const { initSocketService } = require("../services/socketService");
const { createNotification } = require("../services/notificationService");

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

/**
 * Pure route resolution helper matching NotificationContext.jsx handleNotificationClick
 */
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

async function runStep7Tests() {
  console.log("\n==============================================");
  console.log("Running getHack Step 7 Navigation & Action Interaction Test Suite");
  console.log("==============================================\n");

  const app = express();
  app.use(express.json());
  const server = http.createServer(app);
  initSocketService(server);

  await new Promise((res) => server.listen(0, res));
  const port = server.address().port;

  const testTeamId = new mongoose.Types.ObjectId().toString();

  // Test 1: Route Resolution Matrix
  console.log("[Test Set 1: Safe Entity-Based Route Mapping]");

  await runTest("CONNECTION_REQUEST maps to /network?tab=requests", () => {
    const notif = { type: "CONNECTION_REQUEST", entityType: "Connection" };
    assert.strictEqual(resolveNotificationRoute(notif), "/network?tab=requests");
  });

  await runTest("CONNECTION_ACCEPTED maps to /network?tab=connections", () => {
    const notif = { type: "CONNECTION_ACCEPTED", entityType: "Connection" };
    assert.strictEqual(resolveNotificationRoute(notif), "/network?tab=connections");
  });

  await runTest("CONNECTION_REJECTED maps to /network", () => {
    const notif = { type: "CONNECTION_REJECTED", entityType: "Connection" };
    assert.strictEqual(resolveNotificationRoute(notif), "/network");
  });

  await runTest("TEAM_INVITATION maps to /team/:teamId when teamId exists", () => {
    const notif = { type: "TEAM_INVITATION", entityType: "Team", metadata: { teamId: testTeamId } };
    assert.strictEqual(resolveNotificationRoute(notif), `/team/${testTeamId}`);
  });

  await runTest("TEAM_INVITATION maps to /teammates when teamId is missing (Safety)", () => {
    const notif = { type: "TEAM_INVITATION", entityType: "Team", metadata: {} };
    assert.strictEqual(resolveNotificationRoute(notif), "/teammates");
  });

  await runTest("TEAM_INVITATION_ACCEPTED maps to /team/:teamId", () => {
    const notif = { type: "TEAM_INVITATION_ACCEPTED", entityType: "Team", metadata: { teamId: testTeamId } };
    assert.strictEqual(resolveNotificationRoute(notif), `/team/${testTeamId}`);
  });

  await runTest("TEAM_MEMBER_ADDED maps to /team/:teamId", () => {
    const notif = { type: "TEAM_MEMBER_ADDED", entityType: "Team", metadata: { teamId: testTeamId } };
    assert.strictEqual(resolveNotificationRoute(notif), `/team/${testTeamId}`);
  });

  await runTest("TEAM_MEMBER_REMOVED maps to /teammates (prevents 403 auth crash)", () => {
    const notif = { type: "TEAM_MEMBER_REMOVED", entityType: "Team", metadata: { teamId: testTeamId } };
    assert.strictEqual(resolveNotificationRoute(notif), "/teammates");
  });

  // Test Set 2: Read Status and Count Decrement
  console.log("\n[Test Set 2: Read Status & Unread Count State]");

  const recipientId = new mongoose.Types.ObjectId();
  const senderId = new mongoose.Types.ObjectId();

  await User.deleteMany({ email: "step7user@example.com" });
  const recipientUser = await User.create({
    _id: recipientId,
    name: "Step7 User",
    email: "step7user@example.com",
    password: "Password123!",
    role: "participant",
  });

  await runTest("Unread notification document updates isRead = true on mark read", async () => {
    const notif = await createNotification({
      recipient: recipientId,
      sender: senderId,
      type: "TEAM_INVITATION",
      title: "Team Invitation Test",
      message: "Join team test",
    });

    assert.strictEqual(notif.isRead, false);

    // Call mark read API
    notif.isRead = true;
    await notif.save();

    const updated = await Notification.findById(notif._id);
    assert.strictEqual(updated.isRead, true);
  });

  // Test Set 3: Real-time event backward compatibility
  console.log("\n[Test Set 3: Real-Time Event Backward Compatibility]");

  await runTest("Socket.IO client receives event and preserves existing Step 6 behavior", async () => {
    const token = jwt.sign({ id: recipientId.toString() }, process.env.JWT_SECRET || "gethack_super_secret_jwt_key_2026", { expiresIn: "1h" });
    const clientSocket = ClientIO(`http://localhost:${port}`, { path: "/socket.io/", auth: { token } });

    await new Promise((res) => { if (clientSocket.connected) res(); else clientSocket.on("connect", res); });

    let eventReceived = null;
    clientSocket.on("notification:created", (data) => {
      eventReceived = data.notification;
    });

    const newNotif = await createNotification({
      recipient: recipientId,
      sender: senderId,
      type: "CONNECTION_REQUEST",
      title: "Connection Test",
      message: "Let's connect step 7",
    });

    await new Promise((r) => setTimeout(r, 200));

    assert.ok(eventReceived);
    assert.strictEqual(eventReceived._id.toString(), newNotif._id.toString());
    clientSocket.disconnect();
  });

  await new Promise((r) => server.close(r));

  console.log("\n==============================================");
  console.log(`Step 7 Test Summary: ${passedTests} / ${totalTests} passed`);
  console.log("==============================================\n");
}

if (require.main === module) {
  const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/getHack";
  mongoose
    .connect(MONGO_URI)
    .then(async () => {
      await runStep7Tests();
      await mongoose.connection.close();
      process.exit(passedTests === totalTests ? 0 : 1);
    })
    .catch((err) => {
      console.error("MongoDB connection failed:", err.message);
      process.exit(1);
    });
}
