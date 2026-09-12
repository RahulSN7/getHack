// ---------------------------------------------------------------------------
// server/tests/testPhase2SearchHackathonsTool.js
// Integration test suite for Phase 2: search_hackathons tool & Agent integration
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
const Hackathon = require("../models/hackathon");
const User = require("../models/user");
const AiConversation = require("../models/aiConversation");
const { runAgentLoop } = require("../services/agentEngine");

async function setupTestData() {
  // Connect to DB if not connected
  if (mongoose.connection.readyState !== 1) {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/gethack";
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      tlsAllowInvalidCertificates: true,
    });
    console.log("Connected to MongoDB for Phase 2 tests.");
  }

  // Ensure test user exists
  let testUser = await User.findOne({ email: "phase2test@gethack.io" });
  if (!testUser) {
    testUser = await User.create({
      name: "Phase 2 Test User",
      email: "phase2test@gethack.io",
      password: "password123",
      role: "participant",
      profile: {
        skills: ["React", "AI", "Node.js"],
        location: "Delhi, India",
      },
    });
  }

  // Ensure real sample hackathons exist in database for testing
  const count = await Hackathon.countDocuments({});
  if (count === 0) {
    console.log("Seeding sample hackathons into MongoDB for test suite...");
    const now = new Date();
    await Hackathon.create([
      {
        title: "Delhi AI Innovation Challenge 2026",
        shortDescription: "Build state of the art Generative AI applications for urban challenges.",
        description: "Premier AI hackathon focusing on LLMs, Machine Learning, and Neural Networks.",
        organizerName: "Delhi AI Community",
        source: { platform: "gethack", externalId: "test_ai_1" },
        format: "Online",
        event: { mode: "Online", startDate: new Date(now.getTime() + 86400000 * 5), endDate: new Date(now.getTime() + 86400000 * 7) },
        registrationOpens: new Date(now.getTime() - 86400000 * 5),
        registrationDeadline: new Date(now.getTime() + 86400000 * 3),
        startDate: new Date(now.getTime() + 86400000 * 5),
        endDate: new Date(now.getTime() + 86400000 * 7),
        location: { city: "Delhi", country: "India", venue: "Online" },
        skills: ["AI", "Python", "TensorFlow", "React"],
        themes: ["Artificial Intelligence", "Generative AI"],
        registrationUrl: "https://gethack.io/hackathons/delhi-ai-2026",
        prizePool: { amount: 5000, currency: "USD", description: "$5,000 Cash Prize + Cloud Credits" },
      },
      {
        title: "Global React & Web Dev Hackathon",
        shortDescription: "Build modern web apps using React 19, Next.js, and TailwindCSS.",
        description: "Annual web developer hackathon sponsored by top frontend tech companies.",
        organizerName: "React Global",
        source: { platform: "devpost", externalId: "test_react_1" },
        format: "Online",
        event: { mode: "Online", startDate: new Date(now.getTime() + 86400000 * 10), endDate: new Date(now.getTime() + 86400000 * 12) },
        registrationOpens: new Date(now.getTime() - 86400000 * 2),
        registrationDeadline: new Date(now.getTime() + 86400000 * 8),
        startDate: new Date(now.getTime() + 86400000 * 10),
        endDate: new Date(now.getTime() + 86400000 * 12),
        location: { city: "Online", country: "Global", venue: "Online" },
        skills: ["React", "JavaScript", "Frontend"],
        themes: ["Web Development", "UI/UX"],
        registrationUrl: "https://devpost.com/hackathons/react-global-2026",
        prizePool: { amount: 3000, currency: "USD", description: "$3,000 + Swag" },
      },
      {
        title: "Upcoming Offline Robotics Summit",
        shortDescription: "In-person hardware and robotics hackathon in New Delhi.",
        description: "Hands-on robotics hardware hackathon.",
        organizerName: "RoboLabs India",
        source: { platform: "unstop", externalId: "test_robo_1" },
        format: "Offline",
        event: { mode: "Offline", startDate: new Date(now.getTime() + 86400000 * 20), endDate: new Date(now.getTime() + 86400000 * 22) },
        registrationOpens: new Date(now.getTime() + 86400000 * 5),
        registrationDeadline: new Date(now.getTime() + 86400000 * 18),
        startDate: new Date(now.getTime() + 86400000 * 20),
        endDate: new Date(now.getTime() + 86400000 * 22),
        location: { city: "Delhi", country: "India", venue: "Pragati Maidan, New Delhi" },
        skills: ["C++", "Robotics", "IoT"],
        themes: ["Hardware", "Robotics"],
        registrationUrl: "https://unstop.com/hackathons/robotics-summit-2026",
        prizePool: { amount: 2000, currency: "USD", description: "$2,000 Cash" },
      },
    ]);
    console.log("Seeded 3 test hackathons into DB.");
  }

  return testUser;
}

