// ---------------------------------------------------------------------------
// server/tests/testDraftSaveManageTeam.js
// Integration Test Suite for Manage Team Draft & Save Architecture
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
const User = require("../models/user");
const { updateTeam, getTeamById } = require("../controllers/teamController");

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
  console.log("Running Manage Team Draft & Save Architecture Tests");
  console.log("==============================================\n");

  const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/getHack";
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }

  // Setup test users & team
  const leaderUser = await User.create({
    name: "Draft Leader",
    email: `draftleader-${Date.now()}@example.com`,
    password: "Password123!",
    role: "participant",
  });

  const memberA = await User.create({
    name: "Draft Member A",
    email: `membera-${Date.now()}@example.com`,
    password: "Password123!",
    role: "participant",
  });

  const memberB = await User.create({
    name: "Draft Member B",
    email: `memberb-${Date.now()}@example.com`,
    password: "Password123!",
    role: "participant",
  });

  const testTeam = await Team.create({
    teamName: "Draft Save Team",
    hackathon: "sih-2026",
    hackathonName: "Smart India Hackathon",
    createdBy: leaderUser._id,
    leader: leaderUser._id,
    members: [
      { user: leaderUser._id, role: "Team Leader" },
      { user: memberA._id, role: "Frontend Dev" },
      { user: memberB._id, role: "Backend Dev" },
    ],
    memberIds: [leaderUser._id.toString(), memberA._id.toString(), memberB._id.toString()],
    currentSize: 3,
    maxSize: 4,
  });

  // TEST 1: Database remains unchanged before explicit Save Changes API call
  await runAsyncTest("Test 1: MongoDB remains unchanged before Save Changes is clicked", async () => {
    const dbTeam = await Team.findById(testTeam._id);
    assert.strictEqual(dbTeam.members.length, 3);
    assert.strictEqual(dbTeam.memberIds.includes(memberA._id.toString()), true);
  });

  // TEST 2: Save Changes API commits draft member removal to MongoDB
  await runAsyncTest("Test 2: Explicit Save Changes commits draft member removal to MongoDB", async () => {
    // Draft removes Member A: only Leader and Member B remain
    const updatedMemberIds = [leaderUser._id.toString(), memberB._id.toString()];

    const req = {
      user: leaderUser,
      params: { id: testTeam._id.toString() },
      body: {
        teamName: "Draft Save Team Updated",
        memberIds: updatedMemberIds,
      },
    };
    const res = mockRes();
    await updateTeam(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.team.currentSize, 2);

    // Verify DB state
    const dbTeam = await Team.findById(testTeam._id);
    assert.strictEqual(dbTeam.currentSize, 2);
    assert.strictEqual(dbTeam.memberIds.includes(memberA._id.toString()), false);
    assert.strictEqual(dbTeam.memberIds.includes(memberB._id.toString()), true);
  });

  // TEST 3: Non-leader forbidden from editing/saving team
  await runAsyncTest("Test 3: Non-leader attempting to save team changes returns HTTP 403", async () => {
    const req = {
      user: memberB, // Member, NOT leader
      params: { id: testTeam._id.toString() },
      body: { teamName: "Hacked Team" },
    };
    const res = mockRes();
    await updateTeam(req, res);

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.data.message, "Only the team leader can edit team information.");
  });

  // TEST 4: Team capacity validation on Save Changes
  await runAsyncTest("Test 4: Save Changes with member count > maxSize returns HTTP 400 error", async () => {
    const overflowIds = [
      leaderUser._id.toString(),
      memberA._id.toString(),
      memberB._id.toString(),
      new mongoose.Types.ObjectId().toString(),
      new mongoose.Types.ObjectId().toString(),
    ];

    const req = {
      user: leaderUser,
      params: { id: testTeam._id.toString() },
      body: {
        maxSize: 3,
        memberIds: overflowIds,
      },
    };
    const res = mockRes();
    await updateTeam(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(
      res.data.message,
      "Cannot save team changes: Member count (5) exceeds maximum team size (3)."
    );
  });

  // Cleanup
  await Team.deleteOne({ _id: testTeam._id });
  await User.deleteMany({ _id: { $in: [leaderUser._id, memberA._id, memberB._id] } });

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
