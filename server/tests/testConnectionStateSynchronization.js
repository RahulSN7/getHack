// ---------------------------------------------------------------------------
// server/tests/testConnectionStateSynchronization.js
// Automated verification for Real-Time Connection Request State Synchronization
// ---------------------------------------------------------------------------

const mongoose = require("mongoose");
const dns = require("dns");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, "../.env") });

try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder("ipv4first");
  }
  dns.setServers(["1.1.1.1", "8.8.8.8", "8.8.4.4"]);
} catch (err) {
  // Ignore DNS fallback error
}

const User = require("../models/user");
const Connection = require("../models/connection");
const { sendConnectionRequest, sendConnectionRequestDefinition } = require("../tools/sendConnectionRequest");
const { acceptConnectionRequest } = require("../tools/acceptConnectionRequest");
const { getEligibleTeammateCandidates } = require("../services/teammateService");
const { emitConnectionEventToUsers } = require("../services/socketService");

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/gethack";

async function runTests() {
  console.log("\n=======================================================");
  console.log("Starting Connection Request State Synchronization Tests");
  console.log("=======================================================\n");

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }
    console.log("✓ Database connected.");

    // Clean test accounts
    await User.deleteMany({ email: { $in: ["sync_user1@test.com", "sync_user2@test.com"] } });
    await Connection.deleteMany({});

    // Create test user 1
    const user1 = await User.create({
      name: "Sync User One",
      email: "sync_user1@test.com",
      password: "password123",
      role: "participant",
      profile: {
        avatar: "https://avatar.iran.liara.run/public/1",
        bio: "Fullstack Developer looking for teammates",
        skills: ["React", "Node.js", "MongoDB"],
        role: "Fullstack Developer",
        availability: "Available",
        experienceLevel: "Intermediate",
        experienceDetails: "2 years building web apps",
        college: "Stanford University",
        degree: "B.S. Computer Science",
        education: { college: "Stanford University", degree: "B.S. Computer Science" },
        interests: ["AI", "Web Dev"],
        location: "San Francisco, CA",
        gender: "Male",
        dateOfBirth: "2000-01-01",
        github: "https://github.com/syncuser1",
      },
    });

    // Create test user 2
    const user2 = await User.create({
      name: "Sync User Two",
      email: "sync_user2@test.com",
      password: "password123",
      role: "participant",
      profile: {
        avatar: "https://avatar.iran.liara.run/public/2",
        bio: "Python ML Engineer",
        skills: ["Python", "PyTorch", "FastAPI"],
        role: "ML Engineer",
        availability: "Available",
        experienceLevel: "Advanced",
        experienceDetails: "3 years building ML models",
        college: "MIT",
        degree: "M.S. Artificial Intelligence",
        education: { college: "MIT", degree: "M.S. Artificial Intelligence" },
        interests: ["Machine Learning", "Hackathons"],
        location: "Boston, MA",
        gender: "Female",
        dateOfBirth: "1999-05-15",
        github: "https://github.com/syncuser2",
      },
    });

    console.log(`✓ Created test users: User1 (${user1._id}), User2 (${user2._id})`);

    // Test 1: A1 Tool send_connection_request creates connection & socket event call
    console.log("\n--- Test 1: A1 Tool send_connection_request execution ---");
    const sendResult = await sendConnectionRequest(
      { targetUserId: user2._id.toString(), note: "Let's team up!" },
      { user: user1 }
    );

    if (!sendResult.success) {
      throw new Error(`send_connection_request failed: ${sendResult.message}`);
    }
    console.log(`✓ send_connection_request succeeded: ${sendResult.message}`);

    const connectionInDb = await Connection.findOne({ sender: user1._id, receiver: user2._id });
    if (!connectionInDb || connectionInDb.status !== "pending") {
      throw new Error("Connection record was not properly created in DB.");
    }
    console.log(`✓ Connection created in DB with status 'pending' (ID: ${connectionInDb._id})`);

    // Test 2: Prevent duplicate connection requests
    console.log("\n--- Test 2: Prevent duplicate connection requests ---");
    const duplicateResult = await sendConnectionRequest(
      { targetUserId: user2._id.toString() },
      { user: user1 }
    );

    if (duplicateResult.success || duplicateResult.reason !== "already_pending") {
      throw new Error(`Expected already_pending duplicate prevention, got: ${JSON.stringify(duplicateResult)}`);
    }
    console.log(`✓ Duplicate request correctly prevented: ${duplicateResult.message}`);

    // Test 3: A1 Tool accept_connection_request execution
    console.log("\n--- Test 3: A1 Tool accept_connection_request execution ---");
    const acceptResult = await acceptConnectionRequest(
      { targetUserId: user1._id.toString() },
      { user: user2 }
    );

    if (!acceptResult.success) {
      throw new Error(`accept_connection_request failed: ${acceptResult.message}`);
    }
    console.log(`✓ accept_connection_request succeeded: ${acceptResult.message}`);

    const acceptedInDb = await Connection.findById(connectionInDb._id);
    if (!acceptedInDb || acceptedInDb.status !== "accepted") {
      throw new Error("Connection record status was not updated to 'accepted'.");
    }
    console.log(`✓ Connection status updated in DB to 'accepted'`);

    // Test 4: Rejection and Candidate Re-Eligibility in Find Teammates
    console.log("\n--- Test 4: Rejection and Candidate Re-Eligibility ---");
    // Simulate user2 rejecting a new request or resetting connection
    acceptedInDb.status = "rejected";
    await acceptedInDb.save();

    const candidateResult = await getEligibleTeammateCandidates(user1._id.toString());
    const candidates = candidateResult.eligibleUsers || [];
    const user2Candidate = candidates.find((c) => c.id === user2._id.toString() || c._id?.toString() === user2._id.toString());

    if (!user2Candidate) {
      throw new Error("Rejected user was omitted from eligible candidate list!");
    }

    const connState = candidateResult.connectionsMap[user2._id.toString()] || { status: "none" };
    if (connState.status !== "none") {
      throw new Error(`Expected candidate connectionState.status to be 'none', got '${connState.status}'`);
    }
    console.log("✓ Rejected user correctly returned to eligible candidates with connectionState.status = 'none'.");

    // Cleanup
    await User.deleteMany({ email: { $in: ["sync_user1@test.com", "sync_user2@test.com"] } });
    await Connection.deleteMany({ _id: connectionInDb._id });

    console.log("\n=======================================================");
    console.log("All Connection Synchronization Tests PASSED!");
    console.log("=======================================================\n");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Test failure:", error.message);
    process.exit(1);
  }
}

runTests();