async function runTests() {
  console.log("=================================================");
  console.log("Starting Phase 2: search_hackathons Tool Test Suite");
  console.log("=================================================");

  const user = await setupTestData();
  let passedCount = 0;
  let failedCount = 0;

  const testCases = [
    {
      id: "Test 1",
      prompt: "Find AI hackathons.",
      validate: (result) => {
        const hasToolCall = result.toolResults.some((t) => t.toolName === "search_hackathons");
        const hasResults = result.recommendations.hackathons.some((h) =>
          h.skills?.includes("AI") || h.title?.includes("AI") || h.themes?.includes("Artificial Intelligence")
        );
        return hasToolCall && hasResults;
      },
    },
    {
      id: "Test 2",
      prompt: "Find online hackathons.",
      validate: (result) => {
        const toolExec = result.toolResults.find((t) => t.toolName === "search_hackathons");
        const modeArg = toolExec?.args?.mode;
        const allOnline = result.recommendations.hackathons.every((h) => h.mode?.toLowerCase() === "online");
        return modeArg === "online" && (result.recommendations.hackathons.length === 0 || allOnline);
      },
    },
    {
      id: "Test 3",
      prompt: "Find React hackathons.",
      validate: (result) => {
        const toolExec = result.toolResults.find((t) => t.toolName === "search_hackathons");
        const searchedSkills = toolExec?.args?.skills || [];
        const matchesReact = searchedSkills.includes("React") || result.recommendations.hackathons.some((h) => h.skills?.includes("React"));
        return !!matchesReact;
      },
    },
    {
      id: "Test 4",
      prompt: "Find online AI hackathons with registration open.",
      validate: (result) => {
        const toolExec = result.toolResults.find((t) => t.toolName === "search_hackathons");
        const args = toolExec?.args || {};
        return (
          args.mode === "online" &&
          (args.status === "registration_open" || args.status === "open") &&
          (args.skills?.includes("AI") || args.query?.toLowerCase().includes("ai"))
        );
      },
    },
    {
      id: "Test 5",
      prompt: "Find upcoming hackathons.",
      validate: (result) => {
        const toolExec = result.toolResults.find((t) => t.toolName === "search_hackathons");
        const statusArg = toolExec?.args?.status;
        return statusArg === "upcoming";
      },
    },
    {
      id: "Test 6",
      prompt: "Which hackathon is best?",
      validate: (result) => {
        const text = result.text || "";
        return text.length > 20 && (text.includes("Recommendation") || text.includes("recommend") || text.includes("pick") || text.includes("Delhi AI"));
      },
    },
    {
      id: "Test 7",
      prompt: "Find Quantum Computing QuantumCrypto hackathons.",
      validate: (result) => {
        const toolExec = result.toolResults.find((t) => t.toolName === "search_hackathons");
        const count = result.recommendations.hackathons.length;
        const noFabrication = count === 0 && !result.text.includes("Delhi AI Innovation Challenge");
        return !!toolExec && noFabrication;
      },
    },
  ];

  for (const tc of testCases) {
    console.log(`\n-------------------------------------------------`);
    console.log(`Running [${tc.id}]: "${tc.prompt}"`);
    console.log(`-------------------------------------------------`);

    const convId = `test_conv_${Date.now()}`;
    const conversation = new AiConversation({
      userId: user._id,
      conversationId: convId,
      title: tc.prompt,
      messages: [],
    });

    const result = await runAgentLoop({
      user,
      conversation,
      message: tc.prompt,
      context: { page: "hackathon" },
    });

    const passed = tc.validate(result);

    if (passed) {
      console.log(`✅ [${tc.id}] PASSED`);
      passedCount++;
    } else {
      console.error(`❌ [${tc.id}] FAILED`);
      console.error("Result payload:", JSON.stringify(result, null, 2));
      failedCount++;
    }
  }

  console.log("\n=================================================");
  console.log(`Phase 2 Test Summary: ${passedCount} PASSED, ${failedCount} FAILED out of ${testCases.length} tests.`);
  console.log("=================================================");

  await mongoose.disconnect();
  process.exit(failedCount > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
