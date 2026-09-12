// server/tests/testSuggestMeHackathon.js
const assert = require("assert");

// Import tools & services
const { callLLM } = require("../services/aiService");

async function runTests() {
  console.log("=== RUNNING SUGGEST ME HACKATHON TESTS ===");

  const context = {
    userProfile: {
      id: "user_test_1",
      skills: ["JavaScript", "React", "Node.js", "MongoDB"],
    },
    user: { _id: "user_test_1" },
  };

  const testPrompts = [
    "suggest me hacathon",
    "suggest me hackathons",
    "recommend hackathons for me",
    "find hackathons for me",
    "suggest AI hackathons",
    "suggest JavaScript hackathons",
    "suggest React hackathons",
    "suggest online hackathons",
    "suggest hackathons in India",
    "suggest hackathons for React and Node.js",
    "suggest AI hackathons where I can use JavaScript",
    "which hackathon should I participate in?",
    "Find online A1 hackathons for me.",
  ];

  console.log("\n1. Testing Tool Call Generation for all natural language prompts & typos...");

  for (const prompt of testPrompts) {
    const res = await callLLM([{ role: "user", content: prompt }], context);
    assert.ok(res.toolCalls && res.toolCalls.length > 0, `Tool call should be generated for prompt: '${prompt}'`);
    const toolCall = res.toolCalls.find((tc) => tc.name === "search_hackathons");
    assert.ok(toolCall, `search_hackathons tool call must be present for prompt: '${prompt}'`);
    console.log(`  ✅ '${prompt}' -> search_hackathons(${JSON.stringify(toolCall.args)})`);
  }

  console.log("\n2. Testing Output Synthesis when matching hackathons exist...");
  const mockSearchDataSuccess = {
    success: true,
    count: 3,
    totalAvailable: 5,
    hasExactProfileMatch: true,
    hackathons: [
      { id: "h1", title: "AI Innovation Challenge", mode: "Online", registrationUrl: "https://gethack.test/h1" },
      { id: "h2", title: "React & Web3 Hackathon", mode: "Online", registrationUrl: "https://gethack.test/h2" },
      { id: "h3", title: "Full Stack Buildathon", mode: "Offline", location: "Delhi, India" },
    ],
  };

  const toolCallObj = { name: "search_hackathons", args: { limit: 20, status: "registration_open" } };

  const resFinal1 = await callLLM(
    [
      { role: "user", content: "suggest me hacathon" },
      { role: "assistant", tool_calls: [toolCallObj] },
      { role: "tool", name: "search_hackathons", content: JSON.stringify(mockSearchDataSuccess) },
    ],
    context
  );

  console.log("Response text:\n", resFinal1.text);
  assert.strictEqual(resFinal1.recommendations.hackathons.length, 3);
  assert.strictEqual(resFinal1.text.includes("I found 3 upcoming hackathons"), true);
  assert.strictEqual(resFinal1.text.includes("As GetHack AI"), false, "Must NOT output generic helper text!");
  console.log("✅ Output synthesis for 'suggest me hacathon' passed.");

  console.log("\n3. Testing Output Synthesis when 0 hackathons exist in DB...");
  const mockSearchDataZero = {
    success: true,
    count: 0,
    totalAvailable: 0,
    hasExactProfileMatch: false,
    hackathons: [],
  };

  const resZero = await callLLM(
    [
      { role: "user", content: "suggest me hackathons" },
      { role: "assistant", tool_calls: [toolCallObj] },
      { role: "tool", name: "search_hackathons", content: JSON.stringify(mockSearchDataZero) },
    ],
    context
  );

  console.log("Zero Hackathons Response text:\n", resZero.text);
  assert.strictEqual(resZero.recommendations.hackathons.length, 0);
  assert.strictEqual(resZero.text.includes("No upcoming hackathons are available on getHack right now"), true);
  console.log("✅ Zero hackathons handling passed.");

  console.log("\n4. Testing Output Synthesis when hackathons exist but weak exact profile match...");
  const mockSearchDataWeakMatch = {
    success: true,
    count: 2,
    totalAvailable: 2,
    hasExactProfileMatch: false,
    hackathons: [
      { id: "h4", title: "Cybersecurity Summit Hackathon", mode: "Online" },
      { id: "h5", title: "Climate Tech Hackathon", mode: "Online" },
    ],
  };

  const resWeak = await callLLM(
    [
      { role: "user", content: "suggest me hackathons" },
      { role: "assistant", tool_calls: [toolCallObj] },
      { role: "tool", name: "search_hackathons", content: JSON.stringify(mockSearchDataWeakMatch) },
    ],
    context
  );

  console.log("Weak Profile Match Response text:\n", resWeak.text);
  assert.strictEqual(resWeak.recommendations.hackathons.length, 2);
  assert.strictEqual(resWeak.text.includes("closest upcoming hackathons currently available"), true);
  console.log("✅ Weak profile match handling passed.");

  console.log("\n🎉 ALL SUGGEST ME HACKATHON TESTS PASSED SUCCESSFULLY!");
}

runTests().catch((err) => {
  console.error("❌ TEST FAILED:", err);
  process.exitCode = 1;
});
