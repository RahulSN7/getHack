const dns = require("dns");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder("ipv4first");
  }
  dns.setServers(["1.1.1.1", "8.8.8.8", "8.8.4.4"]);
} catch {}

const assert = require("node:assert");
const mongoose = require("mongoose");
const Team = require("../models/team");
const TeamInvitation = require("../models/teamInvitation");
const User = require("../models/user");
const { sendInvitation, respondToInvitation } = require("../controllers/invitationController");

let totalTests = 0;
let passedTests = 0;

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ PASSED: ${name}`);
  } catch (err) {
    console.error(`  ✗ FAILED: ${name}`);
    console.error(`    ${err.stack || err.message}`);
  }
}

function mockRes() {
  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(obj) {
      this.data = obj;
      return this;
    },
  };
  return res;
}

async function runAllTests() {
  console.log("\n==============================================");
  console.log("Running Team Invitation through Chat Tests");
  console.log("==============================================\n");

  const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/getHack";
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }

  // Setup test users & team
  const senderUser = await User.create({
    name: "Test Inviter User",
    email: `inviter-${Date.now()}@example.com`,
    password: "Password123!",
    role: "participant",
  });

  const receiverUser = await User.create({
    name: "Test Invitee User",
    email: `invitee-${Date.now()}@example.com`,
    password: "Password123!",
    role: "participant",
  });

  const thirdUser = await User.create({
    name: "Test Third User",
    email: `third-${Date.now()}@example.com`,
    password: "Password123!",
    role: "participant",
  });

  const testTeam = await Team.create({
    teamName: "CodeCrafters Test Team",
    hackathon: "sih-2026",
    hackathonName: "Smart India Hackathon",
    createdBy: senderUser._id,
    leader: senderUser._id,
    members: [{ user: senderUser._id, role: "Team Leader" }],
    memberIds: [senderUser._id.toString()],
    currentSize: 1,
    maxSize: 2, // Capacity = 2, 1 spot remaining
  });

  let invitationId = null;

  // TEST 1: Send team invitation
  await runAsyncTest("Test 1: Send Team Invitation creates MongoDB pending record", async () => {
    const req = {
      user: senderUser,
      body: {
        teamId: testTeam._id.toString(),
        receiverId: receiverUser._id.toString(),
      },
    };
    const res = mockRes();
    await sendInvitation(req, res);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.invitation.status, "pending");
    assert.strictEqual(res.data.invitation.teamName, "CodeCrafters Test Team");

    invitationId = res.data.invitation._id.toString();

    // Verify record in MongoDB
    const dbRecord = await TeamInvitation.findById(invitationId);
    assert.notStrictEqual(dbRecord, null);
    assert.strictEqual(dbRecord.status, "pending");
  });

  // TEST 2: Duplicate invitation check
  await runAsyncTest("Test 2: Re-sending invitation returns HTTP 400 duplicate error", async () => {
    const req = {
      user: senderUser,
      body: {
        teamId: testTeam._id.toString(),
        receiverId: receiverUser._id.toString(),
      },
    };
    const res = mockRes();
    await sendInvitation(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.message, "Invitation already sent to this connection.");
  });

  // TEST 3: Sender authorization check (Sender cannot accept/reject own invite)
  await runAsyncTest("Test 3: Sender attempting to respond returns HTTP 403 Forbidden", async () => {
    const req = {
      user: senderUser, // Sender, NOT receiver
      params: { id: invitationId },
      body: { action: "accept" },
    };
    const res = mockRes();
    await respondToInvitation(req, res);

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(
      res.data.message,
      "Only the invitation recipient can accept or reject this invitation."
    );
  });

  // TEST 4: Recipient accepts invitation
  await runAsyncTest("Test 4: Recipient accepts invitation -> Added to team, status updated to accepted", async () => {
    const req = {
      user: receiverUser, // Recipient
      params: { id: invitationId },
      body: { action: "accept" },
    };
    const res = mockRes();
    await respondToInvitation(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.invitation.status, "accepted");

    // Verify team members updated in DB
    const updatedTeam = await Team.findById(testTeam._id);
    assert.strictEqual(updatedTeam.members.length, 2);
    assert.strictEqual(updatedTeam.currentSize, 2);
    assert.strictEqual(updatedTeam.memberIds.includes(receiverUser._id.toString()), true);
    assert.strictEqual(updatedTeam.status, "Full");
  });

  // TEST 5: Capacity check when team is full
  await runAsyncTest("Test 5: Capacity check prevents accepting when team is full", async () => {
    // Send invitation to third user for full team
    const inviteReq = {
      user: senderUser,
      body: {
        teamId: testTeam._id.toString(),
        receiverId: thirdUser._id.toString(),
      },
    };
    const inviteRes = mockRes();
    await sendInvitation(inviteReq, inviteRes);

    // Full capacity rejection on send
    assert.strictEqual(inviteRes.statusCode, 400);
    assert.strictEqual(inviteRes.data.message, "This team is currently full.");
  });

  // TEST 6: Recipient rejects invitation
  await runAsyncTest("Test 6: Recipient rejects invitation -> Status updated to rejected, user NOT added", async () => {
    // Expand capacity to test rejection
    await Team.findByIdAndUpdate(testTeam._id, { maxSize: 3, status: "Recruiting" });

    // Send invite to third user
    const inviteReq = {
      user: senderUser,
      body: {
        teamId: testTeam._id.toString(),
        receiverId: thirdUser._id.toString(),
      },
    };
    const inviteRes = mockRes();
    await sendInvitation(inviteReq, inviteRes);

    const thirdInviteId = inviteRes.data.invitation._id.toString();

    // Reject invitation
    const rejectReq = {
      user: thirdUser,
      params: { id: thirdInviteId },
      body: { action: "reject" },
    };
    const rejectRes = mockRes();
    await respondToInvitation(rejectReq, rejectRes);

    assert.strictEqual(rejectRes.statusCode, 200);
    assert.strictEqual(rejectRes.data.invitation.status, "rejected");

    // Verify user was NOT added to team
    const finalTeam = await Team.findById(testTeam._id);
    assert.strictEqual(finalTeam.memberIds.includes(thirdUser._id.toString()), false);
    assert.strictEqual(finalTeam.members.length, 2);
  });

  // Cleanup test documents
  await TeamInvitation.deleteMany({ team: testTeam._id });
  await Team.deleteOne({ _id: testTeam._id });
  await User.deleteMany({ _id: { $in: [senderUser._id, receiverUser._id, thirdUser._id] } });

  await mongoose.disconnect();

  console.log("\n==============================================");
  console.log(`Test Summary: ${passedTests}/${totalTests} tests passed.`);
  console.log("==============================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error("Unhandled test execution error:", err);
  process.exit(1);
});
