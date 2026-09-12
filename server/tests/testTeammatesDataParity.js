// ---------------------------------------------------------------------------
// server/tests/testTeammatesDataParity.js
// Automated Integration Test Suite for Find Teammates Data Parity (Page vs AI)
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
const { getEligibleTeammateCandidates } = require("../services/teammateService");
const { findTeammates } = require("../tools/findTeammates");
const userController = require("../controllers/userController");

// Mock Response Helper
function createMockRes() {
  const res = {
    statusCode: 200,
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    },
  };
  return res;
}

async function runTests() {
  console.log("=================================================");
  console.log("Starting Find Teammates Data Parity Tests");
  console.log("=================================================\n");

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
        console.log("✓ Connected to MongoDB");
        break;
      } catch (err) {
        console.warn(`Connection attempt ${attempts} failed: ${err.message}`);
        if (attempts >= 3) throw err;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  const testEmails = ["parity_me@gethack.io", "parity_py@gethack.io", "parity_ui@gethack.io"];
  await User.deleteMany({ email: { $in: testEmails } });

  // Ensure test users exist with complete profiles
  let userMe = await User.create({
    name: "Parity Primary User",
    email: "parity_me@gethack.io",
    role: "participant",
    emailVerified: true,
    profile: {
      role: "Fullstack Developer",
      gender: "Male",
      dateOfBirth: "1998-05-15",
      location: "Bengaluru, India",
      bio: "Building awesome hackathon applications",
      availability: "Available",
      skills: ["React", "Node.js", "MongoDB"],
      college: "IIT Bombay",
      degree: "B.Tech Computer Science",
      interests: ["Web Dev", "AI"],
      github: "https://github.com/parityme",
      handle: "parity_me",
    },
  });

  let userPy = await User.create({
    name: "Py Dev",
    email: "parity_py@gethack.io",
    role: "participant",
    emailVerified: true,
    profile: {
      role: "Machine Learning Engineer",
      gender: "Female",
      dateOfBirth: "1999-08-20",
      location: "Bengaluru, India",
      bio: "Specializing in TensorFlow and Deep Learning models",
      availability: "Available",
      skills: ["Python", "TensorFlow", "PyTorch", "AI"],
      college: "BITS Pilani",
      degree: "M.Tech AI",
      interests: ["Machine Learning", "Neural Networks"],
      github: "https://github.com/pydev",
      handle: "py_dev",
    },
  });

  let userUI = await User.create({
    name: "UI Designer",
    email: "parity_ui@gethack.io",
    role: "participant",
    emailVerified: true,
    profile: {
      role: "UI/UX Specialist",
      gender: "Female",
      dateOfBirth: "2000-02-10",
      location: "Delhi, India",
      bio: "Crafting beautiful responsive user interfaces",
      availability: "Available",
      skills: ["Figma", "UI/UX", "TailwindCSS"],
      college: "NID Ahmedabad",
      degree: "B.Des Interaction Design",
      interests: ["Design", "UI/UX"],
      github: "https://github.com/uidesigner",
      handle: "ui_designer",
    },
  });

  // ── TEST 1: Page API vs AI Tool Data Source Parity ──
  console.log("\n[Test 1] Comparing Find Teammates Page API vs AI Tool output...");

  const reqMock = { user: userMe, query: {} };
  const resMock = createMockRes();

  await userController.getAllParticipants(reqMock, resMock);

  if (resMock.statusCode !== 200 || !resMock.jsonData?.participants) {
    throw new Error(`Test 1 Failed: Page API failed to return participants.`);
  }

  const pageParticipants = resMock.jsonData.participants;
  const pageUserIds = pageParticipants.map((p) => p.id || p._id).sort();

  console.log(`Page API returned ${pageParticipants.length} eligible candidates: ${pageUserIds.join(", ")}`);

  // Call AI tool find_teammates with broad parameters
  const aiResult = await findTeammates({ availability: "all" }, { user: userMe });

  if (!aiResult.success || !Array.isArray(aiResult.teammates)) {
    throw new Error(`Test 1 Failed: find_teammates AI tool returned error.`);
  }

  const aiUserIds = aiResult.teammates.map((t) => t.userId).sort();
  console.log(`AI Tool returned ${aiResult.teammates.length} eligible candidates: ${aiUserIds.join(", ")}`);

  // Verify that all page candidates are accessible by the AI tool
  const missingInAi = pageUserIds.filter((id) => !aiUserIds.includes(id));
  if (missingInAi.length > 0) {
    throw new Error(`Test 1 Failed: AI tool missed candidates present on Find Teammates page: ${missingInAi.join(", ")}`);
  }

  console.log("✓ Test 1 Passed: Data parity confirmed between Find Teammates page API and AI tool!");

  // ── TEST 2: Specific Skill Search (Python) ──
  console.log("\n[Test 2] Searching Python candidates via AI tool...");
  const pyResult = await findTeammates({ skills: ["Python"] }, { user: userMe });

  if (!pyResult.success || pyResult.teammates.length === 0) {
    throw new Error(`Test 2 Failed: AI tool returned 0 candidates for Python search.`);
  }
  const topPy = pyResult.teammates[0];
  const pySkillsStr = (topPy.skills || []).join(" ").toLowerCase() + (topPy.role || "").toLowerCase() + (topPy.bio || "").toLowerCase();
  if (!pySkillsStr.includes("python") && !pySkillsStr.includes("ai") && !pySkillsStr.includes("ml")) {
    throw new Error(`Test 2 Failed: Top Python candidate ${topPy.name} does not match Python skills.`);
  }
  console.log(`✓ Test 2 Passed: Found Python candidate ${topPy.name} (${topPy.skills.join(", ")})`);

  // ── TEST 3: Specific Skill Search (UI/UX) ──
  console.log("\n[Test 3] Searching UI/UX candidates via AI tool...");
  const uiResult = await findTeammates({ skills: ["UI/UX"] }, { user: userMe });

  if (!uiResult.success || uiResult.teammates.length === 0) {
    throw new Error(`Test 3 Failed: AI tool returned 0 candidates for UI/UX search.`);
  }
  const topUi = uiResult.teammates[0];
  const uiSkillsStr = (topUi.skills || []).join(" ").toLowerCase() + (topUi.role || "").toLowerCase() + (topUi.bio || "").toLowerCase();
  if (!uiSkillsStr.includes("ui") && !uiSkillsStr.includes("ux") && !uiSkillsStr.includes("design")) {
    throw new Error(`Test 3 Failed: Top UI/UX candidate ${topUi.name} does not match UI/UX skills.`);
  }
  console.log(`✓ Test 3 Passed: Found UI/UX candidate ${topUi.name} (${topUi.skills.join(", ")})`);

  // ── TEST 4: Self-Exclusion ──
  console.log("\n[Test 4] Verifying self-exclusion for authenticated user...");
  const selfMatch = aiResult.teammates.find((t) => t.userId === userMe._id.toString());
  if (selfMatch) {
    throw new Error(`Test 4 Failed: Authenticated user was included in candidate results.`);
  }
  console.log("✓ Test 4 Passed: Authenticated user excluded from candidate results.");

  // ── TEST 5: Accepted Connection Exclusion ──
  console.log("\n[Test 5] Verifying exclusion of accepted connection partners...");
  // Create an accepted connection between userMe and userUI
  await Connection.deleteMany({
    $or: [
      { sender: userMe._id, receiver: userUI._id },
      { sender: userUI._id, receiver: userMe._id },
    ],
  });

  await Connection.create({
    sender: userMe._id,
    receiver: userUI._id,
    status: "accepted",
  });

  const connectedAiResult = await findTeammates({ availability: "all" }, { user: userMe });
  const connectedUiMatch = connectedAiResult.teammates.find((t) => t.userId === userUI._id.toString());
  if (connectedUiMatch) {
    throw new Error(`Test 5 Failed: Accepted connection partner userUI was included in candidate results.`);
  }
  console.log("✓ Test 5 Passed: Accepted connection partner excluded from candidate results.");

  // Clean up test connection
  await Connection.deleteMany({
    $or: [
      { sender: userMe._id, receiver: userUI._id },
      { sender: userUI._id, receiver: userMe._id },
    ],
  });

  console.log("\n=================================================");
  console.log("ALL FIND TEAMMATES DATA PARITY TESTS PASSED!");
  console.log("=================================================\n");

  await mongoose.disconnect();
}

runTests().catch(async (err) => {
  console.error("\n❌ Test Suite Failed:", err);
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }
  process.exit(1);
});
