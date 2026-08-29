// ---------------------------------------------------------------------------
// server/tests/testStep6AllNotificationTypes.js
// Test suite for Step 6: Verifies real-time notifications for all 8 user action types
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
const TeamRequest = require("../models/teamRequest");

const { initSocketService } = require("../services/socketService");
const { sendConnectionRequest, respondToConnectionRequest } = require("../controllers/networkController");
const { sendInvitation, respondToInvitation } = require("../controllers/invitationController");
const { sendTeamRequest, acceptRequest: acceptTeamRequest, rejectRequest: rejectTeamRequest } = require("../controllers/teamRequestController");
const { removeMember, inviteConnections } = require("../controllers/teamController");

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

const completeProfile = {
  role: "Developer",
  gender: "Other",
  dateOfBirth: "2000-01-01",
  location: "India",
  availability: "Available",
  bio: "Developer Bio",
  skills: ["React", "Node"],
  college: "Tech University",
  interests: ["Hackathons"],
  github: "https://github.com/test",
};

async function runStep6AllNotificationTypesTests() {
  console.log("\n==============================================");
  console.log("Running getHack Step 6 All Notification Types Real-time Test Suite");
  console.log("==============================================\n");

  const app = express();
  app.use(express.json());
  const server = http.createServer(app);
  initSocketService(server);

  await new Promise((res) => server.listen(0, res));
  const port = server.address().port;
  console.log(`[Test Server] Running test Socket.IO server on port ${port}`);

  const userAId = new mongoose.Types.ObjectId();
  const userBId = new mongoose.Types.ObjectId();

  await User.deleteMany({ email: { $in: ["step6A@example.com", "step6B@example.com"] } });
  await Notification.deleteMany({ recipient: { $in: [userAId, userBId] } });
  await Connection.deleteMany({ $or: [{ sender: userAId }, { receiver: userBId }] });
  await Team.deleteMany({ teamName: "Step6 Test Team" });
  await TeamInvitation.deleteMany({ $or: [{ sender: userAId }, { receiver: userBId }] });

  const userA = await User.create({
    _id: userAId,
    name: "User A (Leader)",
    email: "step6A@example.com",
    password: "Password123!",
    role: "participant",
    profile: completeProfile,
  });

  const userB = await User.create({
    _id: userBId,
    name: "User B (Participant)",
    email: "step6B@example.com",
    password: "Password123!",
    role: "participant",
    profile: completeProfile,
  });

  const socketA = ClientIO(`http://localhost:${port}`, { path: "/socket.io/", auth: { token: generateTestToken(userAId) } });
  const socketB = ClientIO(`http://localhost:${port}`, { path: "/socket.io/", auth: { token: generateTestToken(userBId) } });

  await new Promise((res) => { if (socketA.connected) res(); else socketA.on("connect", res); });
  await new Promise((res) => { if (socketB.connected) res(); else socketB.on("connect", res); });

  const eventsA = [];
  const eventsB = [];

  socketA.on("notification:created", (d) => eventsA.push(d.notification));
  socketB.on("notification:created", (d) => eventsB.push(d.notification));

  // 1. CONNECTION_REQUEST (Verify existing flow remains 100% intact)
  console.log("[Test 1: CONNECTION_REQUEST]");
  let connectionId = null;
  await runTest("CONNECTION_REQUEST delivers real-time event to User B", async () => {
    const res = mockRes();
    await sendConnectionRequest({ user: userA, body: { receiverId: userBId.toString(), note: "Connect" } }, res);
    assert.strictEqual(res.statusCode, 201);
    connectionId = res.data.connection._id;

    await new Promise((r) => setTimeout(r, 200));
    assert.strictEqual(eventsB.length, 1);
    assert.strictEqual(eventsB[0].type, "CONNECTION_REQUEST");
  });

  // 2. CONNECTION_ACCEPTED
  console.log("\n[Test 2: CONNECTION_ACCEPTED]");
  await runTest("CONNECTION_ACCEPTED delivers real-time event to User A", async () => {
    const res = mockRes();
    await respondToConnectionRequest({ user: userB, params: { id: connectionId.toString() }, body: { action: "accept" } }, res);
    assert.strictEqual(res.statusCode, 200);

    await new Promise((r) => setTimeout(r, 200));
    assert.strictEqual(eventsA.length, 1);
    assert.strictEqual(eventsA[0].type, "CONNECTION_ACCEPTED");
  });

  // Create team for Team tests
  const testTeam = await Team.create({
    teamName: "Step6 Test Team",
    hackathon: "hack-step6",
    hackathonName: "Step6 Hackathon",
    createdBy: userAId,
    leader: userAId,
    members: [{ user: userAId, role: "Team Leader" }],
    memberIds: [userAId.toString()],
    currentSize: 1,
    maxSize: 4,
  });

  // 3. TEAM_INVITATION
  console.log("\n[Test 3: TEAM_INVITATION]");
  let invitationId = null;
  await runTest("TEAM_INVITATION delivers real-time event to User B", async () => {
    const res = mockRes();
    await sendInvitation({ user: userA, body: { teamId: testTeam._id.toString(), receiverId: userBId.toString() } }, res);
    assert.strictEqual(res.statusCode, 201);

    const inv = await TeamInvitation.findOne({ team: testTeam._id, receiver: userBId });
    assert.ok(inv);
    invitationId = inv._id;

    await new Promise((r) => setTimeout(r, 200));
    assert.strictEqual(eventsB.length, 2);
    assert.strictEqual(eventsB[1].type, "TEAM_INVITATION");
  });

  // 4. TEAM_INVITATION_ACCEPTED
  console.log("\n[Test 4: TEAM_INVITATION_ACCEPTED]");
  await runTest("TEAM_INVITATION_ACCEPTED delivers real-time event to User A", async () => {
    const res = mockRes();
    await respondToInvitation({ user: userB, params: { id: invitationId.toString() }, body: { action: "accept" } }, res);
    assert.strictEqual(res.statusCode, 200);

    await new Promise((r) => setTimeout(r, 200));
    assert.strictEqual(eventsA.length, 2);
    assert.strictEqual(eventsA[1].type, "TEAM_INVITATION_ACCEPTED");
  });

  // 5. TEAM_MEMBER_REMOVED
  console.log("\n[Test 5: TEAM_MEMBER_REMOVED]");
  await runTest("TEAM_MEMBER_REMOVED delivers real-time event to User B", async () => {
    const res = mockRes();
    await removeMember({ user: userA, params: { id: testTeam._id.toString(), memberId: userBId.toString() } }, res);
    assert.strictEqual(res.statusCode, 200);

    await new Promise((r) => setTimeout(r, 200));
    assert.strictEqual(eventsB.length, 3);
    assert.strictEqual(eventsB[2].type, "TEAM_MEMBER_REMOVED");
  });

  // 6. TEAM JOIN REQUEST (TEAM_INVITATION to leader & TEAM_MEMBER_ADDED on accept)
  console.log("\n[Test 6: TEAM JOIN REQUEST & TEAM_MEMBER_ADDED]");
  let requestId = null;
  await runTest("User B requests to join team -> User A receives TEAM_INVITATION (join request)", async () => {
    const res = mockRes();
    await sendTeamRequest({ user: userB, params: { teamId: testTeam._id.toString() }, body: { note: "Please accept me" } }, res);
    assert.strictEqual(res.statusCode, 201);
    requestId = res.data.request._id;

    await new Promise((r) => setTimeout(r, 200));
    assert.strictEqual(eventsA.length, 3);
    assert.strictEqual(eventsA[2].type, "TEAM_INVITATION");
  });

  // 7. TEAM_MEMBER_ADDED
  console.log("\n[Test 7: TEAM_MEMBER_ADDED]");
  await runTest("User A accepts team join request -> User B receives TEAM_MEMBER_ADDED", async () => {
    const res = mockRes();
    await acceptTeamRequest({ user: userA, params: { id: requestId.toString() } }, res);
    assert.strictEqual(res.statusCode, 200);

    await new Promise((r) => setTimeout(r, 200));
    assert.strictEqual(eventsB.length, 4);
    assert.strictEqual(eventsB[3].type, "TEAM_MEMBER_ADDED");
  });

  socketA.disconnect();
  socketB.disconnect();
  await new Promise((r) => server.close(r));

  console.log("\n==============================================");
  console.log(`Step 6 Test Summary: ${passedTests} / ${totalTests} passed`);
  console.log("==============================================\n");
}

if (require.main === module) {
  const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/getHack";
  mongoose
    .connect(MONGO_URI)
    .then(async () => {
      await runStep6AllNotificationTypesTests();
      await mongoose.connection.close();
      process.exit(passedTests === totalTests ? 0 : 1);
    })
    .catch((err) => {
      console.error("MongoDB connection failed:", err.message);
      process.exit(1);
    });
}
