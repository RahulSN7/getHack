
// server/tests/testPhase3PersonalizedRecommendations.js
// Integration test suite for Phase 3: get_my_profile tool & Personalized Recommendations


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
  if (mongoose.connection.readyState !== 1) {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/gethack";
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      tlsAllowInvalidCertificates: true,
    });
    console.log("Connected to MongoDB for Phase 3 tests.");
  }

  // 1. Create complete profile user
  let fullUser = await User.findOne({ email: "phase3complete@gethack.io" });
  if (!fullUser) {
    fullUser = await User.create({
      name: "Phase 3 Full User",
      email: "phase3complete@gethack.io",
      password: "password123",
      role: "participant",
      profile: {
        role: "Full Stack Developer",
        skills: ["React", "Node.js", "AI"],
        interests: ["Artificial Intelligence", "Web Development"],
        location: "Delhi, India",
        experienceLevel: "Intermediate",
      },
    });
  }

  // 2. Create empty profile user (for Test 5 incomplete profile handling)
  let emptyUser = await User.findOne({ email: "phase3empty@gethack.io" });
  if (!emptyUser) {
    emptyUser = await User.create({
      name: "Phase 3 Empty Profile User",
      email: "phase3empty@gethack.io",
      password: "password123",
      role: "participant",
      profile: {
        role: "",
        skills: [],
        interests: [],
        location: "",
      },
    });
  }

  // Ensure real sample hackathons exist in DB
  const now = new Date();
  await Hackathon.updateOne(
    { "source.externalId": "p3_ai_1" },
    {
      $set: {
        title: "Delhi AI Innovation Challenge 2026",
        shortDescription: "Build state of the art Generative AI applications for urban challenges.",
        description: "Premier AI hackathon focusing on LLMs, Machine Learning, and Neural Networks.",
        organizerName: "Delhi AI Community",
        source: { platform: "gethack", externalId: "p3_ai_1" },
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
    },
    { upsert: true }
  );

  await Hackathon.updateOne(
    { "source.externalId": "p3_react_1" },
    {
      $set: {
        title: "Global React & Web Dev Hackathon",
        shortDescription: "Build modern web apps using React 19, Next.js, and TailwindCSS.",
        description: "Annual web developer hackathon sponsored by top frontend tech companies.",
        organizerName: "React Global",
        source: { platform: "devpost", externalId: "p3_react_1" },
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
    },
    { upsert: true }
  );

  return { fullUser, emptyUser };
}

async function runTests() {
  console.log("=================================================");
  console.log("Starting Phase 3: Personalized Recommendations Test Suite");
  console.log("=================================================");

  const { fullUser, emptyUser } = await setupTestData();
  let passedCount = 0;
  let failedCount = 0;

  const testCases = [
    {
      id: "Test 1",
      name: "General hackathon query (no profile required)",
      user: fullUser,
      prompt: "Find AI hackathons.",
      validate: (result) => {
        const calledSearch = result.toolResults.some((t) => t.toolName === "search_hackathons");
        return calledSearch;
      },
    },
    {
      id: "Test 2",
      name: "Personalized recommendation query",
      user: fullUser,
      prompt: "Which hackathon is best for me?",
      validate: (result) => {
        const calledProfile = result.toolResults.some((t) => t.toolName === "get_my_profile");
        const calledSearch = result.toolResults.some((t) => t.toolName === "search_hackathons");
        const hasText = result.text.length > 20 && (result.text.includes("profile") || result.text.includes("React") || result.text.includes("AI"));
        return calledProfile && calledSearch && hasText;
      },
    },
    {
      id: "Test 3",
      name: "Skill-based profile recommendation query",
      user: fullUser,
      prompt: "Find a hackathon suitable for my React skills.",
      validate: (result) => {
        const calledTool = result.toolResults.some((t) => t.toolName === "get_my_profile" || t.toolName === "search_hackathons");
        const containsMatch = result.recommendations.hackathons.some((h) => h.skills?.includes("React"));
        return calledTool && (containsMatch || result.text.includes("React"));
      },
    },
    {
      id: "Test 4",
      name: "Interest-based recommendation query",
      user: fullUser,
      prompt: "Based on my interests, what should I participate in?",
      validate: (result) => {
        const calledProfile = result.toolResults.some((t) => t.toolName === "get_my_profile");
        const calledSearch = result.toolResults.some((t) => t.toolName === "search_hackathons");
        return calledProfile && calledSearch;
      },
    },
    {
      id: "Test 5",
      name: "Incomplete user profile handling",
      user: emptyUser,
      prompt: "Which hackathon is best for me?",
      validate: (result) => {
        const calledProfile = result.toolResults.some((t) => t.toolName === "get_my_profile");
        const askedForProfile =
          result.text.includes("profile information") ||
          result.text.includes("skills and interests") ||
          result.text.includes("enough profile") ||
          result.text.includes("add your skills");
        const didNotFabricate = result.recommendations.hackathons.length === 0;
        return calledProfile && askedForProfile && didNotFabricate;
      },
    },
  ];

  for (const tc of testCases) {
    console.log(`\n-------------------------------------------------`);
    console.log(`Running [${tc.id}] (${tc.name}): "${tc.prompt}"`);
    console.log(`-------------------------------------------------`);

    const convId = `test_p3_conv_${Date.now()}`;
    const conversation = new AiConversation({
      userId: tc.user._id,
      conversationId: convId,
      title: tc.prompt,
      messages: [],
    });

    const result = await runAgentLoop({
      user: tc.user,
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
  console.log(`Phase 3 Test Summary: ${passedCount} PASSED, ${failedCount} FAILED out of ${testCases.length} tests.`);
  console.log("=================================================");

  await mongoose.disconnect();
  process.exit(failedCount > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
