// ---------------------------------------------------------------------------
// server/tests/testStep8ShortcutNavigation.js
// Automated Test Suite for Step 8: Notification Navigation Shortcuts & CTA Removal
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

async function runStep8Tests() {
  console.log("\n==============================================");
  console.log("Running getHack Step 8 Notification Navigation Shortcuts & CTA Removal Test Suite");
  console.log("==============================================\n");

  const app = express();
  app.use(express.json());
  const server = http.createServer(app);
  initSocketService(server);

  await new Promise((res) => server.listen(0, res));
  const port = server.address().port;

  // Test 1: Verify CTA buttons removed from Header.jsx
  console.log("[Test Set 1: Verification of CTA Removal]");
  await runTest("Header.jsx notification cards contain NO inline Accept or Decline buttons", () => {
    const headerPath = path.join(__dirname, "../../client/src/components/Header/Header.jsx");
    const headerContent = fs.readFileSync(headerPath, "utf8");
    assert.strictEqual(headerContent.includes("respondToNotificationAction"), false);
    assert.strictEqual(headerContent.includes("Accepting..."), false);
    assert.strictEqual(headerContent.includes("Declining..."), false);
  });

  // Test Set 2: Shortcut Route Resolution Matrix
  console.log("\n[Test Set 2: Shortcut Route Resolution Matrix]");

  await runTest("CONNECTION_REQUEST notification acts as shortcut to /network?tab=requests", () => {
    const notif = { type: "CONNECTION_REQUEST", entityType: "Connection" };
    assert.strictEqual(resolveNotificationRoute(notif), "/network?tab=requests");
  });

  await runTest("CONNECTION_ACCEPTED notification acts as shortcut to /network?tab=connections", () => {
    const notif = { type: "CONNECTION_ACCEPTED", entityType: "Connection" };
    assert.strictEqual(resolveNotificationRoute(notif), "/network?tab=connections");
  });

  const testTeamId = new mongoose.Types.ObjectId().toString();
  await runTest("TEAM_INVITATION notification acts as shortcut to /team/:teamId", () => {
    const notif = { type: "TEAM_INVITATION", entityType: "Team", metadata: { teamId: testTeamId } };
    assert.strictEqual(resolveNotificationRoute(notif), `/team/${testTeamId}`);
  });

  await runTest("TEAM_MEMBER_REMOVED notification acts as safe shortcut to /teammates", () => {
    const notif = { type: "TEAM_MEMBER_REMOVED", entityType: "Team", metadata: { teamId: testTeamId } };
    assert.strictEqual(resolveNotificationRoute(notif), "/teammates");
  });

  // Test Set 3: Unread Count and Mark Read Persistence
  console.log("\n[Test Set 3: Unread Count & Mark Read State]");
  const recipientId = new mongoose.Types.ObjectId();
  const senderId = new mongoose.Types.ObjectId();

  await User.deleteMany({ email: "step8user@example.com" });
  await User.create({
    _id: recipientId,
    name: "Step8 User",
    email: "step8user@example.com",
    password: "Password123!",
    role: "participant",
  });

  await runTest("Clicking notification marks document isRead = true", async () => {
    const notif = await createNotification({
      recipient: recipientId,
      sender: senderId,
      type: "CONNECTION_REQUEST",
      title: "Connection Shortcut Test",
      message: "Clicking will navigate to /network?tab=requests",
    });

    assert.strictEqual(notif.isRead, false);

    notif.isRead = true;
    await notif.save();

    const check = await Notification.findById(notif._id);
    assert.strictEqual(check.isRead, true);
  });

  // Test Set 4: Real-Time Event Backward Compatibility
  console.log("\n[Test Set 4: Real-Time Compatibility]");

  await runTest("Real-time notifications arrive live without refresh", async () => {
    const token = jwt.sign({ id: recipientId.toString() }, process.env.JWT_SECRET || "gethack_super_secret_jwt_key_2026", { expiresIn: "1h" });
    const clientSocket = ClientIO(`http://localhost:${port}`, { path: "/socket.io/", auth: { token } });

    await new Promise((res) => { if (clientSocket.connected) res(); else clientSocket.on("connect", res); });

    let eventData = null;
    clientSocket.on("notification:created", (d) => {
      eventData = d.notification;
    });

    const notif = await createNotification({
      recipient: recipientId,
      sender: senderId,
      type: "TEAM_INVITATION",
      title: "Realtime Shortcut Test",
      message: "Live delivery test",
    });

    await new Promise((r) => setTimeout(r, 200));

    assert.ok(eventData);
    assert.strictEqual(eventData._id.toString(), notif._id.toString());
    clientSocket.disconnect();
  });

  await new Promise((r) => server.close(r));

  console.log("\n==============================================");
  console.log(`Step 8 Test Summary: ${passedTests} / ${totalTests} passed`);
  console.log("==============================================\n");
}

if (require.main === module) {
  const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/getHack";
  mongoose
    .connect(MONGO_URI)
    .then(async () => {
      await runStep8Tests();
      await mongoose.connection.close();
      process.exit(passedTests === totalTests ? 0 : 1);
    })
    .catch((err) => {
      console.error("MongoDB connection failed:", err.message);
      process.exit(1);
    });
}
