
// server/tests/testHackathonIntelligencePhase3.js
// Unit & Integration Test Suite for GetHack A1 Phase 3: Hackathon Intelligence


const assert = require("assert");
const { callLLM } = require("../services/aiService");

async function runTests() {
  console.log("=== STARTING PHASE 3 HACKATHON INTELLIGENCE TESTS ===");

  const context = {
    userProfile: {
      id: "user_test_p3",
      skills: ["MERN", "JavaScript", "C++"],
      interests: ["Web Development", "AI"],
      location: "Bengaluru, India",
    },
    user: { _id: "user_test_p3", name: "Phase 3 Tester" },
  };

  const sampleHackathon = {
    id: "hack_volthacks",
    _id: "hack_volthacks",
    title: "VoltHacks AI Challenge 2026",
    name: "VoltHacks AI Challenge 2026",
    organizerName: "VoltHacks Team",
    description: "Build cutting-edge AI products using Python, TensorFlow, and PyTorch.",
    mode: "Online",
    location: "Online",
    registrationDeadline: new Date(Date.now() + 9 * 86400 * 1000).toISOString(),
    startDate: new Date(Date.now() + 15 * 86400 * 1000).toISOString(),
    skills: ["Python", "TensorFlow", "PyTorch", "Data Science"],
    themes: ["AI", "Machine Learning"],
    prizePool: "$10,000 USD",
    eligibility: "Open to all developers and students worldwide",
    registrationUrl: "https://volthacks.example.com/register",
  };

  const sampleTeammates = [
    {
      id: "u_py",
      userId: "u_py",
      name: "Py Dev",
      role: "AI Developer",
      skills: ["Python", "TensorFlow", "PyTorch", "AI"],
      availability: "available",
    },
    {
      id: "u_js",
      userId: "u_js",
      name: "Frontend JS",
      role: "Frontend Engineer",
      skills: ["JavaScript", "React"],
      availability: "available",
    },
  ];

  let testPassed = 0;

  -----------------------
    // TEST 1: HACKATHON_DETAILS ("Tell me about this hackathon")
    -----------------------
      console.log("\n--- TEST 1: HACKATHON_DETAILS ('Tell me about this hackathon') ---");
  const msgDetails = { role: "user", content: "Tell me about this hackathon" };
  const historyWithHack = [
    { role: "assistant", content: "Recommended hackathon:", recommendations: { hackathons: [sampleHackathon] } },
    msgDetails,
  ];

  const resDetails = await callLLM(historyWithHack, context);
  assert.ok(resDetails.text.includes("VoltHacks AI Challenge 2026"), "Must mention VoltHacks");
  assert.ok(resDetails.text.includes("Key Details"), "Must include key details section");
  assert.strictEqual(resDetails.recommendations?.hackathons?.length, 1, "Must preserve selected hackathon card");
  console.log("T1 Response Text:\n" + resDetails.text);
  console.log("✅ TEST 1 PASSED");
  testPassed++;

  -----------------------
    // TEST 2: HACKATHON_REQUIREMENTS ("What skills does it require?")
    -----------------------
      console.log("\n--- TEST 2: HACKATHON_REQUIREMENTS ('What skills does it require?') ---");
  const msgReqs = { role: "user", content: "What skills does it require?" };
  const resReqs = await callLLM([...historyWithHack, { role: "assistant", content: resDetails.text }, msgReqs], context);

  assert.ok(resReqs.text.includes("Python"), "Must list Python requirement");
  assert.ok(resReqs.text.includes("TensorFlow"), "Must list TensorFlow requirement");
  assert.ok(resReqs.text.includes("required skills are"), "Must report required skills for the hackathon");
  console.log("T2 Response Text:\n" + resReqs.text);
  console.log("✅ TEST 2 PASSED");
  testPassed++;

  -----------------------
    // TEST 3: HACKATHON_DEADLINE ("When is the deadline?")
    -----------------------
      console.log("\n--- TEST 3: HACKATHON_DEADLINE ('When is the deadline?') ---");
  const msgDeadline = { role: "user", content: "When is the deadline?" };
  const resDeadline = await callLLM([...historyWithHack, msgDeadline], context);

  assert.ok(resDeadline.text.includes("Registration closes on"), "Must report registration closing date");
  assert.ok(resDeadline.text.includes("remaining"), "Must calculate remaining days");
  assert.ok(resDeadline.text.includes("external hackathon platform"), "Must disclaim external registration");
  console.log("T3 Response Text:\n" + resDeadline.text);
  console.log("✅ TEST 3 PASSED");
  testPassed++;

  -----------------------
    // TEST 4: HACKATHON_ELIGIBILITY ("Am I eligible?")
    -----------------------
      console.log("\n--- TEST 4: HACKATHON_ELIGIBILITY ('Am I eligible?') ---");
  const msgElig = { role: "user", content: "Am I eligible?" };
  const resElig = await callLLM([...historyWithHack, msgElig], context);

  assert.ok(resElig.text.includes("eligibility requirements"), "Must verify eligibility requirements");
  assert.ok(resElig.text.includes("Open to all developers"), "Must reference actual eligibility rule");
  console.log("T4 Response Text:\n" + resElig.text);
  console.log("✅ TEST 4 PASSED");
  testPassed++;

  -----------------------
    // TEST 5: HACKATHON_PROFILE_FIT ("How good is this hackathon for me?")
    -----------------------
      console.log("\n--- TEST 5: HACKATHON_PROFILE_FIT ('How good is this hackathon for me?') ---");
  const msgFit = { role: "user", content: "How good is this hackathon for me?" };
  const resFit = await callLLM([...historyWithHack, msgFit], context);

  assert.ok(resFit.text.includes("Fit:"), "Must state Fit level");
  assert.ok(resFit.text.includes("Why:"), "Must explain why");
  assert.ok(resFit.text.includes("Recommendation:"), "Must provide actionable recommendation");
  console.log("T5 Response Text:\n" + resFit.text);
  console.log("✅ TEST 5 PASSED");
  testPassed++;

  -----------------------
    // TEST 6: HACKATHON_SKILL_GAP ("What skills am I missing?")
    -----------------------
      console.log("\n--- TEST 6: HACKATHON_SKILL_GAP ('What skills am I missing?') ---");
  const msgGap = { role: "user", content: "What skills am I missing?" };
  const resGap = await callLLM([...historyWithHack, msgGap], context);

  assert.ok(resGap.text.includes("You already have:"), "Must list skills user has");
  assert.ok(resGap.text.includes("You may need:"), "Must list missing skills");
  assert.ok(resGap.text.includes("Python"), "Python must be identified as a missing skill");
  console.log("T6 Response Text:\n" + resGap.text);
  console.log("✅ TEST 6 PASSED");
  testPassed++;

  -----------------------
    // TEST 7: HACKATHON_TEAM_REQUIREMENTS ("What teammates do I need for this hackathon?")
    -----------------------
      console.log("\n--- TEST 7: HACKATHON_TEAM_REQUIREMENTS ('What teammates do I need for this hackathon?') ---");
  const msgTeamReq = { role: "user", content: "What teammates do I need for this hackathon?" };
  const resTeamReqTool = await callLLM([...historyWithHack, msgTeamReq], context);

  assert.ok(resTeamReqTool.toolCalls?.some((tc) => tc.name === "find_teammates"), "Turn 1 must trigger find_teammates tool call");

  const toolMsgTeammates = { role: "tool", name: "find_teammates", content: JSON.stringify({ count: 2, teammates: sampleTeammates }) };
  const resTeamReqFinal = await callLLM([...historyWithHack, msgTeamReq, { role: "assistant", content: "Searching teammates..." }, toolMsgTeammates], context);

  assert.ok(resTeamReqFinal.recommendations?.teammates, "Turn 2 must return teammate cards");
  assert.strictEqual(resTeamReqFinal.recommendations.teammates.length, 2);
  console.log("T7 Response Text:\n" + resTeamReqFinal.text);
  console.log("✅ TEST 7 PASSED");
  testPassed++;

  -----------------------
    // TEST 8: Full Continuous Conversation Workflow (Test 1 through Test 7 in sequence)
    -----------------------
      console.log("\n--- TEST 8: Full Continuous Conversation Workflow ---");
  const workflowMessages = [
    { role: "user", content: "Show me AI hackathons" },
    { role: "assistant", content: "Found hackathons:", recommendations: { hackathons: [sampleHackathon] } },
    { role: "user", content: "Which one is best?" },
    { role: "assistant", content: "I recommend VoltHacks AI Challenge 2026.", recommendations: { hackathons: [sampleHackathon] } },
    { role: "user", content: "What skills does it require?" },
  ];

  const wfRes = await callLLM(workflowMessages, context);
  assert.ok(wfRes.text.includes("Python"), "Workflow step 3 must recognize selected hackathon requirements");

  // Step 4: What skills am I missing?
  workflowMessages.push({ role: "assistant", content: wfRes.text, recommendations: { hackathons: [sampleHackathon] } });
  workflowMessages.push({ role: "user", content: "What skills am I missing?" });
  const wfRes4 = await callLLM(workflowMessages, context);
  assert.ok(wfRes4.text.includes("Python"), "Workflow step 4 must identify Python skill gap");

  // Step 5: Which teammate is best?
  workflowMessages.push({ role: "assistant", content: wfRes4.text, recommendations: { hackathons: [sampleHackathon] } });
  workflowMessages.push({ role: "user", content: "Which teammate is best?" });
  const wfToolMsg = { role: "tool", name: "find_teammates", content: JSON.stringify({ count: 2, teammates: sampleTeammates }) };
  const wfRes5 = await callLLM([...workflowMessages, { role: "assistant", content: "Finding..." }, wfToolMsg], context);

  assert.ok(wfRes5.recommendations?.teammates, "Workflow step 5 must return best teammate recommendation");
  assert.strictEqual(wfRes5.recommendations.teammates.length, 1, "Workflow step 5 must return EXACTLY 1 teammate card");
  assert.strictEqual(wfRes5.recommendations.teammates[0].name, "Py Dev", "Workflow step 5 must select Py Dev");
  console.log("✅ TEST 8 PASSED (Full continuous multi-turn workflow verified!)");
  testPassed++;

  -----------------------
    // TEST 9: Exact prompt 'What skills do I require?' using context
    -----------------------
      console.log("\n--- TEST 9: Exact prompt 'What skills do I require?' with context ---");
  const testRequirementPhrases = [
    "What skills do I require?",
    "What skills do I need?",
    "What skills are required?",
    "What skills does this hackathon require?",
    "What technologies do I need?",
    "What should I know for this hackathon?",
    "What skills are needed for this hackathon?",
    "What do I need to know for this hackathon?",
    "What technologies are required?",
    "What should I learn for this hackathon?",
    "What do I require?"
  ];

  for (const phrase of testRequirementPhrases) {
    const msg = { role: "user", content: phrase };
    const res = await callLLM([...historyWithHack, msg], context);

    assert.ok(res.text.includes("required skills are"), `Phrase '${phrase}' must report required skills`);
    assert.ok(res.text.includes("Python"), `Phrase '${phrase}' must list Python requirement`);
    assert.ok(!res.text.includes("I understand you're asking about"), `Phrase '${phrase}' must NEVER hit generic fallback`);
    assert.strictEqual(res.recommendations?.hackathons?.length, 1, `Phrase '${phrase}' must preserve selected hackathon card`);
  }
  console.log("✅ TEST 9 PASSED (All 11 requirement phrasing variations correctly answered using hackathon context!)");
  testPassed++;

  -----------------------
    // TEST 10: Fresh conversation 'What skills do I require?' without context
    -----------------------
      console.log("\n--- TEST 10: Fresh conversation 'What skills do I require?' without context ---");
  const freshMsg = { role: "user", content: "What skills do I require?" };
  const freshRes = await callLLM([freshMsg], context);

  assert.ok(freshRes.text.includes("Which hackathon are you asking about?"), "Fresh prompt without context must ask user to specify hackathon");
  assert.ok(!freshRes.text.includes("I understand you're asking about"), "Fresh prompt must NOT hit generic fallback");
  console.log("T10 Response Text:\n" + freshRes.text);
  console.log("✅ TEST 10 PASSED");
  testPassed++;

  console.log(`\n=== RESULT: ${testPassed}/10 PHASE 3 TESTS PASSED ===`);
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
