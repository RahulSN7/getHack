// ---------------------------------------------------------------------------
// server/tests/testTeamUserPopulation.js
// Integration test verifying MongoDB User population for team leader & members
// Ensures raw ObjectIds are never returned in place of User documents, and sensitive fields are excluded
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
const { sendTeamRequest, acceptRequest } = require("../controllers/teamRequestController");

async function runPopulationTests() {
  console.log("\n==============================================");
  console.log("Running Team User Population Integration Tests");
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
    // 1. Setup Populated Test Users
    let popLeader = await User.findOne({ email: "pop_leader@gethack.io" });
    if (!popLeader) {
      popLeader = await User.create({
        name: "Populated Leader",
        email: "pop_leader@gethack.io",
        password: "password123",
        role: "participant",
        profile: {
          role: "Lead Architect",
          skills: ["React", "Express"],
          avatar: "https://example.com/avatar_leader.png",
        },
      });
    }

    let popMember = await User.findOne({ email: "pop_member@gethack.io" });
    if (!popMember) {
      popMember = await User.create({
        name: "Populated Member",
        email: "pop_member@gethack.io",
        password: "password123",
        role: "participant",
        profile: {
          role: "Backend Engineer",
          skills: ["Node.js", "MongoDB"],
          avatar: "https://example.com/avatar_member.png",
        },
      });
    }

    console.log("\n[TEST 1: Verify Create Team Populates Leader]");
    const createReq = {
      user: popLeader,
      body: {
        teamName: "Population Verification Team",
        hackathonName: "Data Population Hackathon",
        description: "Verifying user fields population",
        maxSize: 4,
        techStack: ["Node.js", "MongoDB"],
      },
    };
    const createRes = createMockRes();
    await createTeam(createReq, createRes);

    const team = createRes.jsonPayload.team;
    const teamId = team._id || team.id;

    if (team.createdBy && typeof team.createdBy === "object" && team.createdBy.name === "Populated Leader") {
      console.log("  ✓ PASSED: createdBy populated with User object (Name:", team.createdBy.name, ")");
    } else {
      console.error("  ✕ FAILED: createdBy is not populated correctly:", team.createdBy);
      process.exit(1);
    }

    if (team.createdBy.password) {
      console.error("  ✕ FAILED: Sensitive field 'password' exposed in populated user!");
      process.exit(1);
    } else {
      console.log("  ✓ PASSED: Sensitive fields (password) excluded from populated user");
    }

    console.log("\n[TEST 2: Verify GET Team Details Populates Members]");
    const getReq = { params: { id: teamId.toString() } };
    const getRes = createMockRes();
    await getTeamById(getReq, getRes);

    const fetchedTeam = getRes.jsonPayload.team;
    if (Array.isArray(fetchedTeam.members) && fetchedTeam.members.length > 0) {
      const leaderMember = fetchedTeam.members[0];
      if (leaderMember.user && typeof leaderMember.user === "object" && leaderMember.user.name === "Populated Leader") {
        console.log("  ✓ PASSED: members.user populated cleanly (User:", leaderMember.user.name, ")");
      } else {
        console.error("  ✕ FAILED: members.user not populated:", leaderMember);
        process.exit(1);
      }
    }

    console.log("\n[TEST 3: Join Request & Accept Populates New Member]");
    const sendReq = {
      user: popMember,
      params: { teamId: teamId.toString() },
      body: { note: "Please accept me!" },
    };
    const sendRes = createMockRes();
    await sendTeamRequest(sendReq, sendRes);
    const requestId = sendRes.jsonPayload.request._id;

    const acceptReq = {
      user: popLeader,
      params: { id: requestId.toString() },
    };
    const acceptRes = createMockRes();
    await acceptRequest(acceptReq, acceptRes);

    const acceptedTeam = acceptRes.jsonPayload.team;
    const memberDoc = acceptedTeam.members.find((m) => m.user && (m.user._id || m.user.id).toString() === popMember._id.toString());

    if (memberDoc && memberDoc.user.name === "Populated Member") {
      console.log("  ✓ PASSED: Newly accepted member correctly populated (Name:", memberDoc.user.name, ")");
    } else {
      console.error("  ✕ FAILED: Newly accepted member not populated:", memberDoc);
      process.exit(1);
    }

    // Clean up test records
    await Team.findByIdAndDelete(teamId);
    await TeamRequest.deleteMany({ team: teamId });

    console.log("\n==============================================");
    console.log("All Team Population Integration Tests Passed!");
    console.log("==============================================\n");
  } catch (err) {
    console.error("Population test failed:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  runPopulationTests().then(() => process.exit(0));
}

module.exports = runPopulationTests;
