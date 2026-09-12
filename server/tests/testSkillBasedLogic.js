// server/tests/testSkillBasedLogic.js
const assert = require("assert");

// Import target tools and helpers
const { matchesTerm, SKILL_SYNONYMS, getSynonyms } = require("../tools/findTeammates");
const { callLLM } = require("../services/aiService");

async function runUnitTests() {
  console.log("=== RUNNING SKILL-BASED UNIT TESTS (OFFLINE LOGIC) ===");

  // 1. Test Skill Synonym matching & term matching
  console.log("\n1. Testing Skill Synonym Matching...");
  assert.strictEqual(matchesTerm(["JavaScript", "React", "Node.js"], "js"), true);
  assert.strictEqual(matchesTerm(["JavaScript", "React", "Node.js"], "JavaScript"), true);
  assert.strictEqual(matchesTerm(["JavaScript", "React", "Node.js"], "python"), false);
  assert.strictEqual(matchesTerm(["Python", "TensorFlow"], "py"), true);
  assert.strictEqual(matchesTerm(["C++"], "cpp"), true);
  console.log("✅ Synonym matching passed.");

  // 2. Test LLM Tool Call Generation for prompt "Suggest me teammates of JavaScript."
  console.log("\n2. Testing Tool Call Generation for prompt: 'Suggest me teammates of JavaScript.'");
  const context = {
    userProfile: { id: "user123", skills: ["React"] },
    user: { _id: "user123" }
  };

  const res1 = await callLLM([{ role: "user", content: "Suggest me teammates of JavaScript." }], context);
  assert.ok(res1.toolCalls && res1.toolCalls.length > 0, "Tool call should be generated");
  const toolCall1 = res1.toolCalls.find(tc => tc.name === "find_teammates");
  assert.ok(toolCall1, "find_teammates tool call should be present");
  assert.deepStrictEqual(toolCall1.args.skills, ["JavaScript"]);
  assert.strictEqual(toolCall1.args.matchMode, "skill");
  console.log("✅ Tool call generation for 'Suggest me teammates of JavaScript.' passed.");

  // 3. Test LLM Tool Call Generation for prompt "Find teammates who know JS."
  console.log("\n3. Testing Tool Call Generation for prompt: 'Find teammates who know JS.'");
  const res2 = await callLLM([{ role: "user", content: "Find teammates who know JS." }], context);
  const toolCall2 = res2.toolCalls.find(tc => tc.name === "find_teammates");
  assert.ok(toolCall2, "find_teammates tool call should be present");
  assert.deepStrictEqual(toolCall2.args.skills, ["JavaScript"]);
  console.log("✅ Tool call generation for 'Find teammates who know JS.' passed.");

  // 4. Test Output Synthesis - CASE 1 (Matching teammates exist)
  console.log("\n4. Testing Output Synthesis - Case 1 (Matching candidates exist)");
  const mockTeammatesDataCase1 = {
    success: true,
    count: 2,
    totalEligible: 5,
    candidatesAfterFilters: 2,
    hasUnavailableMatches: false,
    teammates: [
      { userId: "u1", name: "Rahul", role: "Full Stack Developer", skills: ["JavaScript", "React"] },
      { userId: "u2", name: "Aman", role: "Frontend Engineer", skills: ["JavaScript", "Vue"] }
    ]
  };

  const resCase1 = await callLLM([
    { role: "user", content: "Suggest me teammates of JavaScript." },
    { role: "assistant", tool_calls: [toolCall1] },
    { role: "tool", name: "find_teammates", content: JSON.stringify(mockTeammatesDataCase1) }
  ], context);

  console.log("Case 1 Text Output:", resCase1.text);
  assert.strictEqual(resCase1.recommendations.teammates.length, 2);
  assert.strictEqual(resCase1.text.includes("JavaScript"), true);
  console.log("✅ Case 1 passed.");

  // 5. Test Output Synthesis - CASE 2 (No matching teammates exist)
  console.log("\n5. Testing Output Synthesis - Case 2 (No matching candidates exist)");
  const mockTeammatesDataCase2 = {
    success: true,
    count: 0,
    totalEligible: 5,
    candidatesAfterFilters: 0,
    hasUnavailableMatches: false,
    teammates: []
  };

  const resCase2 = await callLLM([
    { role: "user", content: "Suggest me teammates of JavaScript." },
    { role: "assistant", tool_calls: [toolCall1] },
    { role: "tool", name: "find_teammates", content: JSON.stringify(mockTeammatesDataCase2) }
  ], context);

  console.log("Case 2 Text Output:", resCase2.text);
  assert.strictEqual(resCase2.recommendations.teammates.length, 0);
  assert.strictEqual(resCase2.text.includes("couldn't find any available teammates with JavaScript skills"), true);
  console.log("✅ Case 2 passed.");

  // 6. Test Output Synthesis - CASE 3 (Matching skill exists but users NOT AVAILABLE)
  console.log("\n6. Testing Output Synthesis - Case 3 (Users exist with skill, but not available)");
  const mockTeammatesDataCase3 = {
    success: true,
    count: 0,
    totalEligible: 5,
    candidatesAfterFilters: 0,
    hasUnavailableMatches: true,
    teammates: []
  };

  const resCase3 = await callLLM([
    { role: "user", content: "Suggest me teammates of JavaScript." },
    { role: "assistant", tool_calls: [toolCall1] },
    { role: "tool", name: "find_teammates", content: JSON.stringify(mockTeammatesDataCase3) }
  ], context);

  console.log("Case 3 Text Output:", resCase3.text);
  assert.strictEqual(resCase3.recommendations.teammates.length, 0);
  assert.strictEqual(resCase3.text.includes("found users with JavaScript skills, but no JavaScript teammates are available"), true);
  console.log("✅ Case 3 passed.");

  // 7. Test Output Synthesis - CASE 4 (Rust skill test, 0 matching candidates)
  console.log("\n7. Testing Output Synthesis - Case 4 (Rust skill request, 0 matches)");
  const resRustTool = await callLLM([{ role: "user", content: "Find Rust teammates." }], context);
  const toolCallRust = resRustTool.toolCalls.find(tc => tc.name === "find_teammates");
  assert.deepStrictEqual(toolCallRust.args.skills, ["Rust"]);

  const resRustFinal = await callLLM([
    { role: "user", content: "Find Rust teammates." },
    { role: "assistant", tool_calls: [toolCallRust] },
    { role: "tool", name: "find_teammates", content: JSON.stringify(mockTeammatesDataCase2) }
  ], context);

  console.log("Rust Search Text Output:", resRustFinal.text);
  assert.strictEqual(resRustFinal.recommendations.teammates.length, 0);
  assert.strictEqual(resRustFinal.text.includes("couldn't find any available teammates with Rust skills"), true);
  console.log("✅ Rust search test passed.");

  console.log("\n🎉 ALL UNIT TESTS PASSED SUCCESSFULLY!");
}

runUnitTests().catch(err => {
  console.error("❌ UNIT TEST FAILED:", err);
  process.exitCode = 1;
});
