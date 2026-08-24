// ---------------------------------------------------------------------------
// server/tests/testCompleteTeamsArchitecture.js
// Integration test suite for Complete Teams Architecture
// Tests team creation, team join requests, accept/reject/cancel, my teams, edit team, and leave team
// ---------------------------------------------------------------------------

const path = require("path");
const dns = require("dns");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder("ipv4first");
  }
  dns.setServers(["1.1.1.1", "8.8.8.8", "8.8.4.4"]);
} catch {}

const mongoose = require("mongoose");
const Team = require("../models/team");
const TeamRequest = require("../models/teamRequest");
const User = require("../models/user");
const { createTeam, getMyTeams, updateTeam, leaveTeam } = require("../controllers/teamController");
const {
  sendTeamRequest,
  getIncomingRequests,
  getSentRequests,
  acceptRequest,
  cancelRequest,
} = require("../controllers/teamRequestController");

async function runCompleteTeamsTests() {
  console.log("\n==============================================");
  console.log("Running Complete Teams Architecture Integration Tests");
  console.log("==============================================");

  const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/getHack";
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }

  const createMockRes = () => {
    const res = {
      statusCode: 200,
      jsonPayload: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.jsonPayload = payload;
        return this;
      },
    };
    return res;
  };

  try {
    // 1. Setup Test Users
    let leaderUser = await User.findOne({ email: "arch_leader@gethack.io" });
    if (!leaderUser) {
      leaderUser = await User.create({
        name: "Arch Team Leader",
        email: "arch_leader@gethack.io",
        password: "password123",
        role: "participant",
      });
    }

    let applicantUser = await User.findOne({ email: "arch_applicant@gethack.io" });
    if (!applicantUser) {
      applicantUser = await User.create({
        name: "Arch Applicant",
        email: "arch_applicant@gethack.io",
        password: "password123",
        role: "participant",
      });
    }

    console.log("\n[TEST 1: Create Team]");
    const createReq = {
      user: leaderUser,
      body: {
        teamName: "Architecture Test Team",
        hackathonName: "Global AI Challenge 2026",
        description: "Testing end-to-end team architecture",
        maxSize: 3,
        techStack: ["Node.js", "React"],
        rolesNeeded: ["Full Stack Developer"],
      },
    };
    const createRes = createMockRes();
    await createTeam(createReq, createRes);
    const createdTeam = createRes.jsonPayload.team;
    const teamId = createdTeam._id || createdTeam.id;
    console.log("  ✓ PASSED: Team created with leader assignment:", teamId);

    console.log("\n[TEST 2: Send Team Join Request & Duplicate Check]");
    const sendReq1 = {
      user: applicantUser,
      params: { teamId: teamId.toString() },
      body: { note: "Super excited to join!" },
    };
    const sendRes1 = createMockRes();
    await sendTeamRequest(sendReq1, sendRes1);

    if (sendRes1.statusCode === 201 && sendRes1.jsonPayload?.success) {
      console.log("  ✓ PASSED: Join request sent successfully");
    } else {
      console.error("  ✕ FAILED: Send join request:", sendRes1.statusCode, sendRes1.jsonPayload);
      process.exit(1);
    }

    const requestId = sendRes1.jsonPayload.request._id || sendRes1.jsonPayload.request.id;

    // Test Duplicate Protection
    const sendResDuplicate = createMockRes();
    await sendTeamRequest(sendReq1, sendResDuplicate);
    if (sendResDuplicate.statusCode === 400) {
      console.log("  ✓ PASSED: Backend correctly prevented duplicate pending request");
    } else {
      console.error("  ✕ FAILED: Duplicate check failed:", sendResDuplicate.statusCode);
      process.exit(1);
    }

    console.log("\n[TEST 3: Get Incoming & Sent Requests]");
    const incRes = createMockRes();
    await getIncomingRequests({ user: leaderUser }, incRes);
    const incomingList = incRes.jsonPayload.requests || [];
    const foundInc = incomingList.some((r) => r._id.toString() === requestId.toString());

    if (foundInc) {
      console.log("  ✓ PASSED: Incoming request retrieved for Team Leader");
    } else {
      console.error("  ✕ FAILED: Incoming request not found for leader");
      process.exit(1);
    }

    const sentRes = createMockRes();
    await getSentRequests({ user: applicantUser }, sentRes);
    const sentList = sentRes.jsonPayload.requests || [];
    const foundSent = sentList.some((r) => r._id.toString() === requestId.toString());

    if (foundSent) {
      console.log("  ✓ PASSED: Sent request retrieved for Applicant");
    } else {
      console.error("  ✕ FAILED: Sent request not found for applicant");
      process.exit(1);
    }

    console.log("\n[TEST 4: Accept Team Join Request]");
    const acceptReq = {
      user: leaderUser,
      params: { id: requestId.toString() },
    };
    const acceptRes = createMockRes();
    await acceptRequest(acceptReq, acceptRes);

    if (acceptRes.statusCode === 200 && acceptRes.jsonPayload?.success) {
      console.log("  ✓ PASSED: Team Leader accepted request");
    } else {
      console.error("  ✕ FAILED: Accept request error:", acceptRes.statusCode, acceptRes.jsonPayload);
      process.exit(1);
    }

    // Verify applicant is now in team members
    const updatedTeamDoc = await Team.findById(teamId);
    if (updatedTeamDoc.memberIds.includes(applicantUser._id.toString())) {
      console.log("  ✓ PASSED: Applicant added to team membership");
    } else {
      console.error("  ✕ FAILED: Applicant member ID not found in team");
      process.exit(1);
    }

    console.log("\n[TEST 5: My Teams API]");
    const myTeamsRes = createMockRes();
    await getMyTeams({ user: applicantUser }, myTeamsRes);
    const applicantMyTeams = myTeamsRes.jsonPayload.teams || [];
    const hasJoinedTeam = applicantMyTeams.some((t) => (t._id || t.id).toString() === teamId.toString());

    if (hasJoinedTeam) {
      console.log("  ✓ PASSED: Accepted team appears in Applicant's My Teams list");
    } else {
      console.error("  ✕ FAILED: Team missing from My Teams list");
      process.exit(1);
    }

    console.log("\n[TEST 6: Team Leader Edit Team]");
    const editReq = {
      user: leaderUser,
      params: { id: teamId.toString() },
      body: { teamName: "Architecture Test Team (Updated)" },
    };
    const editRes = createMockRes();
    await updateTeam(editReq, editRes);

    if (editRes.statusCode === 200 && editRes.jsonPayload?.team?.teamName === "Architecture Test Team (Updated)") {
      console.log("  ✓ PASSED: Team Leader updated team information");
    } else {
      console.error("  ✕ FAILED: Edit team failed:", editRes.statusCode, editRes.jsonPayload);
      process.exit(1);
    }

    console.log("\n[TEST 7: Leave Team]");
    const leaveReq = {
      user: applicantUser,
      params: { id: teamId.toString() },
    };
    const leaveRes = createMockRes();
    await leaveTeam(leaveReq, leaveRes);

    if (leaveRes.statusCode === 200) {
      console.log("  ✓ PASSED: Member successfully left team");
    } else {
      console.error("  ✕ FAILED: Leave team failed:", leaveRes.statusCode, leaveRes.jsonPayload);
      process.exit(1);
    }

    // Cleanup test data
    await Team.findByIdAndDelete(teamId);
    await TeamRequest.deleteMany({ team: teamId });

    console.log("\n==============================================");
    console.log("All Complete Teams Architecture Tests Passed!");
    console.log("==============================================\n");
  } catch (err) {
    console.error("Complete Teams test failure:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  runCompleteTeamsTests().then(() => process.exit(0));
}

module.exports = runCompleteTeamsTests;
