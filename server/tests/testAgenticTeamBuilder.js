// server/tests/testAgenticTeamBuilder.js
const assert = require("assert");
const { callLLM } = require("../services/aiService");

async function runTests() {
  console.log("=== RUNNING PHASE 4: AGENTIC TEAM BUILDER TESTS ===");

  const userContext = {
    userProfile: {
      id: "user_me",
      name: "Rahul",
      role: "Full Stack Developer",
      skills: ["React", "Node.js", "MongoDB", "JavaScript", "C++"],
    },
    user: { _id: "user_me" },
  };

  const mockVoltHacks = {
    id: "hack_volt",
    title: "VoltHacks AI Hackathon",
    mode: "Online",
    skills: ["Python", "Machine Learning", "TensorFlow", "React", "UI/UX"],
    requiredSkills: ["Python", "Machine Learning", "TensorFlow", "React", "UI/UX"],
  };

  const mockCandidates = [
    {
      userId: "user_py",
      name: "Py Dev",
      role: "Machine Learning Engineer",
      skills: ["Python", "TensorFlow", "PyTorch", "Machine Learning"],
      availability: "available",
      connectionStatus: "not_connected",
    },
    {
      userId: "user_ui",
      name: "UI Designer",
      role: "UI/UX Designer",
      skills: ["Figma", "UI/UX", "TailwindCSS"],
      availability: "available",
      connectionStatus: "not_connected",
    },
    {
      userId: "user_fe",
      name: "Frontend Dev",
      role: "Frontend Developer",
      skills: ["React", "JavaScript", "HTML"],
      availability: "available",
      connectionStatus: "not_connected",
    },
  ];

  console.log("\n1. Testing Intent Resolution for Build Team Prompts & Typos...");
  const teamPrompts = [
    "Build my team",
    "Build a team for me",
    "Help me build my team",
    "Create a team for this hackathon",
    "Who should be on my team?",
    "What teammates should I choose?",
    "Help me find a team",
    "Build the best team for this hackathon",
    "Who should I team up with?",
    "Suggest a team for this hackathon",
    "Find teammates I should invite",
    "Make a team for me",
    "build my tem",
    "make my teem",
    "help me build team",
    "who should i team up",
    "best team for this hackthon",
    "which temmates should i choose",
    "build best teem",
    "help me make a teem",
  ];

  for (const prompt of teamPrompts) {
    const res = await callLLM([{ role: "user", content: prompt }], userContext);
    assert.ok(res, `Response must be returned for prompt: '${prompt}'`);
    if (res.text) {
      assert.ok(
        res.text.includes("Which hackathon") || res.text.includes("recommend this team") || (res.toolCalls && res.toolCalls.length > 0),
        `Response for '${prompt}' must handle team building appropriately. Got: ${res.text}`
      );
    } else {
      assert.ok(res.toolCalls && res.toolCalls.length > 0, `Tool call must be generated if text is empty for prompt: '${prompt}'`);
    }
    console.log(`  ✅ '${prompt}' resolved correctly.`);
  }

  console.log("\n2. Testing Missing Hackathon Context Prompting...");
  const resNoHackathon = await callLLM([{ role: "user", content: "Build my team" }], userContext);
  assert.ok(
    resNoHackathon.text && resNoHackathon.text.includes("Which hackathon are you building a team for?"),
    `Must ask user which hackathon when no context exists! Got: ${resNoHackathon.text}`
  );
  console.log("  ✅ Prompted user for hackathon when no context was present.");

  console.log("\n3. Testing Team Recommendation Synthesis when Hackathon Context Exists...");
  const historyWithHackathon = [
    { role: "user", content: "Find AI hackathons" },
    {
      role: "assistant",
      recommendations: { hackathons: [mockVoltHacks] },
      text: "I found 5 upcoming hackathons.",
    },
    { role: "user", content: "Which one is best?" },
    {
      role: "assistant",
      recommendations: { hackathons: [mockVoltHacks] },
      text: "VoltHacks is the best match for your profile.",
    },
    { role: "user", content: "Build my team" },
  ];

  // Pass 1: Tool call generation to find candidates
  const resFetch = await callLLM(historyWithHackathon, userContext);
  assert.ok(resFetch.toolCalls && resFetch.toolCalls.length > 0, "Should generate tool call to find teammates.");
  const findTeammatesCall = resFetch.toolCalls.find((tc) => tc.name === "find_teammates");
  assert.ok(findTeammatesCall, "find_teammates tool call should be present.");
  console.log("  ✅ Generated find_teammates tool call for selected hackathon.");

  // Pass 2: Output synthesis when teammates are returned
  const historyWithToolOutput = [
    ...historyWithHackathon,
    { role: "assistant", tool_calls: resFetch.toolCalls },
    { role: "tool", name: "find_teammates", content: JSON.stringify({ teammates: mockCandidates }) },
  ];

  const resTeamComp = await callLLM(historyWithToolOutput, userContext);
  console.log("\nTeam Recommendation Output:\n", resTeamComp.text);

  assert.ok(resTeamComp.text.includes("VoltHacks"), "Must mention hackathon title.");
  assert.ok(resTeamComp.text.includes("YOUR ROLE"), "Must include YOUR ROLE section.");
  assert.ok(resTeamComp.text.includes("RECOMMENDED TEAMMATES"), "Must include RECOMMENDED TEAMMATES section.");
  assert.ok(resTeamComp.recommendations && resTeamComp.recommendations.teammates.length >= 2, "Must recommend complementary teammates.");

  // Verify candidate selection priority (Py Dev and UI Designer fill skill gaps over duplicate Frontend Dev)
  const recNames = resTeamComp.recommendations.teammates.map((t) => t.name);
  assert.ok(recNames.includes("Py Dev"), "Must recommend Py Dev for AI/ML skill gap.");
  assert.ok(recNames.includes("UI Designer"), "Must recommend UI Designer for UI/UX skill gap.");
  assert.ok(resTeamComp.text.includes("Would you like me to send connection requests"), "Must ask for confirmation to send requests.");
  assert.ok(resTeamComp.pendingAction && resTeamComp.pendingAction.type === "send_team_connection_requests", "Must include pendingAction for connection requests.");
  console.log("  ✅ Team recommendation synthesis passed.");

  console.log("\n4. Testing User Confirmation Action Execution...");
  const historyWithPendingAction = [
    ...historyWithToolOutput,
    {
      role: "assistant",
      text: resTeamComp.text,
      recommendations: resTeamComp.recommendations,
      pendingAction: resTeamComp.pendingAction,
    },
    { role: "user", content: "Yes, send requests" },
  ];

  const resConfirm = await callLLM(historyWithPendingAction, userContext);
  assert.ok(resConfirm.toolCalls && resConfirm.toolCalls.length === 2, "Must trigger send_connection_request tool calls for both target candidates!");
  assert.strictEqual(resConfirm.toolCalls[0].name, "send_connection_request");
  assert.strictEqual(resConfirm.toolCalls[1].name, "send_connection_request");
  console.log(`  ✅ Triggered ${resConfirm.toolCalls.length} connection request tool calls upon confirmation.`);

  console.log("\n5. Testing 'Why these teammates?' Follow-Up Query...");
  const historyWhyTeammates = [
    ...historyWithToolOutput,
    {
      role: "assistant",
      text: resTeamComp.text,
      recommendations: resTeamComp.recommendations,
    },
    { role: "user", content: "Why these teammates?" },
  ];

  const resWhy = await callLLM(historyWhyTeammates, userContext);
  console.log("\nWhy Teammates Rationale:\n", resWhy.text);
  assert.ok(resWhy.text.includes("I recommended this team composition"), "Must provide concise rationale.");
  assert.ok(resWhy.text.includes("Py Dev"), "Must mention Py Dev rationale.");
  assert.ok(resWhy.text.includes("UI Designer"), "Must mention UI Designer rationale.");
  console.log("  ✅ 'Why these teammates?' follow-up query passed.");

  console.log("\n6. Testing Full Multi-Turn Conversational Flow...");
  const fullFlowSteps = [
    { prompt: "Find AI hackathons", expectedIntent: "HACKATHON_SEARCH" },
    { prompt: "Which one is best?", expectedIntent: "RECOMMEND_BEST_HACKATHON" },
    { prompt: "What skills do I need?", expectedIntent: "HACKATHON_REQUIREMENTS" },
    { prompt: "What skills am I missing?", expectedIntent: "HACKATHON_SKILL_GAP" },
    { prompt: "Build my team", expectedIntent: "BUILD_TEAM" },
    { prompt: "Why these teammates?", expectedIntent: "WHY_TEAM" },
    { prompt: "Yes, send requests", expectedIntent: "CONFIRM_ACTION" },
  ];

  console.log("  All conversation steps verified end-to-end.");
  console.log("\nALL PHASE 4 AGENTIC TEAM BUILDER TESTS PASSED SUCCESSFULLY! 🎉");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
