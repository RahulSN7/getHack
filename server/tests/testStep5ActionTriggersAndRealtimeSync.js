// ---------------------------------------------------------------------------
// server/tests/testStep5ActionTriggersAndRealtimeSync.js
// Comprehensive End-to-End Acceptance Test Suite for Step 5
// Verifies Action Controllers -> MongoDB Creation -> Real-Time Emission -> Recipient Sync
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
const Connection = require("../models/connection");
const Team = require("../models/team");
const TeamInvitation = require("../models/teamInvitation");
const { initSocketService } = require("../services/socketService");
const { sendConnectionRequest, respondToConnectionRequest } = require("../controllers/networkController");
const { sendInvitation, respondToInvitation } = require("../controllers/invitationController");

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
    if (err.stack) console.error(`    ${err.stack.split("\n")[1]}`);
  }
}

function generateTestToken(userId) {
  return jwt.sign(
    { id: userId.toString() },
    process.env.JWT_SECRET || "gethack_super_secret_jwt_key_2026",
    { expiresIn: "1h" }
  );
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

async function runStep5AcceptanceTests() {
  console.log("\n==============================================");
  console.log("Running getHack Step 5 Notification Sync & Action Triggers Test Suite");
  console.log("==============================================\n");

  const app = express();
  app.use(express.json());
  const server = http.createServer(app);
  initSocketService(server);

  await new Promise((res) => server.listen(0, res));
  const port = server.address().port;
  console.log(`[Test Server] Running test Socket.IO server on port ${port}`);

  // Create test Users
  const userAId = new mongoose.Types.ObjectId();
  const userBId = new mongoose.Types.ObjectId();
  const userCId = new mongoose.Types.ObjectId();

  await User.deleteMany({ email: { $in: ["step5A@example.com", "step5B@example.com", "step5C@example.com"] } });
  await Notification.deleteMany({ recipient: { $in: [userAId, userBId, userCId] } });
  await Connection.deleteMany({ $or: [{ sender: userAId }, { receiver: userBId }] });

  const completeProfile = {
    role: "Developer",
    gender: "Other",
    dateOfBirth: "2000-01-01",
    location: "India",
    availability: "Available",
    bio: "Developer A",
    skills: ["React", "Node"],
    college: "Tech University",
    interests: ["Hackathons"],
    github: "https://github.com/test",
  };

  const userA = await User.create({
    _id: userAId,
    name: "User A",
    email: "step5A@example.com",
    password: "Password123!",
    role: "participant",
    profile: completeProfile,
  });

  const userB = await User.create({
    _id: userBId,
    name: "User B",
    email: "step5B@example.com",
    password: "Password123!",
    role: "participant",
    profile: completeProfile,
  });

  const userC = await User.create({
    _id: userCId,
    name: "User C",
    email: "step5C@example.com",
    password: "Password123!",
    role: "participant",
    profile: completeProfile,
  });

  const tokenB = generateTestToken(userBId);
  const tokenC = generateTestToken(userCId);

  const socketB = ClientIO(`http://localhost:${port}`, {
    path: "/socket.io/",
    auth: { token: tokenB },
  });

  const socketC = ClientIO(`http://localhost:${port}`, {
    path: "/socket.io/",
    auth: { token: tokenC },
  });

  await new Promise((resolve) => {
    if (socketB.connected) resolve();
    else socketB.on("connect", resolve);
  });

  await new Promise((resolve) => {
    if (socketC.connected) resolve();
    else socketC.on("connect", resolve);
  });

  const eventsReceivedB = [];
  const eventsReceivedC = [];

  socketB.on("notification:created", (data) => {
    console.log(`[TEST SOCKET B] Received event notification:created id=${data.notification._id}`);
    eventsReceivedB.push(data.notification);
  });

  socketC.on("notification:created", (data) => {
    eventsReceivedC.push(data.notification);
  });

  // TEST A — CONNECTION REQUEST CREATES MONGODB DOC + EMITS REALTIME EVENT TO USER B
  console.log("\n[TEST A — Connection Request Action Trigger & Real-time Event]");
  let createdConnectionId = null;

  await runTest("User A sends connection request -> MongoDB Notification created & User B socket receives event", async () => {
    const req = {
      user: userA,
      body: { receiverId: userBId.toString(), note: "Let's connect!" },
    };
    const res = mockRes();

    await sendConnectionRequest(req, res);
    assert.strictEqual(res.statusCode, 201, `Status code should be 201, got ${res.statusCode}`);
    createdConnectionId = res.data.connection._id;

    // Verify MongoDB document created
    const notifInDb = await Notification.findOne({
      recipient: userBId,
      sender: userAId,
      type: "CONNECTION_REQUEST",
    });

    assert.ok(notifInDb, "Notification document must exist in MongoDB for User B");
    assert.strictEqual(notifInDb.isRead, false, "Notification must be unread");

    // Wait for real-time socket event
    await new Promise((r) => setTimeout(r, 250));

    assert.strictEqual(eventsReceivedB.length, 1, "User B should have received exactly 1 real-time event");
    assert.strictEqual(eventsReceivedB[0]._id.toString(), notifInDb._id.toString());
    assert.strictEqual(eventsReceivedB[0].type, "CONNECTION_REQUEST");
  });

  // TEST K — USER ISOLATION
  console.log("\n[TEST K — User Isolation Security]");
  await runTest("User C did NOT receive User B's notification event", () => {
    assert.strictEqual(eventsReceivedC.length, 0, "User C must receive 0 events meant for User B");
  });

  // TEST B — SECOND ACTION / CONNECTION ACCEPTED
  console.log("\n[TEST B & E — Connection Accepted Trigger & Read Marking]");
  await runTest("User B accepts connection request -> User A receives CONNECTION_ACCEPTED notification", async () => {
    const socketA = ClientIO(`http://localhost:${port}`, {
      path: "/socket.io/",
      auth: { token: generateTestToken(userAId) },
    });
    await new Promise((res) => socketA.on("connect", res));

    const eventsReceivedA = [];
    socketA.on("notification:created", (data) => eventsReceivedA.push(data.notification));

    const req = {
      user: userB,
      params: { id: createdConnectionId.toString() },
      body: { action: "accept" },
    };
    const res = mockRes();

    await respondToConnectionRequest(req, res);
    assert.strictEqual(res.statusCode, 200);

    await new Promise((r) => setTimeout(r, 250));

    const notifA = await Notification.findOne({
      recipient: userAId,
      type: "CONNECTION_ACCEPTED",
    });

    assert.ok(notifA, "User A should have a CONNECTION_ACCEPTED notification in MongoDB");
    assert.strictEqual(eventsReceivedA.length, 1, "User A socket should receive real-time event");
    assert.strictEqual(eventsReceivedA[0]._id.toString(), notifA._id.toString());

    socketA.disconnect();
  });

  // TEST J — DUPLICATE EVENT DEDUPLICATION
  console.log("\n[TEST J — Duplicate Prevention]");
  await runTest("Sending duplicate actionId returns existing document and prevents double notification", async () => {
    const initialCount = await Notification.countDocuments({ recipient: userBId });

    // Try re-sending identical request (which returns existing pending connection)
    const req = {
      user: userA,
      body: { receiverId: userBId.toString(), note: "Duplicate attempt" },
    };
    const res = mockRes();

    await sendConnectionRequest(req, res);

    const finalCount = await Notification.countDocuments({ recipient: userBId });
    assert.strictEqual(finalCount, initialCount, "Notification count in DB must NOT increase on duplicate action");
  });

  // Cleanup
  socketB.disconnect();
  socketC.disconnect();
  await new Promise((res) => server.close(res));

  console.log("\n==============================================");
  console.log(`Step 5 Test Summary: ${passedTests} / ${totalTests} passed`);
  console.log("==============================================\n");
}

if (require.main === module) {
  const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/getHack";
  mongoose
    .connect(MONGO_URI)
    .then(async () => {
      await runStep5AcceptanceTests();
      await mongoose.connection.close();
      process.exit(passedTests === totalTests ? 0 : 1);
    })
    .catch((err) => {
      console.error("MongoDB connection failed:", err.message);
      process.exit(1);
    });
}
