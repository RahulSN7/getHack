// ---------------------------------------------------------------------------
// scratch/testFullChatFlow.js
// End-to-end backend test for chat favourites & close functionality
// ---------------------------------------------------------------------------

const dns = require("dns");
try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder("ipv4first");
  }
  dns.setServers(["1.1.1.1", "8.8.8.8", "8.8.4.4"]);
} catch (err) {}

require("../server/node_modules/dotenv").config({ path: "f:/Projects/getHack/server/.env" });
const mongoose = require("../server/node_modules/mongoose");
const User = require("../server/models/user");
const UserChatState = require("../server/models/userChatState");

const MONGO_URI = process.env.MONGO_URI;

async function runTests() {
  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000, tlsAllowInvalidCertificates: true });
  console.log("Connected to MongoDB Atlas.");

  try {
    // 1. Find or create two test users
    let userA = await User.findOne({ email: "usera_test@example.com" });
    if (!userA) {
      userA = await User.create({
        name: "User A",
        email: "usera_test@example.com",
        password: "Password123!",
        role: "participant",
      });
    }

    let userB = await User.findOne({ email: "userb_test@example.com" });
    if (!userB) {
      userB = await User.create({
        name: "User B",
        email: "userb_test@example.com",
        password: "Password123!",
        role: "participant",
      });
    }

    const cid = "messaging:test_channel_123";

    console.log("\n--- TEST 1: Toggle Favourite for User A ---");
    // User A favourites channel
    await UserChatState.findOneAndUpdate(
      { user: userA._id, channelCid: cid },
      { $set: { isFavourite: true, targetUserId: userB._id.toString() } },
      { upsert: true, returnDocument: "after" }
    );

    let stateA = await UserChatState.findOne({ user: userA._id, channelCid: cid });
    let stateB = await UserChatState.findOne({ user: userB._id, channelCid: cid });

    console.log("User A state:", { isFavourite: stateA?.isFavourite, isClosed: stateA?.isClosed });
    console.log("User B state:", { isFavourite: stateB?.isFavourite, isClosed: stateB?.isClosed });

    if (stateA?.isFavourite !== true) throw new Error("User A favourite failed");
    if (stateB?.isFavourite === true) throw new Error("Per-user isolation violated: User B also favourited!");

    console.log("✅ Test 1 PASSED: User A favourited conversation without affecting User B.");

    console.log("\n--- TEST 2: Close Chat for User A ---");
    await UserChatState.findOneAndUpdate(
      { user: userA._id, channelCid: cid },
      { $set: { isClosed: true, closedAt: new Date() } },
      { upsert: true, returnDocument: "after" }
    );

    stateA = await UserChatState.findOne({ user: userA._id, channelCid: cid });
    stateB = await UserChatState.findOne({ user: userB._id, channelCid: cid });

    console.log("User A state after close:", { isFavourite: stateA?.isFavourite, isClosed: stateA?.isClosed });
    console.log("User B state after User A closed:", { isFavourite: stateB?.isFavourite, isClosed: stateB?.isClosed });

    if (stateA?.isClosed !== true) throw new Error("User A close chat failed");
    if (stateA?.isFavourite !== true) throw new Error("Closing chat removed favourite status!");
    if (stateB?.isClosed === true) throw new Error("Per-user isolation violated: User B chat also closed!");

    console.log("✅ Test 2 PASSED: User A closed chat without affecting User B or User A's favourite status.");

    console.log("\n--- TEST 3: Reopen Chat for User A ---");
    await UserChatState.findOneAndUpdate(
      { user: userA._id, channelCid: cid },
      { $set: { isClosed: false, closedAt: null } },
      { upsert: true, returnDocument: "after" }
    );

    stateA = await UserChatState.findOne({ user: userA._id, channelCid: cid });

    console.log("User A state after reopen:", { isFavourite: stateA?.isFavourite, isClosed: stateA?.isClosed });

    if (stateA?.isClosed !== false) throw new Error("User A reopen failed");
    if (stateA?.isFavourite !== true) throw new Error("Reopening chat lost favourite status!");

    console.log("✅ Test 3 PASSED: User A reopened chat cleanly; favourite status preserved.");

    // Cleanup test states & users
    await UserChatState.deleteMany({ channelCid: cid });
    await User.deleteMany({ email: { $in: ["usera_test@example.com", "userb_test@example.com"] } });

    console.log("\n🎉 ALL BACKEND CHAT TESTS PASSED SUCCESSFULLY!");
  } finally {
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error("❌ TEST FAILED:", err);
  process.exit(1);
});
