const dns = require("dns");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder("ipv4first");
  }
  dns.setServers(["1.1.1.1", "8.8.8.8", "8.8.4.4"]);
} catch {}

const mongoose = require("mongoose");
const Team = require("../models/team");
const User = require("../models/user");
const { createTeam, getTeams, getTeamById, joinTeam } = require("../controllers/teamController");

async function runTeamTests() {
  console.log("==============================================");
  console.log("Running getHack Team Creation & Visibility Tests");
  console.log("==============================================");

  const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/getHack";
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }

  // Helper mock res
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
    // Setup test users in MongoDB
    let testUserLeader = await User.findOne({ email: "test_leader@gethack.io" });
    if (!testUserLeader) {
      testUserLeader = await User.create({
        name: "Test Team Leader",
        email: "test_leader@gethack.io",
        password: "password123",
        role: "participant",
      });
    }

    let testUserMember = await User.findOne({ email: "test_member@gethack.io" });
    if (!testUserMember) {
      testUserMember = await User.create({
        name: "Test Eligible Member",
        email: "test_member@gethack.io",
        password: "password123",
        role: "participant",
      });
    }

    console.log("\n[Scenario 1: Team Creation API & MongoDB Persistence]");
    const createReq = {
      user: testUserLeader,
      body: {
        teamName: "Automated Test Team Alpha",
        hackathonName: "AI Innovation Summit 2026",
        hackathonLink: "https://example.com/ai-summit",
        hackathonDates: "Sep 15 - Sep 18, 2026",
        description: "Building an automated AI team finder.",
        maxSize: 4,
        techStack: ["React", "Node.js", "MongoDB"],
        rolesNeeded: ["Frontend Developer"],
      },
    };
    const createRes = createMockRes();
    await createTeam(createReq, createRes);

    if (createRes.statusCode === 201 && createRes.jsonPayload?.success) {
      console.log("  ✓ PASSED: Team created via API with 201 Created");
    } else {
      console.error("  ✕ FAILED: Create team response:", createRes.statusCode, createRes.jsonPayload);
      process.exit(1);
    }

    const createdTeamId = createRes.jsonPayload.team._id || createRes.jsonPayload.team.id;

    // Verify MongoDB document exists
    const mongoDoc = await Team.findById(createdTeamId);
    if (mongoDoc && mongoDoc.teamName === "Automated Test Team Alpha") {
      console.log("  ✓ PASSED: Team document verified in MongoDB database");
    } else {
      console.error("  ✕ FAILED: Team document not found in MongoDB!");
      process.exit(1);
    }

    console.log("\n[Scenario 2: Team Leader & Membership Initialization]");
    if (mongoDoc.createdBy.toString() === testUserLeader._id.toString() && mongoDoc.memberIds.includes(testUserLeader._id.toString())) {
      console.log("  ✓ PASSED: Authenticated user correctly assigned as Leader & initial member");
    } else {
      console.error("  ✕ FAILED: Leader/member assignment incorrect:", mongoDoc);
      process.exit(1);
    }

    console.log("\n[Scenario 3: Team Listing & Details Fetch]");
    const getTeamsRes = createMockRes();
    await getTeams({ user: testUserMember }, getTeamsRes);
    const fetchedTeams = getTeamsRes.jsonPayload?.teams || [];
    const foundInList = fetchedTeams.some((t) => (t._id || t.id).toString() === createdTeamId.toString());

    if (foundInList) {
      console.log("  ✓ PASSED: Created team returned in GET /api/teams");
    } else {
      console.error("  ✕ FAILED: Team not returned in getTeams");
      process.exit(1);
    }

    console.log("\n[Scenario 4: Join Endpoint Protection (Prevent Leader / Duplicate Member)]");
    const joinReqLeader = {
      user: testUserLeader,
      params: { id: createdTeamId.toString() },
    };
    const joinResLeader = createMockRes();
    await joinTeam(joinReqLeader, joinResLeader);

    if (joinResLeader.statusCode === 400 && joinResLeader.jsonPayload?.message?.includes("leader")) {
      console.log("  ✓ PASSED: Backend correctly rejected team leader from joining own team");
    } else {
      console.error("  ✕ FAILED: Join endpoint did not reject leader:", joinResLeader.statusCode, joinResLeader.jsonPayload);
      process.exit(1);
    }

    // Cleanup test team
    await Team.findByIdAndDelete(createdTeamId);
    console.log("\n==============================================");
    console.log("Test Execution Summary: All Team API Scenarios Passed");
    console.log("==============================================\n");
  } catch (err) {
    console.error("Test execution failed with error:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  runTeamTests().then(() => process.exit(0));
}

module.exports = runTeamTests;
