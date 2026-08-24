// ---------------------------------------------------------------------------
// server/tests/testSynchronizedTeamRequestState.js
// Integration test verifying synchronized Join Request state between Join Team & Team Details
// Tests backend single source of truth across create, fetch, refresh, cancel, and accept flows
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
const { createTeam, getTeamById } = require("../controllers/teamController");
const {
  sendTeamRequest,
  getSentRequests,
  cancelRequest,
  acceptRequest,
} = require("../controllers/teamRequestController");

async function runSynchronizedStateTests() {
  console.log("\n==============================================");
  console.log("Running Synchronized Team Request State Integration Tests");
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
    // 1. Setup Leader & Applicant Users
    let syncLeader = await User.findOne({ email: "sync_leader@gethack.io" });
    if (!syncLeader) {
      syncLeader = await User.create({
        name: "Sync Team Leader",
        email: "sync_leader@gethack.io",
        password: "password123",
        role: "participant",
      });
    }

    let syncApplicant = await User.findOne({ email: "sync_applicant@gethack.io" });
    if (!syncApplicant) {
      syncApplicant = await User.create({
        name: "Sync Applicant",
        email: "sync_applicant@gethack.io",
        password: "password123",
        role: "participant",
      });
    }

    // 2. Create Target Team
    const createReq = {
      user: syncLeader,
      body: {
        teamName: "Synchronized State Team",
        hackathonName: "State Sync Hackathon 2026",
        description: "Testing single source of truth team request state",
        maxSize: 4,
        techStack: ["React", "Express"],
      },
    };
    const createRes = createMockRes();
    await createTeam(createReq, createRes);

    const team = createRes.jsonPayload.team;
    const teamId = team._id || team.id;

    console.log("\n[TEST 1: Request Sent from Join Team saved in MongoDB]");
    const sendReq = {
      user: syncApplicant,
      params: { teamId: teamId.toString() },
      body: { note: "Synchronized state test request" },
    };
    const sendRes = createMockRes();
    await sendTeamRequest(sendReq, sendRes);

    if (sendRes.statusCode === 201 && sendRes.jsonPayload?.success) {
      console.log("  ✓ PASSED: Join request persisted in database with pending status");
    } else {
      console.error("  ✕ FAILED: Send join request failed:", sendRes.statusCode, sendRes.jsonPayload);
      process.exit(1);
    }

    const requestId = sendRes.jsonPayload.request._id;

    console.log("\n[TEST 2: View Team Details retrieves pending request state from backend]");
    const sentRes1 = createMockRes();
    await getSentRequests({ user: syncApplicant }, sentRes1);

    const requestsList1 = sentRes1.jsonPayload.requests || [];
    const pendingReq1 = requestsList1.find(
      (r) => r.team && (r.team._id || r.team.id || r.team).toString() === teamId.toString() && r.status === "pending"
    );

    if (pendingReq1) {
      console.log("  ✓ PASSED: Backend returned pending request for Team Details / View Team view");
    } else {
      console.error("  ✕ FAILED: Pending request not found in sent requests list");
      process.exit(1);
    }

    console.log("\n[TEST 3: Browser Refresh maintains [Request Sent] status]");
    const getTeamReq = { params: { id: teamId.toString() } };
    const getTeamRes = createMockRes();
    await getTeamById(getTeamReq, getTeamRes);

    const sentRes2 = createMockRes();
    await getSentRequests({ user: syncApplicant }, sentRes2);

    const pendingReq2 = (sentRes2.jsonPayload.requests || []).find(
      (r) => r.team && (r.team._id || r.team.id || r.team).toString() === teamId.toString() && r.status === "pending"
    );

    if (getTeamRes.statusCode === 200 && pendingReq2) {
      console.log("  ✓ PASSED: Page refresh re-fetches backend DB state and preserves [Request Sent]");
    } else {
      console.error("  ✕ FAILED: Page refresh lost request state");
      process.exit(1);
    }

    console.log("\n[TEST 4: Cancel Request synchronizes both pages back to [Request to Join]]");
    const cancelReq = { user: syncApplicant, params: { id: requestId.toString() } };
    const cancelRes = createMockRes();
    await cancelRequest(cancelReq, cancelRes);

    const sentRes3 = createMockRes();
    await getSentRequests({ user: syncApplicant }, sentRes3);

    const pendingReq3 = (sentRes3.jsonPayload.requests || []).find(
      (r) => r.team && (r.team._id || r.team.id || r.team).toString() === teamId.toString() && r.status === "pending"
    );

    if (cancelRes.statusCode === 200 && !pendingReq3) {
      console.log("  ✓ PASSED: Cancel request removes pending state; both Join Team and View Team show [Request to Join]");
    } else {
      console.error("  ✕ FAILED: Cancel request synchronization failed");
      process.exit(1);
    }

    console.log("\n[TEST 5: Re-sending request after cancellation]");
    const reSendRes = createMockRes();
    await sendTeamRequest(sendReq, reSendRes);

    if (reSendRes.statusCode === 201) {
      console.log("  ✓ PASSED: Successfully re-sent join request after cancellation");
    } else {
      console.error("  ✕ FAILED: Re-send after cancel failed:", reSendRes.statusCode, reSendRes.jsonPayload);
      process.exit(1);
    }

    const newRequestId = reSendRes.jsonPayload.request._id;

    console.log("\n[TEST 6: Leader Accepts Request -> State transitions to [You are a member]]");
    const acceptReq = { user: syncLeader, params: { id: newRequestId.toString() } };
    const acceptRes = createMockRes();
    await acceptRequest(acceptReq, acceptRes);

    const acceptedTeam = acceptRes.jsonPayload.team;
    const isNowMember = acceptedTeam.memberIds.includes(syncApplicant._id.toString());

    if (acceptRes.statusCode === 200 && isNowMember) {
      console.log("  ✓ PASSED: Accepted user is now team member; action state transitions to [You are a member]");
    } else {
      console.error("  ✕ FAILED: Accept request transition failed:", acceptRes.statusCode);
      process.exit(1);
    }

    // Cleanup test records
    await Team.findByIdAndDelete(teamId);
    await TeamRequest.deleteMany({ team: teamId });

    console.log("\n==============================================");
    console.log("All Synchronized Team Request State Tests Passed!");
    console.log("==============================================\n");
  } catch (err) {
    console.error("Synchronized state test failed:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  runSynchronizedStateTests().then(() => process.exit(0));
}

module.exports = runSynchronizedStateTests;
