// ---------------------------------------------------------------------------
// server/tests/testHackathonFollowUp.js
// Unit/Integration Test Suite for GetHack A1 Hackathon Follow-Up Queries
// ---------------------------------------------------------------------------

const assert = require("assert");
const { callLLM } = require("../services/aiService");

async function runTests() {
  console.log("=== STARTING GET HACK A1 HACKATHON FOLLOW-UP TESTS ===");

  const context = {
    userProfile: {
      id: "user_test_main",
      skills: ["JavaScript", "React", "Node.js", "MongoDB"],
      interests: ["AI", "Web Development"],
    },
    user: { _id: "user_test_main", name: "Test User" },
  };

  const sampleHackathons = [
    {
      id: "hack_101",
      title: "AI & Web Innovation Summit",
      description: "Build cutting edge web applications leveraging AI models.",
      skills: ["JavaScript", "React", "Node.js", "AI"],
      themes: ["AI", "Web Development"],
      registrationDeadline: "2026-10-15T23:59:59.000Z",
      mode: "Online",
    },
    {
      id: "hack_102",
      title: "Python Data Science Challenge",
      description: "Analyze complex datasets using Python and Machine Learning.",
      skills: ["Python", "Machine Learning", "Pandas"],
      themes: ["Data Science", "AI"],
      registrationDeadline: "2026-09-20T23:59:59.000Z",
      mode: "Online",
    },
    {
      id: "hack_103",
      title: "Fullstack JS Hackathon 2026",
      description: "Create real-time fullstack web applications using JavaScript and React.",
      skills: ["JavaScript", "React", "Node.js", "MongoDB"],
      themes: ["Web Development"],
      registrationDeadline: "2026-11-01T23:59:59.000Z",
      mode: "Online",
    },
    {
      id: "hack_104",
      title: "Rust Systems Hackathon",
      description: "Build high-performance systems and backend APIs in Rust.",
      skills: ["Rust", "C++", "Systems"],
      themes: ["Systems"],
      registrationDeadline: "2026-12-01T23:59:59.000Z",
      mode: "Offline",
    },
    {
      id: "hack_105",
      title: "Mobile App Hackathon",
      description: "Build mobile applications using Flutter and Swift.",
      skills: ["Flutter", "Dart", "Swift"],
      themes: ["Mobile"],
      registrationDeadline: "2026-10-01T23:59:59.000Z",
      mode: "Online",
    },
  ];

  let testPassed = 0;
  let testTotal = 7;

  // -------------------------------------------------------------------------
  // TEST 1: Initial Hackathon Search Turn
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 1: User asks 'Suggest me hackathons' ---");
  const turn1UserMsg = { role: "user", content: "Suggest me hackathons" };
  const turn1Res = await callLLM([turn1UserMsg], context);

  assert.ok(turn1Res.toolCalls?.some((tc) => tc.name === "search_hackathons"), "Turn 1 must trigger search_hackathons tool call");
  console.log("Turn 1 Tool Call generated:", turn1Res.toolCalls[0].name);

  // Simulate tool observation turn returning sample hackathons
  const turn1AssistantToolMsg = { role: "assistant", content: `Called tool search_hackathons with {}` };
  const turn1ToolResultMsg = { role: "tool", name: "search_hackathons", content: JSON.stringify({ count: 5, hackathons: sampleHackathons }) };
  const turn1FinalRes = await callLLM([turn1UserMsg, turn1AssistantToolMsg, turn1ToolResultMsg], context);

  const turn1AssistantMsg = {
    role: "assistant",
    content: turn1FinalRes.text,
    recommendations: { hackathons: sampleHackathons },
  };

  console.log("Turn 1 Response:", turn1FinalRes.text);
  console.log("Turn 1 Hackathons saved:", turn1AssistantMsg.recommendations.hackathons.length);
  assert.strictEqual(turn1AssistantMsg.recommendations.hackathons.length, 5);
  console.log("✅ TEST 1 PASSED");
  testPassed++;

  // -------------------------------------------------------------------------
  // TEST 2: Follow-up 'Which one is best?'
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 2: User asks 'Which one is best?' ---");
  const turn2UserMsg = { role: "user", content: "Which one is best?" };
  const messagesTurn2 = [turn1UserMsg, turn1AssistantMsg, turn2UserMsg];

  const turn2Res = await callLLM(messagesTurn2, context);
  console.log("Turn 2 Text:", turn2Res.text);
  console.log("Turn 2 Recommended Hackathon:", turn2Res.recommendations?.hackathons?.[0]?.title);

  assert.ok(!turn2Res.text.includes("Hello! I'm GetHack A1"), "Must NOT return generic greeting");
  assert.strictEqual(turn2Res.recommendations?.hackathons?.length, 1, "Must return single best recommended hackathon card");
  assert.ok(turn2Res.recommendations.hackathons[0].id === "hack_101" || turn2Res.recommendations.hackathons[0].id === "hack_103", "Must pick top JavaScript/React match from previous results");
  console.log("✅ TEST 2 PASSED");
  testPassed++;

  const turn2AssistantMsg = {
    role: "assistant",
    content: turn2Res.text,
    recommendations: turn2Res.recommendations,
  };

  // -------------------------------------------------------------------------
  // TEST 3: Follow-up 'Why?'
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 3: User asks 'Why?' ---");
  const turn3UserMsg = { role: "user", content: "Why?" };
  const messagesTurn3 = [turn1UserMsg, turn1AssistantMsg, turn2UserMsg, turn2AssistantMsg, turn3UserMsg];

  const turn3Res = await callLLM(messagesTurn3, context);
  console.log("Turn 3 Text:", turn3Res.text);

  assert.ok(turn3Res.text.includes("fit") || turn3Res.text.includes("strongest") || turn3Res.text.includes("aligns"), "Must explain why selected hackathon is best");
  assert.strictEqual(turn3Res.recommendations?.hackathons?.length, 1);
  console.log("✅ TEST 3 PASSED");
  testPassed++;

  // -------------------------------------------------------------------------
  // TEST 4: Fresh Conversation - 'Which hackathon is best for me?' (No previous context)
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 4: Fresh conversation - 'Which hackathon is best for me?' ---");
  const freshUserMsg = { role: "user", content: "Which hackathon is best for me?" };

  const freshRes = await callLLM([freshUserMsg], context);
  console.log("Fresh Query Result:", freshRes.toolCalls ? "Triggered Tool Search" : freshRes.text);

  assert.ok(freshRes.toolCalls?.some((tc) => tc.name === "search_hackathons"), "Fresh query without previous context must trigger search_hackathons");
  console.log("✅ TEST 4 PASSED");
  testPassed++;

  // -------------------------------------------------------------------------
  // TEST 5: 'Which one is best for Python?' follow-up
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 5: Follow-up 'Which one is best for Python?' ---");
  const turn5UserMsg = { role: "user", content: "Which one is best for Python?" };
  const messagesTurn5 = [turn1UserMsg, turn1AssistantMsg, turn5UserMsg];

  const turn5Res = await callLLM(messagesTurn5, context);
  console.log("Turn 5 Text:", turn5Res.text);
  console.log("Turn 5 Hackathon:", turn5Res.recommendations?.hackathons?.[0]?.title);

  assert.strictEqual(turn5Res.recommendations?.hackathons?.length, 1);
  assert.strictEqual(turn5Res.recommendations.hackathons[0].id, "hack_102", "Must pick Python challenge from previous results");
  console.log("✅ TEST 5 PASSED");
  testPassed++;

  // -------------------------------------------------------------------------
  // TEST 6: 'Which one has the earliest deadline?' follow-up
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 6: Follow-up 'Which one has the earliest deadline?' ---");
  const turn6UserMsg = { role: "user", content: "Which one has the earliest deadline?" };
  const messagesTurn6 = [turn1UserMsg, turn1AssistantMsg, turn6UserMsg];

  const turn6Res = await callLLM(messagesTurn6, context);
  console.log("Turn 6 Text:", turn6Res.text);
  console.log("Turn 6 Hackathon:", turn6Res.recommendations?.hackathons?.[0]?.title);

  assert.strictEqual(turn6Res.recommendations?.hackathons?.length, 1);
  assert.strictEqual(turn6Res.recommendations.hackathons[0].id, "hack_102", "Must pick hack_102 (deadline Sept 20)");
  console.log("✅ TEST 6 PASSED");
  testPassed++;

  // -------------------------------------------------------------------------
  // TEST 7: Positional Reference 'Tell me about the second one.'
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 7: Follow-up 'Tell me about the second one.' ---");
  const turn7UserMsg = { role: "user", content: "Tell me about the second one." };
  const messagesTurn7 = [turn1UserMsg, turn1AssistantMsg, turn7UserMsg];

  const turn7Res = await callLLM(messagesTurn7, context);
  console.log("Turn 7 Text:", turn7Res.text);
  console.log("Turn 7 Hackathon:", turn7Res.recommendations?.hackathons?.[0]?.title);

  assert.strictEqual(turn7Res.recommendations?.hackathons?.length, 1);
  assert.strictEqual(turn7Res.recommendations.hackathons[0].id, "hack_102", "Must map second one to index 1 (hack_102)");
  console.log("✅ TEST 7 PASSED");
  testPassed++;

  console.log(`\n🎉 SUMMARY: ${testPassed}/${testTotal} HACKATHON FOLLOW-UP TESTS PASSED!`);
}

runTests().catch((err) => {
  console.error("❌ Test error:", err);
  process.exit(1);
});
