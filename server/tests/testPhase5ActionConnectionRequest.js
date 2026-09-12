// ---------------------------------------------------------------------------
// server/tests/testPhase5ActionConnectionRequest.js
// Integration test suite for Phase 5: Action-Taking Agent (Send Connection Request)
// ---------------------------------------------------------------------------

const dns = require("dns");
try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder("ipv4first");
  }
  dns.setServers(["1.1.1.1", "8.8.8.8", "8.8.4.4"]);
} catch (err) {
  console.warn("Could not set custom DNS fallback servers:", err.message);
}

require("dotenv").config({ path: "./server/.env" });
const mongoose = require("mongoose");
const User = require("../models/user");
const Connection = require("../models/connection");
const Notification = require("../models/notification");
const AiConversation = require("../models/aiConversation");
const { runAgentLoop } = require("../services/agentEngine");

async function setupTestData() {
  if (mongoose.connection.readyState !== 1) {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/gethack";
    let attempts = 0;
    while (attempts < 3) {
      try {
        attempts++;
        await mongoose.connect(mongoUri, {
          serverSelectionTimeoutMS: 15000,
          connectTimeoutMS: 15000,
          tlsAllowInvalidCertificates: true,
        });
        console.log("Connected to MongoDB for Phase 5 tests.");
        break;
      } catch (err) {
        console.warn(`Connection attempt ${attempts} failed: ${err.message}`);
        if (attempts >= 3) throw err;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  // 1. Main test user (sender)
  const mainUser = await User.findOneAndUpdate(
    { email: "p5mainuser@gethack.io" },
    {
      $set: {
        name: "Phase 5 Main User",
        email: "p5mainuser@gethack.io",
        password: "password123",
        role: "participant",
        profile: {
          role: "Full Stack Developer",
          gender: "Male",
          dateOfBirth: new Date("2000-01-01"),
          college: "IIT Delhi",
          skills: ["React", "Node.js", "MongoDB"],
          interests: ["Web Development", "AI"],
          location: "Delhi, India",
          availability: "Available",
          bio: "Full Stack dev testing Phase 5 actions.",
          github: "https://github.com/p5mainuser",
        },
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  // 2. Candidate 1: Py Dev (target for connection request)
  const pyCandidate = await User.findOneAndUpdate(
    { email: "p5pydev@gethack.io" },
    {
      $set: {
        name: "Py Dev",
        email: "p5pydev@gethack.io",
        password: "password123",
        role: "participant",
        profile: {
          role: "Machine Learning Engineer",
          gender: "Male",
          dateOfBirth: new Date("1999-05-15"),
          college: "BITS Pilani",
          skills: ["Python", "TensorFlow", "PyTorch", "AI"],
          interests: ["Artificial Intelligence", "Deep Learning"],
          location: "Bengaluru, India",
          availability: "Available",
          bio: "ML engineer specializing in NLP and LLMs.",
          github: "https://github.com/p5pydev",
        },
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  // Clean up any duplicate Py Dev candidates from previous runs to ensure unambiguous name lookup
  await User.deleteMany({ name: "Py Dev", email: { $ne: "p5pydev@gethack.io" } });

  // 3. Candidate 2: Connected Friend (already connected user)
  const connectedUser = await User.findOneAndUpdate(
    { email: "p5connected@gethack.io" },
    {
      $set: {
        name: "Connected Friend",
        email: "p5connected@gethack.io",
        password: "password123",
        role: "participant",
        profile: {
          role: "Frontend Developer",
          gender: "Female",
          dateOfBirth: new Date("2001-04-10"),
          college: "DTU",
          skills: ["React", "Vue", "CSS"],
          interests: ["UI/UX"],
          location: "Delhi, India",
          availability: "Available",
          bio: "Already connected classmate.",
          github: "https://github.com/p5connected",
        },
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  // Clean up any pre-existing connection between mainUser & pyCandidate for fresh test runs
  await Connection.deleteMany({
    $or: [
      { sender: mainUser._id, receiver: pyCandidate._id },
      { sender: pyCandidate._id, receiver: mainUser._id },
    ],
  });
  await Notification.deleteMany({ recipient: pyCandidate._id, sender: mainUser._id });

  // Ensure accepted connection between mainUser & connectedUser for Test 8
  await Connection.updateOne(
    {
      $or: [
        { sender: mainUser._id, receiver: connectedUser._id },
        { sender: connectedUser._id, receiver: mainUser._id },
      ],
    },
    {
      $set: {
        sender: mainUser._id,
        receiver: connectedUser._id,
        status: "accepted",
      },
    },
    { upsert: true }
  );

  return { mainUser, pyCandidate, connectedUser };
}

async function runTests() {
  console.log("=================================================");
  console.log("Starting Phase 5: Action-Taking Agent Test Suite");
  console.log("=================================================");

  const { mainUser, pyCandidate, connectedUser } = await setupTestData();
  let passedCount = 0;
  let failedCount = 0;

  // --- Test 1: Teammate Discovery ---
  console.log("\n-------------------------------------------------");
  console.log(`Running [Test 1] (Teammate discovery query): "Find me an ML teammate."`);
  console.log("-------------------------------------------------");
  const convId1 = `test_p5_conv_${Date.now()}`;
  const conversation1 = new AiConversation({
    userId: mainUser._id,
    conversationId: convId1,
    title: "Find me an ML teammate.",
    messages: [],
  });

  const res1 = await runAgentLoop({
    user: mainUser,
    conversation: conversation1,
    message: "Find me an ML teammate.",
    context: { page: "teammates" },
  });

  const test1Passed = res1.recommendations.teammates.some((t) => t.name === "Py Dev");
  if (test1Passed) {
    console.log("✅ [Test 1] PASSED: Recommended candidate Py Dev");
    passedCount++;
  } else {
    console.error("❌ [Test 1] FAILED:", JSON.stringify(res1, null, 2));
    failedCount++;
  }

  // Record assistant response in conversation1 for follow-up turns
  conversation1.messages.push({ role: "assistant", content: res1.text, recommendations: res1.recommendations });
  await conversation1.save();

  // --- Test 2: Click Connect -> Request Confirmation ---
  console.log("\n-------------------------------------------------");
  console.log(`Running [Test 2] (Connect intent confirmation request): "Connect with Py Dev"`);
  console.log("-------------------------------------------------");
  const res2 = await runAgentLoop({
    user: mainUser,
    conversation: conversation1,
    message: "Connect with Py Dev",
    context: { page: "teammates" },
  });

  const test2Passed =
    res2.pendingAction &&
    res2.pendingAction.type === "send_connection_request" &&
    (res2.pendingAction.targetUserId === pyCandidate._id.toString() || res2.pendingAction.targetName === "Py Dev") &&
    res2.text.includes("Would you like me to send a connection request");

  if (test2Passed) {
    console.log("✅ [Test 2] PASSED: Generated confirmation prompt + pendingAction");
    passedCount++;
  } else {
    console.error("❌ [Test 2] FAILED:", JSON.stringify(res2, null, 2));
    failedCount++;
  }

  // Record assistant response in conversation1
  conversation1.messages.push({ role: "assistant", content: res2.text, pendingAction: res2.pendingAction });
  await conversation1.save();

  // --- Test 3: Cancel Confirmation ---
  console.log("\n-------------------------------------------------");
  console.log(`Running [Test 3] (Cancel confirmation): "Cancel"`);
  console.log("-------------------------------------------------");
  const res3 = await runAgentLoop({
    user: mainUser,
    conversation: conversation1,
    message: "Cancel",
    context: { page: "teammates" },
  });

  const pendingConn3 = await Connection.findOne({ sender: mainUser._id, receiver: pyCandidate._id });
  const test3Passed = res3.text.includes("canceled") && !res3.pendingAction && !pendingConn3;

  if (test3Passed) {
    console.log("✅ [Test 3] PASSED: Canceled pending action; no connection created in DB");
    passedCount++;
  } else {
    console.error("❌ [Test 3] FAILED:", JSON.stringify(res3, null, 2));
    failedCount++;
  }

  // --- Test 4: Confirm Action Execution ---
  console.log("\n-------------------------------------------------");
  console.log(`Running [Test 4] (Confirm & send connection request): "Connect with Py Dev" -> "Send Request"`);
  console.log("-------------------------------------------------");
  const convId4 = `test_p5_conv_exec_${Date.now()}`;
  const conversation4 = new AiConversation({
    userId: mainUser._id,
    conversationId: convId4,
    title: "Connect with Py Dev",
    messages: [
      { role: "assistant", content: "I found Py Dev", recommendations: { teammates: [{ userId: pyCandidate._id.toString(), name: "Py Dev" }] } },
    ],
  });

  // Step 4a: Ask connect -> gets confirmation
  const res4a = await runAgentLoop({
    user: mainUser,
    conversation: conversation4,
    message: "Connect with Py Dev",
    context: { page: "teammates" },
  });

  conversation4.messages.push({ role: "assistant", content: res4a.text, pendingAction: res4a.pendingAction });
  await conversation4.save();

  // Step 4b: Confirm Send Request
  const res4b = await runAgentLoop({
    user: mainUser,
    conversation: conversation4,
    message: "Send Request",
    context: { page: "teammates" },
  });

  const test4Passed =
    res4b.text.includes("Connection request sent to") &&
    res4b.text.includes("Py Dev") &&
    res4b.toolResults.some((t) => t.toolName === "send_connection_request" && t.result.success);

  if (test4Passed) {
    console.log("✅ [Test 4] PASSED: send_connection_request executed successfully");
    passedCount++;
  } else {
    console.error("❌ [Test 4] FAILED:", JSON.stringify(res4b, null, 2));
    failedCount++;
  }

  // --- Test 5: Verify Recipient Connection Record in DB ---
  console.log("\n-------------------------------------------------");
  console.log(`Running [Test 5] (Verify Connection record in DB for recipient)`);
  console.log("-------------------------------------------------");
  const connectionInDb = await Connection.findOne({ sender: mainUser._id, receiver: pyCandidate._id, status: "pending" });
  const test5Passed = Boolean(connectionInDb);

  if (test5Passed) {
    console.log("✅ [Test 5] PASSED: Pending connection record found in DB for Py Dev");
    passedCount++;
  } else {
    console.error("❌ [Test 5] FAILED: No connection record found in DB");
    failedCount++;
  }

  // --- Test 6: Verify Notification Created for Recipient ---
  console.log("\n-------------------------------------------------");
  console.log(`Running [Test 6] (Verify Notification created for recipient)`);
  console.log("-------------------------------------------------");
  const notificationInDb = await Notification.findOne({ recipient: pyCandidate._id, sender: mainUser._id, type: "CONNECTION_REQUEST" });
  const test6Passed = Boolean(notificationInDb);

  if (test6Passed) {
    console.log("✅ [Test 6] PASSED: CONNECTION_REQUEST notification created for recipient");
    passedCount++;
  } else {
    console.error("❌ [Test 6] FAILED: Notification not found in DB");
    failedCount++;
  }

  // --- Test 7: Duplicate Request Handling ---
  console.log("\n-------------------------------------------------");
  console.log(`Running [Test 7] (Duplicate request handling): "Connect with Py Dev" -> "Send Request"`);
  console.log("-------------------------------------------------");
  const conversation7 = new AiConversation({
    userId: mainUser._id,
    conversationId: `test_p5_conv_dup_${Date.now()}`,
    title: "Connect with Py Dev",
    messages: [
      { role: "assistant", content: "Would you like to connect?", pendingAction: { type: "send_connection_request", targetUserId: pyCandidate._id.toString(), targetName: "Py Dev" } },
    ],
  });

  const res7 = await runAgentLoop({
    user: mainUser,
    conversation: conversation7,
    message: "Send Request",
    context: { page: "teammates" },
  });

  const test7Passed = res7.text.includes("already pending");

  if (test7Passed) {
    console.log("✅ [Test 7] PASSED: Duplicate request logic prevented duplicate creation");
    passedCount++;
  } else {
    console.error("❌ [Test 7] FAILED:", JSON.stringify(res7, null, 2));
    failedCount++;
  }

  // --- Test 8: Already Connected User Handling ---
  console.log("\n-------------------------------------------------");
  console.log(`Running [Test 8] (Already connected user handling): "Connect with Connected Friend" -> "Send Request"`);
  console.log("-------------------------------------------------");
  const conversation8 = new AiConversation({
    userId: mainUser._id,
    conversationId: `test_p5_conv_conn_${Date.now()}`,
    title: "Connect with Connected Friend",
    messages: [
      { role: "assistant", content: "Would you like to connect?", pendingAction: { type: "send_connection_request", targetUserId: connectedUser._id.toString(), targetName: "Connected Friend" } },
    ],
  });

  const res8 = await runAgentLoop({
    user: mainUser,
    conversation: conversation8,
    message: "Send Request",
    context: { page: "teammates" },
  });

  const test8Passed = res8.text.includes("already connected");

  if (test8Passed) {
    console.log("✅ [Test 8] PASSED: Existing connection logic handled correctly");
    passedCount++;
  } else {
    console.error("❌ [Test 8] FAILED:", JSON.stringify(res8, null, 2));
    failedCount++;
  }

  // --- Test 9: Natural Language Action Prompt ---
  console.log("\n-------------------------------------------------");
  console.log(`Running [Test 9] (Natural language action prompt): "Send a connection request to Py Dev."`);
  console.log("-------------------------------------------------");
  const conversation9 = new AiConversation({
    userId: mainUser._id,
    conversationId: `test_p5_conv_nl_${Date.now()}`,
    title: "Send a connection request to Py Dev.",
    messages: [
      { role: "assistant", content: "Recommended teammates", recommendations: { teammates: [{ userId: pyCandidate._id.toString(), name: "Py Dev" }] } },
    ],
  });

  const res9 = await runAgentLoop({
    user: mainUser,
    conversation: conversation9,
    message: "Send a connection request to Py Dev.",
    context: { page: "teammates" },
  });

  const test9Passed =
    res9.pendingAction &&
    res9.pendingAction.type === "send_connection_request" &&
    res9.pendingAction.targetUserId === pyCandidate._id.toString() &&
    res9.text.includes("Would you like me to send a connection request");

  if (test9Passed) {
    console.log("✅ [Test 9] PASSED: Correct candidate resolved and confirmation requested");
    passedCount++;
  } else {
    console.error("❌ [Test 9] FAILED:", JSON.stringify(res9, null, 2));
    failedCount++;
  }

  console.log("\n=================================================");
  console.log(`Phase 5 Test Summary: ${passedCount} PASSED, ${failedCount} FAILED out of 9 tests.`);
  console.log("=================================================");

  await mongoose.disconnect();
  process.exit(failedCount > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
