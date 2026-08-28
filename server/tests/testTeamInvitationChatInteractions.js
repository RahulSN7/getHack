// ---------------------------------------------------------------------------
// server/tests/testTeamInvitationChatInteractions.js
// Integration Test Suite for Coexisting Reactions, Replies, and Menus on Team Invitations
// ---------------------------------------------------------------------------

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
  console.log("Running Team Invitation Chat Interactions Tests");
  console.log("==============================================\n");

  const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/getHack";
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }

  // Setup test users & team
  const senderUser = await User.create({
    name: "Inviter Alex",
    email: `alex-${Date.now()}@example.com`,
    password: "Password123!",
    role: "participant",
  });

  const receiverUser = await User.create({
    name: "Invitee Blake",
    email: `blake-${Date.now()}@example.com`,
    password: "Password123!",
    role: "participant",
  });

  const testTeam = await Team.create({
    teamName: "Neural Hackers",
    hackathon: "sih-2026",
    hackathonName: "Smart India Hackathon",
    createdBy: senderUser._id,
    leader: senderUser._id,
    members: [{ user: senderUser._id, role: "Team Leader" }],
    memberIds: [senderUser._id.toString()],
    currentSize: 1,
    maxSize: 4,
  });

  let invitationId = null;

  // TEST 1: Send Team Invitation
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

    invitationId = res.data.invitation._id.toString();
  });

  // TEST 2: Accept Invitation & verify status updates
  await runAsyncTest("Test 2: Recipient accepts invitation while coexisting with message metadata", async () => {
    const req = {
      user: receiverUser,
      params: { id: invitationId },
      body: { action: "accept" },
    };
    const res = mockRes();
    await respondToInvitation(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.invitation.status, "accepted");

    // Verify team members
    const updatedTeam = await Team.findById(testTeam._id);
    assert.strictEqual(updatedTeam.members.length, 2);
    assert.strictEqual(updatedTeam.memberIds.includes(receiverUser._id.toString()), true);
  });

  // Cleanup
  await TeamInvitation.deleteMany({ team: testTeam._id });
  await Team.deleteOne({ _id: testTeam._id });
  await User.deleteMany({ _id: { $in: [senderUser._id, receiverUser._id] } });

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
