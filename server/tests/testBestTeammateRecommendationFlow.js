
// server/tests/testBestTeammateRecommendationFlow.js
// Unit & Integration Test Suite for GetHack A1 "Best Teammate" Recommendation Flow


const assert = require("assert");
const { callLLM } = require("../services/aiService");

async function runTests() {
  console.log("=== STARTING BEST TEAMMATE RECOMMENDATION FLOW TESTS ===");

  const context = {
    userProfile: {
      id: "user_main_test",
      skills: ["MERN", "JavaScript", "C++"],
      interests: ["Web Development", "AI"],
    },
    user: { _id: "user_main_test", name: "Main Test User" },
  };

  const sampleTeammates = [
    {
      id: "u_py",
      userId: "u_py",
      _id: "u_py",
      name: "Py Dev",
      role: "AI Developer",
      skills: ["Python", "TensorFlow", "PyTorch", "AI"],
      availability: "available",
      connectionState: "none",
    },
    {
      id: "u_js",
      userId: "u_js",
      _id: "u_js",
      name: "Frontend JS",
      role: "Frontend Engineer",
      skills: ["JavaScript", "React", "CSS"],
      availability: "available",
      connectionState: "none",
    },
    {
      id: "u_ui",
      userId: "u_ui",
      _id: "u_ui",
      name: "UI Designer",
      role: "UX Specialist",
      skills: ["UI/UX", "Figma", "Design"],
      availability: "available",
      connectionState: "none",
    },
    {
      id: "u_node",
      userId: "u_node",
      _id: "u_node",
      name: "Backend Node",
      role: "Backend Engineer",
      skills: ["Node.js", "Express", "MongoDB"],
      availability: "available",
      connectionState: "none",
    },
    {
      id: "u_cpp",
      userId: "u_cpp",
      _id: "u_cpp",
      name: "C++ Systems",
      role: "Systems Engineer",
      skills: ["C++", "Rust", "Linux"],
      availability: "available",
      connectionState: "none",
    },
    {
      id: "u_ml",
      userId: "u_ml",
      _id: "u_ml",
      name: "Karan ML",
      role: "ML Researcher",
      skills: ["Machine Learning", "Python", "Data Science"],
      availability: "available",
      connectionState: "none",
    },
  ];

  let testPassed = 0;
  let testTotal = 6;

  -----------------------
    // TEST 1: Normal Search ("Find teammates for AI hackathon") -> UP TO 5 CARDS
    -----------------------
      console.log("\n--- TEST 1: Normal Search 'Find teammates for AI hackathon' ---");
  const t1UserMsg = { role: "user", content: "Find teammates for AI hackathon" };
  const t1Res = await callLLM([t1UserMsg], context);

  assert.ok(t1Res.toolCalls?.some((tc) => tc.name === "find_teammates"), "Must call find_teammates");
  const t1ToolMsg = { role: "tool", name: "find_teammates", content: JSON.stringify({ count: 6, candidatesAfterFilters: 6, teammates: sampleTeammates }) };
  const t1FinalRes = await callLLM([t1UserMsg, { role: "assistant", content: "Searching teammates..." }, t1ToolMsg], context);

  assert.ok(t1FinalRes.recommendations?.teammates, "T1 must return teammate cards");
  assert.strictEqual(t1FinalRes.recommendations.teammates.length, 5, "Normal search must return 5 cards");
  console.log("T1 Teammates count:", t1FinalRes.recommendations.teammates.length);
  console.log("✅ TEST 1 PASSED");
  testPassed++;

  -----------------------
    // TEST 2: Direct Best Teammate Request ("Which one best teammates for AI hackathon") -> EXACTLY 1 CARD
    -----------------------
      console.log("\n--- TEST 2: Direct Best Request 'Which one best teammates for AI hackathon' ---");
  const t2UserMsg = { role: "user", content: "Which one best teammates for AI hackathon" };
  const t2ToolMsg = { role: "tool", name: "find_teammates", content: JSON.stringify({ count: 6, candidatesAfterFilters: 6, teammates: sampleTeammates }) };
  const t2FinalRes = await callLLM([t2UserMsg, { role: "assistant", content: "Finding best teammate..." }, t2ToolMsg], context);

  assert.ok(t2FinalRes.recommendations?.teammates, "T2 must return teammate recommendation");
  assert.strictEqual(t2FinalRes.recommendations.teammates.length, 1, "Direct best request must return EXACTLY 1 teammate card");
  assert.strictEqual(t2FinalRes.recommendations.teammates[0].name, "Py Dev", "Py Dev must be selected as best AI match for user background");
  console.log("T2 Best Teammate Selected:", t2FinalRes.recommendations.teammates[0].name);
  console.log("T2 Response Text:", t2FinalRes.text);
  console.log("✅ TEST 2 PASSED");
  testPassed++;

  -----------------------
    // TEST 3: Best from Existing Results (Turn 1: 5 cards -> Turn 2: "Which one is best?") -> EXACTLY 1 CARD
    -----------------------
      console.log("\n--- TEST 3: Best from Existing Results (Turn 2 'Which one is best?') ---");
  const turn1AssistantMsg = { role: "assistant", content: "I found 5 teammates:", recommendations: { teammates: sampleTeammates.slice(0, 5) } };
  const t3UserMsg = { role: "user", content: "Which one is best?" };

  const t3FinalRes = await callLLM([t1UserMsg, turn1AssistantMsg, t3UserMsg], context);

  assert.ok(t3FinalRes.recommendations?.teammates, "T3 must return teammate recommendation");
  assert.strictEqual(t3FinalRes.recommendations.teammates.length, 1, "Follow-up 'Which one is best?' must return EXACTLY 1 card");
  assert.strictEqual(t3FinalRes.recommendations.teammates[0].id, "u_py", "Selected teammate must preserve real ID 'u_py'");
  console.log("T3 Selected Teammate ID:", t3FinalRes.recommendations.teammates[0].id);
  console.log("✅ TEST 3 PASSED");
  testPassed++;

  -----------------------
    // TEST 4: Skill-Specific Best ("Which teammate is best for Python?") -> EXACTLY 1 CARD
    -----------------------
      console.log("\n--- TEST 4: Skill-Specific Best 'Which teammate is best for Python?' ---");
  const t4UserMsg = { role: "user", content: "Which teammate is best for Python?" };
  const t4ToolMsg = { role: "tool", name: "find_teammates", content: JSON.stringify({ count: 6, candidatesAfterFilters: 6, teammates: sampleTeammates }) };
  const t4FinalRes = await callLLM([t4UserMsg, { role: "assistant", content: "Finding candidate..." }, t4ToolMsg], context);

  assert.ok(t4FinalRes.recommendations?.teammates, "T4 must return candidate");
  assert.strictEqual(t4FinalRes.recommendations.teammates.length, 1, "Skill-specific best must return EXACTLY 1 card");
  assert.ok(t4FinalRes.recommendations.teammates[0].skills.includes("Python"), "Selected candidate must have Python skill");
  console.log("T4 Selected Teammate:", t4FinalRes.recommendations.teammates[0].name);
  console.log("✅ TEST 4 PASSED");
  testPassed++;

  -----------------------
    // TEST 5: Complementary Teammate Best ("Who is the best teammate to complement my MERN skills?") -> EXACTLY 1 CARD
    -----------------------
      console.log("\n--- TEST 5: Complementary Best 'Who is the best teammate to complement my MERN skills?' ---");
  const t5UserMsg = { role: "user", content: "Who is the best teammate to complement my MERN skills?" };
  const t5ToolMsg = { role: "tool", name: "find_teammates", content: JSON.stringify({ count: 6, candidatesAfterFilters: 6, teammates: sampleTeammates }) };
  const t5FinalRes = await callLLM([t5UserMsg, { role: "assistant", content: "Searching..." }, t5ToolMsg], context);

  assert.ok(t5FinalRes.recommendations?.teammates, "T5 must return candidate");
  assert.strictEqual(t5FinalRes.recommendations.teammates.length, 1, "Complementary best query must return EXACTLY 1 card");
  console.log("T5 Selected Teammate:", t5FinalRes.recommendations.teammates[0].name);
  console.log("✅ TEST 5 PASSED");
  testPassed++;

  -----------------------
    // TEST 6: Follow-Up Questions ("Why is this teammate best?", "What skills...", "Can I connect?")
    -----------------------
      console.log("\n--- TEST 6: Follow-up Questions on Selected Teammate ---");
  const turn1RecMsg = { role: "assistant", content: "I recommend Py Dev as the best match.", recommendations: { teammates: [sampleTeammates[0]] } };

  // 6a: Why question
  const whyUserMsg = { role: "user", content: "Why is this teammate best?" };
  const whyRes = await callLLM([t2UserMsg, turn1RecMsg, whyUserMsg], context);
  assert.ok(whyRes.text.includes("Py Dev"), "Why response must explain Py Dev selection");
  assert.strictEqual(whyRes.recommendations?.teammates?.length, 1, "Why response must preserve Py Dev card");
  console.log("6a Why Response:", whyRes.text);

  // 6b: Skills question
  const skillUserMsg = { role: "user", content: "What skills does this teammate have?" };
  const skillRes = await callLLM([t2UserMsg, turn1RecMsg, skillUserMsg], context);
  assert.ok(skillRes.text.includes("Python"), "Skill response must detail Py Dev skills");
  console.log("6b Skills Response:", skillRes.text);

  // 6c: Connect question
  const connectUserMsg = { role: "user", content: "Can I connect with them?" };
  const connectRes = await callLLM([t2UserMsg, turn1RecMsg, connectUserMsg], context);
  assert.ok(connectRes.pendingAction, "Connect follow-up must create pendingAction");
  assert.strictEqual(connectRes.pendingAction.targetUserId, "u_py", "pendingAction must target Py Dev's real user ID 'u_py'");
  console.log("6c Connect Prompt:", connectRes.text);
  console.log("✅ TEST 6 PASSED");
  testPassed++;
  -----------------------
    // TEST 7: Direct Lowercase Prompt "best teammate for ai hackathon" -> EXACTLY 1 CARD
    -----------------------
      console.log("\n--- TEST 7: Direct Lowercase 'best teammate for ai hackathon' ---");
  const t7UserMsg = { role: "user", content: "best teammate for ai hackathon" };
  const t7FinalRes = await callLLM([t7UserMsg, { role: "assistant", content: "Searching..." }, t2ToolMsg], context);

  assert.ok(t7FinalRes.recommendations?.teammates, "T7 must return teammate recommendation");
  assert.strictEqual(t7FinalRes.recommendations.teammates.length, 1, "Direct 'best teammate for ai hackathon' must return EXACTLY 1 teammate card");
  assert.strictEqual(t7FinalRes.recommendations.teammates[0].name, "Py Dev");
  console.log("T7 Best Teammate Selected:", t7FinalRes.recommendations.teammates[0].name);
  console.log("✅ TEST 7 PASSED");
  testPassed++;

  -----------------------
    // TEST 8: Hackathon-Specific Skill Matching (UI/UX Hackathon -> UI Designer selected)
    -----------------------
      console.log("\n--- TEST 8: Hackathon-Specific Skill Matching (UI/UX Design Sprint) ---");
  const uiHackathonContext = {
    ...context,
    hackathon: {
      id: "hack_ui",
      title: "UI/UX Design Sprint",
      skills: ["UI/UX", "Figma", "Design"],
    },
  };
  const t8UserMsg = { role: "user", content: "Best teammate for UI/UX Design Sprint" };
  const t8ToolMsg = { role: "tool", name: "find_teammates", content: JSON.stringify({ count: 6, candidatesAfterFilters: 6, teammates: sampleTeammates }) };
  const t8FinalRes = await callLLM([t8UserMsg, { role: "assistant", content: "Searching..." }, t8ToolMsg], uiHackathonContext);

  assert.ok(t8FinalRes.recommendations?.teammates, "T8 must return teammate recommendation");
  assert.strictEqual(t8FinalRes.recommendations.teammates.length, 1, "T8 must return EXACTLY 1 teammate card");
  assert.strictEqual(t8FinalRes.recommendations.teammates[0].name, "UI Designer", "UI Designer must be selected for UI/UX Design Sprint");
  console.log("T8 Best Teammate for Design Sprint:", t8FinalRes.recommendations.teammates[0].name);
  console.log("✅ TEST 8 PASSED");
  testPassed++;

  -----------------------
    // TEST 9: Exact prompt 'Which teammate best for AI hackathon' and natural variations
    -----------------------
      console.log("\n--- TEST 9: Natural Language Variations for 'Which teammate best for AI hackathon' ---");
  const testPhrases = [
    "Which teammate best for AI hackathon",
    "Which teammate is best for AI hackathon?",
    "Who is the best teammate for AI hackathon?",
    "Best teammate for AI hackathon",
    "Recommend the best teammate for AI hackathon",
    "Who should I choose for AI hackathon?",
    "Who should I team up with for AI hackathon?",
    "Find me the best teammate for AI hackathon",
    "Suggest the best teammate for AI hackathon",
    "Which person is best for my AI hackathon team?",
    "Who would be the strongest teammate for this AI hackathon?"
  ];

  for (const phrase of testPhrases) {
    const msg = { role: "user", content: phrase };
    const res = await callLLM([msg], context);

    // First turn must generate find_teammates tool call, NEVER search_hackathons
    assert.ok(res.toolCalls?.some((tc) => tc.name === "find_teammates"), `Phrase '${phrase}' must generate find_teammates tool call`);
    assert.ok(!res.toolCalls?.some((tc) => tc.name === "search_hackathons"), `Phrase '${phrase}' must NEVER call search_hackathons`);

    // Second turn (with teammate data) must return EXACTLY 1 teammate card and 0 hackathon cards
    const turn2Res = await callLLM([msg, { role: "assistant", content: "Searching..." }, t2ToolMsg], context);
    assert.ok(turn2Res.recommendations?.teammates, `Phrase '${phrase}' must return teammate recommendations`);
    assert.strictEqual(turn2Res.recommendations.teammates.length, 1, `Phrase '${phrase}' must return EXACTLY 1 teammate card`);
    assert.strictEqual(turn2Res.recommendations.hackathons?.length || 0, 0, `Phrase '${phrase}' must return ZERO hackathon cards`);
    assert.strictEqual(turn2Res.recommendations.teammates[0].name, "Py Dev", `Phrase '${phrase}' must select Py Dev`);
  }

  console.log("✅ TEST 9 PASSED (All 11 phrasing variations correctly routed to RECOMMEND_BEST_TEAMMATE)");
  testPassed++;

  console.log(`\n=== RESULT: ${testPassed}/${testTotal + 3} BEST TEAMMATE TESTS PASSED ===`);
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
