// ---------------------------------------------------------------------------
// server/tests/testJoinTeamRequestCta.js
// Integration test suite verifying "Request to Join" API execution and button states
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
const { createTeam } = require("../controllers/teamController");
const {
  sendTeamRequest,
  getIncomingRequests,
  getSentRequests,
  cancelRequest,
} = require("../controllers/teamRequestController");

async function runJoinRequestCtaTests() {
  console.log("\n==============================================");
  console.log("Running Join Team Request CTA Integration Tests");
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
    // 1. Setup Leader and Applicant Users
    let ctaLeader = await User.findOne({ email: "cta_leader@gethack.io" });
    if (!ctaLeader) {
      ctaLeader = await User.create({
        name: "CTA Team Leader",
        email: "cta_leader@gethack.io",
        password: "password123",
        role: "participant",
      });
    }

    let ctaApplicant = await User.findOne({ email: "cta_applicant@gethack.io" });
    if (!ctaApplicant) {
      ctaApplicant = await User.create({
        name: "CTA Applicant",
        email: "cta_applicant@gethack.io",
        password: "password123",
        role: "participant",
      });
    }

    // 2. Create Target Team
    const createReq = {
      user: ctaLeader,
      body: {
        teamName: "Team Phoenix CTA",
        hackathonName: "Phoenix Hack 2026",
        description: "Testing CTA join request action",
        maxSize: 4,
        techStack: ["React", "Node.js"],
      },
    };
    const createRes = createMockRes();
    await createTeam(createReq, createRes);

    const team = createRes.jsonPayload.team;
    const teamId = team._id || team.id;

    console.log("\n[TEST 1: Request to Join CTA sends POST request to MongoDB]");
    const sendReq = {
      user: ctaApplicant,
      params: { teamId: teamId.toString() },
      body: { note: "Joining via CTA button" },
    };
    const sendRes = createMockRes();
    await sendTeamRequest(sendReq, sendRes);

    if (sendRes.statusCode === 201 && sendRes.jsonPayload?.success && sendRes.jsonPayload?.request) {
      console.log("  ✓ PASSED: Team join request saved to MongoDB with pending status");
    } else {
      console.error("  ✕ FAILED: Send join request CTA failed:", sendRes.statusCode, sendRes.jsonPayload);
      process.exit(1);
    }

    const requestId = sendRes.jsonPayload.request._id;

    console.log("\n[TEST 2: Duplicate Request Protection]");
    const dupRes = createMockRes();
    await sendTeamRequest(sendReq, dupRes);
    if (dupRes.statusCode === 400 && dupRes.jsonPayload?.message?.includes("already sent a request")) {
      console.log("  ✓ PASSED: Backend correctly prevented duplicate pending request");
    } else {
      console.error("  ✕ FAILED: Duplicate request check failed:", dupRes.statusCode, dupRes.jsonPayload);
      process.exit(1);
    }

    console.log("\n[TEST 3: Requester Sent Tab Visibility]");
    const sentRes = createMockRes();
    await getSentRequests({ user: ctaApplicant }, sentRes);
    const sentList = sentRes.jsonPayload.requests || [];
    const hasSentReq = sentList.some((r) => r._id.toString() === requestId.toString());
    if (hasSentReq) {
      console.log("  ✓ PASSED: Request visible in Requester's Sent tab");
    } else {
      console.error("  ✕ FAILED: Request missing from Sent tab");
      process.exit(1);
    }

    console.log("\n[TEST 4: Leader Incoming Tab Visibility]");
    const incRes = createMockRes();
    await getIncomingRequests({ user: ctaLeader }, incRes);
    const incList = incRes.jsonPayload.requests || [];
    const hasIncReq = incList.some((r) => r._id.toString() === requestId.toString());
    if (hasIncReq) {
      console.log("  ✓ PASSED: Request visible in Team Leader's Incoming tab");
    } else {
      console.error("  ✕ FAILED: Request missing from Incoming tab");
      process.exit(1);
    }

    console.log("\n[TEST 5: Cancel Request Flow]");
    const cancelReq = { user: ctaApplicant, params: { id: requestId.toString() } };
    const cancelRes = createMockRes();
    await cancelRequest(cancelReq, cancelRes);
    if (cancelRes.statusCode === 200) {
      console.log("  ✓ PASSED: Requester cancelled request successfully");
    } else {
      console.error("  ✕ FAILED: Cancel request failed:", cancelRes.statusCode);
      process.exit(1);
    }

    // Cleanup test records
    await Team.findByIdAndDelete(teamId);
    await TeamRequest.deleteMany({ team: teamId });

    console.log("\n==============================================");
    console.log("All Join Team Request CTA Tests Passed!");
    console.log("==============================================\n");
  } catch (err) {
    console.error("Join request CTA test failed:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  runJoinRequestCtaTests().then(() => process.exit(0));
}

module.exports = runJoinRequestCtaTests;
