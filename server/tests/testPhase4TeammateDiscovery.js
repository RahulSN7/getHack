
// server/tests/testPhase4TeammateDiscovery.js
// Integration test suite for Phase 4: Intelligent Teammate Discovery


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
const Connection = require("../models/connection");
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
        console.log("Connected to MongoDB for Phase 4 tests.");
        break;
      } catch (err) {
        console.warn(`Connection attempt ${attempts} failed: ${err.message}`);
        if (attempts >= 3) throw err;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  // 1. Create/update main test user (Full Stack Dev)
  const mainUser = await User.findOneAndUpdate(
    { email: "p4mainuser@gethack.io" },
    {
      $set: {
        name: "Phase 4 Main User",
        email: "p4mainuser@gethack.io",
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
          bio: "Full Stack dev looking for AI & UI/UX teammates.",
          github: "https://github.com/p4mainuser",
        },
      },
    },
    { upsert: true, new: true }
  );

  // 2. Create/update Candidate 1 (Python / ML Engineer)
  const pyCandidate = await User.findOneAndUpdate(
    { email: "p4pydev@gethack.io" },
    {
      $set: {
        name: "Py Dev",
        email: "p4pydev@gethack.io",
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
          github: "https://github.com/pydev",
        },
      },
    },
    { upsert: true, new: true }
  );

  // 3. Create/update Candidate 2 (UI/UX Designer)
  const uiCandidate = await User.findOneAndUpdate(
    { email: "p4uidesigner@gethack.io" },
    {
      $set: {
        name: "UI Designer",
        email: "p4uidesigner@gethack.io",
        password: "password123",
        role: "participant",
        profile: {
          role: "UI/UX Designer",
          gender: "Female",
          dateOfBirth: new Date("2001-08-20"),
          college: "NID Ahmedabad",
          skills: ["Figma", "UI/UX", "TailwindCSS"],
          interests: ["Product Design", "User Research"],
          location: "Mumbai, India",
          availability: "Available",
          bio: "Crafting beautiful interfaces for hackathon projects.",
          linkedin: "https://linkedin.com/in/uidesigner",
        },
      },
    },
    { upsert: true, new: true }
  );

  // 4. Create/update Candidate 3 (Busy / Unavailable candidate)
  const busyCandidate = await User.findOneAndUpdate(
    { email: "p4busydev@gethack.io" },
    {
      $set: {
        name: "Busy Dev",
        email: "p4busydev@gethack.io",
        password: "password123",
        role: "participant",
        profile: {
          role: "Backend Engineer",
          gender: "Male",
          dateOfBirth: new Date("1998-03-10"),
          college: "DTU",
          skills: ["Python", "Go"],
          interests: ["Cloud"],
          location: "Delhi, India",
          availability: "Busy",
          bio: "Currently on another project.",
          github: "https://github.com/busydev",
        },
      },
    },
    { upsert: true, new: true }
  );

  // 5. Ensure Connection relationship between mainUser and pyCandidate
  await Connection.updateOne(
    {
      $or: [
        { sender: mainUser._id, receiver: pyCandidate._id },
        { sender: pyCandidate._id, receiver: mainUser._id },
      ],
    },
    {
      $set: {
        sender: mainUser._id,
        receiver: pyCandidate._id,
        status: "accepted",
      },
    },
    { upsert: true }
  );

  // 6. Ensure Delhi AI Hackathon exists
  const now = new Date();
  await Hackathon.updateOne(
    { "source.externalId": "p4_delhi_ai" },
    {
      $set: {
        title: "Delhi AI Innovation Challenge 2026",
        shortDescription: "Build state of the art Generative AI applications for urban challenges.",
        description: "Premier AI hackathon focusing on LLMs, Machine Learning, and Neural Networks.",
        organizerName: "Delhi AI Community",
        source: { platform: "gethack", externalId: "p4_delhi_ai" },
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

  return { mainUser, pyCandidate, uiCandidate, busyCandidate };
}

async function runTests() {
  console.log("=================================================");
  console.log("Starting Phase 4: Intelligent Teammate Discovery Test Suite");
  console.log("=================================================");

  const { mainUser, pyCandidate, uiCandidate, busyCandidate } = await setupTestData();
  let passedCount = 0;
  let failedCount = 0;

  const testCases = [
    {
      id: "Test 1",
      name: "General teammate search",
      user: mainUser,
      prompt: "Find teammates for me.",
      validate: (result) => {
        const calledTool = result.toolResults.some((t) => t.toolName === "find_teammates" || t.toolName === "get_my_profile");
        const hasCandidates = result.recommendations.teammates.length > 0;
        const noSelf = !result.recommendations.teammates.some((t) => (t.userId || t.id || t._id || "").toString() === mainUser._id.toString());
        return calledTool && hasCandidates && noSelf;
      },
    },
    {
      id: "Test 2",
      name: "Specific skill teammate search (Python)",
      user: mainUser,
      prompt: "Find someone who knows Python.",
      validate: (result) => {
        const calledFind = result.toolResults.some((t) => t.toolName === "find_teammates");
        const containsPyDev = result.recommendations.teammates.some((t) => t.name === "Py Dev" || t.skills?.includes("Python"));
        return calledFind && (containsPyDev || result.text.includes("Py Dev") || result.text.includes("Python"));
      },
    },
    {
      id: "Test 3",
      name: "Role / specialization teammate search (UI/UX)",
      user: mainUser,
      prompt: "I need a UI/UX designer for my team.",
      validate: (result) => {
        const calledFind = result.toolResults.some((t) => t.toolName === "find_teammates");
        const containsUiDev = result.recommendations.teammates.some((t) => t.name === "UI Designer" || t.role?.includes("Designer"));
        return calledFind && (containsUiDev || result.text.includes("UI") || result.text.includes("Designer"));
      },
    },
    {
      id: "Test 4",
      name: "Hackathon-context teammate discovery",
      user: mainUser,
      prompt: "Find two teammates for Delhi AI Innovation Challenge 2026.",
      validate: (result) => {
        const calledHackathon = result.toolResults.some((t) => t.toolName === "get_hackathon_details" || t.toolName === "search_hackathons");
        const calledFind = result.toolResults.some((t) => t.toolName === "find_teammates");
        return (calledHackathon || calledFind) && result.text.length > 20;
      },
    },
    {
      id: "Test 5",
      name: "Network-based teammate search",
      user: mainUser,
      prompt: "Find teammates from my network.",
      validate: (result) => {
        const calledNetwork = result.toolResults.some((t) => t.toolName === "get_my_network");
        const containsPyDev = result.recommendations.teammates.some((t) => (t.userId || t.id || t._id || "").toString() === pyCandidate._id.toString() || t.name === "Py Dev");
        return calledNetwork && (containsPyDev || result.text.includes("Py Dev"));
      },
    },
    {
      id: "Test 6",
      name: "Complementary skill matching rationale",
      user: mainUser,
      prompt: "Recommend teammates who complement my Full Stack skills for an AI project.",
      validate: (result) => {
        const calledProfile = result.toolResults.some((t) => t.toolName === "get_my_profile");
        const calledFind = result.toolResults.some((t) => t.toolName === "find_teammates");
        const textMentionsComplement =
          result.text.toLowerCase().includes("python") ||
          result.text.toLowerCase().includes("ai") ||
          result.text.toLowerCase().includes("designer") ||
          result.text.toLowerCase().includes("complement");
        return calledProfile && calledFind && textMentionsComplement;
      },
    },
    {
      id: "Test 7",
      name: "Direct candidate profile lookup",
      user: mainUser,
      prompt: "Show me details for teammate candidate Py Dev.",
      validate: (result) => {
        const calledProfileLookup = result.toolResults.some((t) => t.toolName === "get_user_profile" || t.toolName === "find_teammates");
        return calledProfileLookup && (result.text.includes("Py Dev") || result.text.includes("Machine Learning"));
      },
    },
    {
      id: "Test 8",
      name: "Self-exclusion enforcement",
      user: mainUser,
      prompt: "Find Python teammates.",
      validate: (result) => {
        const teammates = result.recommendations.teammates || [];
        const mainUserIncluded = teammates.some((t) => (t.userId || t.id || t._id || "").toString() === mainUser._id.toString());
        return !mainUserIncluded;
      },
    },
  ];

  for (const tc of testCases) {
    console.log(`\n-------------------------------------------------`);
    console.log(`Running [${tc.id}] (${tc.name}): "${tc.prompt}"`);
    console.log(`-------------------------------------------------`);

    const convId = `test_p4_conv_${Date.now()}`;
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
      context: { page: "teammates" },
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
  console.log(`Phase 4 Test Summary: ${passedCount} PASSED, ${failedCount} FAILED out of ${testCases.length} tests.`);
  console.log("=================================================");

  await mongoose.disconnect();
  process.exit(failedCount > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
