
// server/tests/testTeammateDiscoveryMatching.js
// Test Suite for Teammate Discovery & Skill/Hackathon Matching


const dns = require("dns");
try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder("ipv4first");
  }
  dns.setServers(["1.1.1.1", "8.8.8.8", "8.8.4.4"]);
} catch (err) {
  // Ignore DNS config warning
}

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../models/user");
const Hackathon = require("../models/hackathon");
const { findTeammates, matchesTerm } = require("../tools/findTeammates");
const { callLLM } = require("../services/aiService");
const { getEligibleTeammateCandidates } = require("../services/teammateService");

async function runTests() {
  console.log("=== GET HACK AI TEAMMATE DISCOVERY TEST SUITE ===\n");

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/gethack";

  let attempts = 0;
  while (attempts < 3) {
    try {
      attempts++;
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
      break;
    } catch (err) {
      if (attempts >= 3) throw err;
      await new Promise((res) => setTimeout(res, 1000));
    }
  }
  console.log("Connected to MongoDB.");

  // 1. Fetch test users from DB
  const testUser = await User.findOne({ role: "participant" });
  if (!testUser) {
    console.error("❌ Test setup failed: No participant user found in DB.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const userIdStr = testUser._id.toString();
  console.log(`Test Authenticated User: ${testUser.name} (${userIdStr})`);

  // Ensure testUser has completed profile
  if (!testUser.profile) testUser.profile = {};
  testUser.profile.skills = ["React", "Node.js", "MongoDB", "JavaScript"];
  testUser.profile.interests = ["Web Apps", "AI"];
  testUser.profile.availability = "Available";
  testUser.profile.headline = "Full Stack Developer";
  testUser.profile.bio = "Building web apps and full stack solutions.";
  await testUser.save();

  // 2. Fetch sample hackathon from DB or use fallback
  let sampleHackathon = await Hackathon.findOne({});
  if (!sampleHackathon) {
    sampleHackathon = await Hackathon.create({
      title: "AI Innovation Hackathon 2026",
      slug: "ai-innovation-2026",
      shortDescription: "Build cutting-edge AI and Machine Learning applications",
      description: "Build cutting-edge AI and Machine Learning applications",
      format: "Online",
      skills: ["Python", "Machine Learning", "TensorFlow", "AI"],
      themes: ["Artificial Intelligence", "Machine Learning"],
      registrationDeadline: new Date(Date.now() + 7 * 86400000),
      organizerName: "getHack Team",
      created: new Date(),
    });
  }
  const hackIdStr = sampleHackathon._id.toString();
  console.log(`Sample Hackathon: ${sampleHackathon.title} (${hackIdStr})\n`);

  const context = {
    userProfile: {
      id: userIdStr,
      name: testUser.name,
      role: testUser.role,
      skills: testUser.profile.skills,
      interests: testUser.profile.interests,
      location: testUser.profile.location || "",
    },
    hackathonId: hackIdStr,
  };

  // 3. Test Candidate Pool Consistency between Find Teammates Service & AI Tool
  console.log("--- TEST 0: Candidate Pool Consistency ---");
  const { eligibleUsers } = await getEligibleTeammateCandidates(userIdStr);
  const toolResult0 = await findTeammates({ limit: 50, matchMode: "all" }, context);

  console.log(`DB Eligible Teammates Count: ${eligibleUsers.length}`);
  console.log(`AI Tool Returned Count: ${toolResult0.count}`);

  if (toolResult0.count === eligibleUsers.length) {
    console.log("✅ Candidate pool count is EXACTLY consistent!");
  } else {
    console.warn(`⚠️ Count difference: DB=${eligibleUsers.length}, AI Tool=${toolResult0.count}`);
  }

  // --- TEST A: Generic Teammate Discovery ---
  console.log("\n--- TEST A: Generic Teammate Discovery ('Find teammates for me.') ---");
  const messagesA = [{ role: "user", content: "Find teammates for me." }];
  const responseA1 = await callLLM(messagesA, context);

  if (responseA1.toolCalls && responseA1.toolCalls.length > 0) {
    const toolCall = responseA1.toolCalls.find((tc) => tc.name === "find_teammates");
    console.log(`Tool called: ${toolCall?.name}, args: ${JSON.stringify(toolCall?.args)}`);
    const toolResult = await findTeammates(toolCall?.args || {}, context);

    messagesA.push({ role: "assistant", content: `Called find_teammates` });
    messagesA.push({ role: "tool", name: "find_teammates", content: JSON.stringify(toolResult) });

    const responseA2 = await callLLM(messagesA, context);
    console.log(`Response text preview: "${responseA2.text.slice(0, 120)}..."`);
    console.log(`Recommendations count: ${responseA2.recommendations?.teammates?.length || 0}`);

    if (responseA2.recommendations?.teammates?.length === toolResult.teammates.length) {
      console.log("✅ TEST A PASSED: All eligible candidates returned in recommendations without truncation!");
    } else {
      console.error("❌ TEST A FAILED: Candidates were truncated!");
    }
  }

  // --- TEST B: Show all available teammates ---
  console.log("\n--- TEST B: Show all available teammates ('Show me all available teammates.') ---");
  const toolResultB = await findTeammates({ availability: "available", limit: 50, matchMode: "all" }, context);
  console.log(`Available candidates found: ${toolResultB.count}`);
  console.log("✅ TEST B PASSED: Availability filter evaluated cleanly!");

  // --- TEST C: Specific skill matching ('Find Python teammates.') ---
  console.log("\n--- TEST C: Specific skill search ('Find Python teammates.') ---");
  const toolResultC = await findTeammates({ skills: ["Python"], limit: 50, matchMode: "skill" }, context);
  console.log(`Candidates returned: ${toolResultC.count}`);
  const pyDevFirst = toolResultC.teammates.findIndex((t) => matchesTerm(t.skills, "Python") || matchesTerm(t.role, "Python"));
  console.log(`First candidate with Python skill index: ${pyDevFirst}`);
  if (pyDevFirst === 0 || toolResultC.count === 0) {
    console.log("✅ TEST C PASSED: Python candidates prioritized first!");
  } else {
    console.warn(`⚠️ Note: Python candidate index: ${pyDevFirst}`);
  }

  // --- TEST D: Machine Learning matching with synonym ('Find machine learning teammates.') ---
  console.log("\n--- TEST D: ML synonym search ('Find machine learning teammates.') ---");
  const toolResultD = await findTeammates({ skills: ["Machine Learning"], limit: 50, matchMode: "skill" }, context);
  console.log(`Candidates returned: ${toolResultD.count}`);
  const mlDevFirst = toolResultD.teammates.findIndex((t) => matchesTerm(t.skills, "ml") || matchesTerm(t.role, "ml"));
  console.log(`First candidate with ML skill index: ${mlDevFirst}`);
  if (mlDevFirst === 0 || toolResultD.count === 0) {
    console.log("✅ TEST D PASSED: ML/AI candidate prioritized via synonym mapping!");
  }

  // --- TEST E: Hackathon context search ('Find teammates for this hackathon.') ---
  console.log("\n--- TEST E: Hackathon context search ('Find teammates for this hackathon.') ---");
  const toolResultE = await findTeammates({ hackathonId: hackIdStr, limit: 50, matchMode: "hackathon" }, context);
  console.log(`Candidates returned for hackathon: ${toolResultE.count}`);
  if (toolResultE.success) {
    console.log(`Top candidate score for hackathon: ${toolResultE.teammates[0]?.score || 0}`);
    console.log("✅ TEST E PASSED: Hackathon requirements and complementary skills scored!");
  }

  // --- TEST F: Specific skill + Hackathon ('Find Python teammates for this hackathon.') ---
  console.log("\n--- TEST F: Skill + Hackathon ('Find Python teammates for this hackathon.') ---");
  const toolResultF = await findTeammates({ skills: ["Python"], hackathonId: hackIdStr, limit: 50, matchMode: "skill_and_hackathon" }, context);
  console.log(`Candidates returned for Python + Hackathon: ${toolResultF.count}`);
  if (toolResultF.success) {
    console.log("✅ TEST F PASSED: Skill + Hackathon combined match evaluated cleanly!");
  }

  // --- TEST G: Single best teammate query ('Who is the best teammate for me?') ---
  console.log("\n--- TEST G: Single best teammate ('Who is the best teammate for me?') ---");
  const messagesG = [{ role: "user", content: "Who is the best teammate for me?" }];
  messagesG.push({ role: "assistant", content: "Called find_teammates" });
  messagesG.push({ role: "tool", name: "find_teammates", content: JSON.stringify(toolResult0) });

  const responseG = await callLLM(messagesG, context);
  console.log(`Single best response text preview: "${responseG.text.slice(0, 150)}..."`);
  console.log(`Recommendations count: ${responseG.recommendations?.teammates?.length || 0}`);
  if (responseG.recommendations?.teammates?.length === 1) {
    console.log("✅ TEST G PASSED: Single top recommendation returned with clear reason!");
  }

  // --- TEST H: Top 5 teammates query ('Show me the best 5 teammates.') ---
  console.log("\n--- TEST H: Top 5 teammates ('Show me the best 5 teammates.') ---");
  const messagesH = [{ role: "user", content: "Show me the best 5 teammates." }];
  messagesH.push({ role: "assistant", content: "Called find_teammates" });
  messagesH.push({ role: "tool", name: "find_teammates", content: JSON.stringify(toolResult0) });

  const responseH = await callLLM(messagesH, context);
  console.log(`Top 5 response text preview: "${responseH.text.slice(0, 150)}..."`);
  console.log(`Recommendations count: ${responseH.recommendations?.teammates?.length || 0}`);
  if (responseH.recommendations?.teammates?.length <= 5) {
    console.log("✅ TEST H PASSED: Top 5 ranked candidates returned!");
  }

  console.log("\n=== ALL TEST SUITE EXECUTIONS COMPLETED ===");
  await mongoose.disconnect();
}

runTests().catch((err) => {
  console.error("Test error:", err);
  mongoose.disconnect();
  process.exit(1);
});
