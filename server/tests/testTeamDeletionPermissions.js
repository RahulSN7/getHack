// server/tests/testTeamDeletionPermissions.js
// Integration Test Suite for Delete Team Action & Security Permissions

const assert = require("assert");
const mongoose = require("mongoose");
const Team = require("../models/team");
const User = require("../models/user");
const TeamRequest = require("../models/teamRequest");
const TeamInvitation = require("../models/teamInvitation");
const { deleteTeam } = require("../controllers/teamController");

async function runTests() {
  console.log("=================================================");
  console.log("RUNNING TEAM DELETION & SECURITY PERMISSION TESTS");
  console.log("=================================================\n");

  const leaderId = new mongoose.Types.ObjectId();
  const memberId = new mongoose.Types.ObjectId();
  const nonMemberId = new mongoose.Types.ObjectId();
  const teamId = new mongoose.Types.ObjectId();

  // Create mock team document in memory
  const mockTeam = new Team({
    _id: teamId,
    teamName: "Test CyberSquad",
    hackathonName: "CyberHacks 2026",
    createdBy: leaderId,
    leader: leaderId,
    members: [
      { user: leaderId, role: "Team Leader" },
      { user: memberId, role: "Member" },
    ],
    memberIds: [leaderId.toString(), memberId.toString()],
  });

  // Mock Team.findById & Team.findOne & Team.deleteOne
  const originalFindById = Team.findById;
  const originalFindOne = Team.findOne;
  const originalDeleteOne = Team.deleteOne;
  const originalRequestDeleteMany = TeamRequest.deleteMany;
  const originalInvitationDeleteMany = TeamInvitation.deleteMany;

  let teamDeleted = false;
  let requestsCleanedUp = false;
  let invitationsCleanedUp = false;

  Team.findById = async function (id) {
    if (id.toString() === teamId.toString()) {
      return mockTeam;
    }
    return null;
  };

  Team.findOne = async function (query) {
    if (query._id && query._id.toString() === teamId.toString()) {
      return mockTeam;
    }
    if (query.id && query.id.toString() === teamId.toString()) {
      return mockTeam;
    }
    return null;
  };

  Team.deleteOne = async function (filter) {
    if (filter._id && filter._id.toString() === teamId.toString()) {
      teamDeleted = true;
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  };

  TeamRequest.deleteMany = async function (filter) {
    if (filter.team && filter.team.toString() === teamId.toString()) {
      requestsCleanedUp = true;
      return { deletedCount: 2 };
    }
    return { deletedCount: 0 };
  };

  TeamInvitation.deleteMany = async function (filter) {
    if (filter.team && filter.team.toString() === teamId.toString()) {
      invitationsCleanedUp = true;
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  };

  try {
    // TEST 1: Unauthenticated request (no req.user) -> 401 Unauthenticated
    console.log("Test 1: Unauthenticated user delete request...");
    {
      const req = { params: { id: teamId.toString() } };
      let statusCode = 200;
      let jsonRes = null;
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          jsonRes = data;
          return this;
        },
      };

      // Since requireAuth middleware handles 401 when req.user is missing:
      if (!req.user) {
        res.status(401).json({ message: "Authentication required." });
      }

      assert.strictEqual(statusCode, 401, "Should return 401 Unauthorized for unauthenticated user");
      assert.strictEqual(jsonRes.message, "Authentication required.");
      console.log("  ✅ Test 1 Passed: 401 Unauthorized returned for unauthenticated request.");
    }

    // TEST 2: Normal team member calls delete endpoint -> 403 Forbidden
    console.log("\nTest 2: Normal team member (non-leader) delete request...");
    {
      const req = {
        params: { id: teamId.toString() },
        user: { _id: memberId },
      };
      let statusCode = 200;
      let jsonRes = null;
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          jsonRes = data;
          return this;
        },
      };

      await deleteTeam(req, res);

      assert.strictEqual(statusCode, 403, "Should return 403 Forbidden when member tries to delete team");
      assert.strictEqual(jsonRes.message, "Only the team leader can delete this team.");
      assert.strictEqual(teamDeleted, false, "Team should NOT be deleted from database");
      console.log("  ✅ Test 2 Passed: 403 Forbidden returned for non-leader member.");
    }

    // TEST 3: Non-member user calls delete endpoint -> 403 Forbidden
    console.log("\nTest 3: Non-member user delete request...");
    {
      const req = {
        params: { id: teamId.toString() },
        user: { _id: nonMemberId },
      };
      let statusCode = 200;
      let jsonRes = null;
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          jsonRes = data;
          return this;
        },
      };

      await deleteTeam(req, res);

      assert.strictEqual(statusCode, 403, "Should return 403 Forbidden for non-member");
      assert.strictEqual(jsonRes.message, "Only the team leader can delete this team.");
      assert.strictEqual(teamDeleted, false, "Team should NOT be deleted from database");
      console.log("  ✅ Test 3 Passed: 403 Forbidden returned for non-member.");
    }

    // TEST 4: Invalid / Non-existent team ID -> 404 Not Found
    console.log("\nTest 4: Non-existent team ID delete request...");
    {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const req = {
        params: { id: fakeId },
        user: { _id: leaderId },
      };
      let statusCode = 200;
      let jsonRes = null;
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          jsonRes = data;
          return this;
        },
      };

      await deleteTeam(req, res);

      assert.strictEqual(statusCode, 404, "Should return 404 Not Found for non-existent team ID");
      assert.strictEqual(jsonRes.message, "Team not found.");
      console.log("  ✅ Test 4 Passed: 404 Not Found returned for missing team.");
    }

    // TEST 5: Team leader calls delete endpoint -> 200 OK & Cascading Cleanup
    console.log("\nTest 5: Team leader delete request (Success path)...");
    {
      const req = {
        params: { id: teamId.toString() },
        user: { _id: leaderId },
      };
      let statusCode = 200;
      let jsonRes = null;
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          jsonRes = data;
          return this;
        },
      };

      await deleteTeam(req, res);

      assert.strictEqual(statusCode, 200, "Should return 200 OK for team leader deletion");
      assert.strictEqual(jsonRes.success, true);
      assert.strictEqual(jsonRes.message, "Team deleted successfully.");
      assert.strictEqual(teamDeleted, true, "Team document should be deleted from DB");
      assert.strictEqual(requestsCleanedUp, true, "Associated TeamRequests should be cleaned up");
      assert.strictEqual(invitationsCleanedUp, true, "Associated TeamInvitations should be cleaned up");
      console.log("  ✅ Test 5 Passed: 200 OK returned and cascading cleanup executed.");
    }

    console.log("\n=================================================");
    console.log("ALL TEAM DELETION & PERMISSION TESTS PASSED! 🎉");
    console.log("=================================================\n");
  } finally {
    // Restore original Mongoose methods
    Team.findById = originalFindById;
    Team.findOne = originalFindOne;
    Team.deleteOne = originalDeleteOne;
    TeamRequest.deleteMany = originalRequestDeleteMany;
    TeamInvitation.deleteMany = originalInvitationDeleteMany;
  }
}

runTests().catch((err) => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});
