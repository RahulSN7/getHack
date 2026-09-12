// server/tests/testComplementaryTeammateSearch.js
const assert = require("assert");

// Import tools and helpers
const { matchesTerm } = require("../tools/findTeammates");
const { callLLM } = require("../services/aiService");

async function runTests() {
  console.log("=== RUNNING COMPLEMENTARY TEAMMATE SEARCH TESTS ===");

  const context = {
    userProfile: {
      id: "main_user_1",
      skills: ["React", "Node.js", "MongoDB", "JavaScript"],
    },
    user: { _id: "main_user_1" },
  };

  // Test 1: Tool Call Generation for prompt "Find teammates who complement my skills."
  console.log("\n1. Testing Tool Call Generation for prompt: 'Find teammates who complement my skills.'");
  const res1 = await callLLM([{ role: "user", content: "Find teammates who complement my skills." }], context);
  assert.ok(res1.toolCalls && res1.toolCalls.length > 0, "Tool call should be generated");
  const toolCall1 = res1.toolCalls.find((tc) => tc.name === "find_teammates");
  assert.ok(toolCall1, "find_teammates tool call should be present");
  assert.strictEqual(toolCall1.args.matchMode, "complementary");
  assert.strictEqual(toolCall1.args.skills, undefined, "No explicit skills array should be passed for complementary search");
  console.log("✅ Tool call generation for complementary search passed.");

  // Test 2: Output Synthesis - Good Complementary Matches Exist
  console.log("\n2. Testing Output Synthesis when good complementary matches exist");
  const mockTeammatesData1 = {
    success: true,
    count: 3,
    totalEligible: 3,
    candidatesAfterFilters: 3,
    hasStrongComplement: true,
    hasWeakComplement: false,
    teammates: [
      { userId: "u1", name: "Py Dev", role: "Machine Learning Engineer", skills: ["Python", "TensorFlow", "PyTorch", "AI"], connectionStatus: "none" },
      { userId: "u2", name: "UI Designer", role: "UI/UX Designer", skills: ["Figma", "UI/UX", "TailwindCSS"], connectionStatus: "none" },
      { userId: "u3", name: "React Dev", role: "Frontend Developer", skills: ["React", "Node.js", "JavaScript"], connectionStatus: "none" },
    ],
  };

  const res2 = await callLLM([
    { role: "user", content: "Find teammates who complement my skills." },
    { role: "assistant", tool_calls: [toolCall1] },
    { role: "tool", name: "find_teammates", content: JSON.stringify(mockTeammatesData1) },
  ], context);

  console.log("Complementary Response Text Output:\n", res2.text);
  assert.strictEqual(res2.recommendations.teammates.length, 3);
  assert.strictEqual(res2.recommendations.teammates[0].name, "Py Dev", "Py Dev should rank top as a strong AI/ML complement");
  assert.strictEqual(res2.text.includes("complement your current stack"), true);
  console.log("✅ Complementary search output synthesis passed.");

  // Test 3: Output Synthesis - Weak Complement (Eligible candidates exist, but none provide new skills)
  console.log("\n3. Testing Output Synthesis when eligible candidates exist but have weak complement");
  const mockTeammatesDataWeak = {
    success: true,
    count: 1,
    totalEligible: 1,
    candidatesAfterFilters: 1,
    hasStrongComplement: false,
    hasWeakComplement: true,
    teammates: [
      { userId: "u3", name: "React Dev", role: "Frontend Developer", skills: ["React", "Node.js", "JavaScript"], connectionStatus: "none" },
    ],
  };

  const resWeak = await callLLM([
    { role: "user", content: "Find teammates who complement my skills." },
    { role: "assistant", tool_calls: [toolCall1] },
    { role: "tool", name: "find_teammates", content: JSON.stringify(mockTeammatesDataWeak) },
  ], context);

  console.log("Weak Complement Response Text Output:\n", resWeak.text);
  assert.strictEqual(resWeak.recommendations.teammates.length, 1);
  assert.strictEqual(resWeak.text.includes("found eligible teammates, but none are a strong complementary match"), true);
  console.log("✅ Weak complement response handling passed.");

  // Test 4: Output Synthesis - Zero Eligible Teammates in Database
  console.log("\n4. Testing Output Synthesis when 0 eligible teammates exist in DB");
  const mockTeammatesDataZero = {
    success: true,
    count: 0,
    totalEligible: 0,
    candidatesAfterFilters: 0,
    hasStrongComplement: false,
    hasWeakComplement: false,
    teammates: [],
  };

  const resZero = await callLLM([
    { role: "user", content: "Find teammates who complement my skills." },
    { role: "assistant", tool_calls: [toolCall1] },
    { role: "tool", name: "find_teammates", content: JSON.stringify(mockTeammatesDataZero) },
  ], context);

  console.log("Zero Teammates Response Text Output:\n", resZero.text);
  assert.strictEqual(resZero.recommendations.teammates.length, 0);
  assert.strictEqual(resZero.text.includes("No eligible teammates are available on getHack right now"), true);
  console.log("✅ Zero eligible teammates handling passed.");

  // Test 5: Regression Test for Explicit Skill Search ("Suggest me teammates of JavaScript.")
  console.log("\n5. Regression Test: Explicit Skill Search ('Suggest me teammates of JavaScript.')");
  const resJS = await callLLM([{ role: "user", content: "Suggest me teammates of JavaScript." }], context);
  const toolCallJS = resJS.toolCalls.find((tc) => tc.name === "find_teammates");
  assert.deepStrictEqual(toolCallJS.args.skills, ["JavaScript"]);
  assert.strictEqual(toolCallJS.args.matchMode, "skill");
  console.log("✅ Explicit skill search regression test passed.");

  console.log("\n🎉 ALL COMPLEMENTARY TEAMMATE SEARCH TESTS PASSED SUCCESSFULLY!");
}

runTests().catch((err) => {
  console.error("❌ TEST FAILED:", err);
  process.exitCode = 1;
});
