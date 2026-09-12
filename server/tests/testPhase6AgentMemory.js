const assert = require("assert");
const {
  understandUserQuery,
  generateFallbackResponse,
  extractStructuredContext,
  extractOrdinalIndices,
  isContextResetCommand,
  checkAmbiguousReference,
} = require("../services/aiService");

async function runPhase6Tests() {
  console.log("=== RUNNING PHASE 6: AGENT MEMORY & CONTEXTUAL INTELLIGENCE TESTS ===\n");

  const sampleHackathons = [
    {
      id: "hack_ai_101",
      _id: "hack_ai_101",
      title: "VoltHacks AI Challenge",
      name: "VoltHacks AI Challenge",
      organizerName: "VoltTech",
      description: "Build cutting-edge AI and ML solutions.",
      skills: ["AI", "Python", "Machine Learning", "React"],
      requiredSkills: ["AI", "Python", "Machine Learning", "React"],
      mode: "Online",
      registrationDeadline: "2026-10-15T00:00:00.000Z",
    },
    {
      id: "hack_react_202",
      _id: "hack_react_202",
      title: "React Web Summit Hackathon",
      name: "React Web Summit Hackathon",
      organizerName: "React Global",
      description: "Build innovative web frontends using modern React.",
      skills: ["React", "JavaScript", "UI/UX", "TailwindCSS"],
      requiredSkills: ["React", "JavaScript", "UI/UX", "TailwindCSS"],
      mode: "Online",
      registrationDeadline: "2026-11-01T00:00:00.000Z",
    },
    {
      id: "hack_cloud_303",
      _id: "hack_cloud_303",
      title: "Cloud Native Hack",
      name: "Cloud Native Hack",
      organizerName: "DevOps World",
      description: "Distributed computing and microservices.",
      skills: ["DevOps", "Docker", "Node.js", "C++"],
      requiredSkills: ["DevOps", "Docker", "Node.js", "C++"],
      mode: "Online",
      registrationDeadline: "2026-12-01T00:00:00.000Z",
    },
  ];

  const sampleTeammates = [
    {
      userId: "user_py_1",
      id: "user_py_1",
      name: "Py Dev",
      role: "Machine Learning Engineer",
      skills: ["Python", "TensorFlow", "PyTorch", "Machine Learning"],
      availability: "available",
      connectionStatus: "not_connected",
    },
    {
      userId: "user_ui_2",
      id: "user_ui_2",
      name: "UI Designer",
      role: "UI/UX Designer",
      skills: ["Figma", "UI/UX", "TailwindCSS", "Design"],
      availability: "available",
      connectionStatus: "not_connected",
    },
    {
      userId: "user_fe_3",
      id: "user_fe_3",
      name: "Frontend Developer",
      role: "Frontend Engineer",
      skills: ["React", "TypeScript", "JavaScript", "HTML/CSS"],
      availability: "available",
      connectionStatus: "not_connected",
    },
  ];

  const userProfile = {
    userId: "user_me",
    id: "user_me",
    name: "Current Developer",
    skills: ["React", "JavaScript", "Node.js"],
    interests: ["AI", "Web Development"],
    role: "Full Stack Developer",
  };

  // 1. Structured Context Extraction
  console.log("1. Testing Structured Agent Context Extraction...");
  const mockMessages = [
    { role: "user", content: "Find AI hackathons" },
    {
      role: "assistant",
      content: "I found hackathons",
      recommendations: { hackathons: sampleHackathons },
    },
  ];
  const structuredCtx = extractStructuredContext(mockMessages);
  assert.strictEqual(structuredCtx.previousHackathons.length, 3, "Should extract previous hackathons list");
  assert.strictEqual(structuredCtx.previousHackathons[0].id, "hack_ai_101", "Should preserve real ID");
  console.log("  ✅ Structured context extraction passed.");

  // 2. Ordinal Reference Resolution
  console.log("\n2. Testing Ordinal Reference Resolution...");
  const singleOrd = extractOrdinalIndices("Tell me about the second one", 3);
  assert.deepStrictEqual(singleOrd, [1], "Should parse 2nd item index [1]");

  const multiOrd = extractOrdinalIndices("Connect me with the first two", 3);
  assert.deepStrictEqual(multiOrd, [0, 1], "Should parse first two indices [0, 1]");

  const ordinalResp = generateFallbackResponse(
    [{ role: "user", content: "Tell me about the second one" }],
    { userProfile }
  );
  // Using conversation messages with previousHackathons
  const ordinalRespWithHistory = generateFallbackResponse(
    [
      { role: "user", content: "Find hackathons" },
      { role: "assistant", content: "Here are 3 hackathons", recommendations: { hackathons: sampleHackathons } },
      { role: "user", content: "Tell me about the second one" },
    ],
    { userProfile }
  );
  assert(ordinalRespWithHistory.text.includes("React Web Summit Hackathon"), "Should describe second hackathon (React Web Summit)");
  console.log("  ✅ Ordinal reference resolution passed.");

  // 3. Anaphoric Pronoun Resolution ("this hackathon", "him", "her", "them")
  console.log("\n3. Testing Anaphoric Pronoun Resolution...");
  const reqResp = generateFallbackResponse(
    [
      { role: "user", content: "Find hackathons" },
      { role: "assistant", content: "Here is VoltHacks", recommendations: { hackathons: [sampleHackathons[0]] } },
      { role: "user", content: "What skills does this require?" },
    ],
    { userProfile }
  );
  assert(reqResp.text.includes("VoltHacks AI Challenge"), "Should resolve 'this' to VoltHacks");
  assert(reqResp.text.includes("Python"), "Should display required skills for VoltHacks");
  console.log("  ✅ Anaphoric hackathon reference resolution passed.");

  const connectHimResp = generateFallbackResponse(
    [
      { role: "user", content: "Find teammates" },
      { role: "assistant", content: "Here is Py Dev", recommendations: { teammates: [sampleTeammates[0]] } },
      { role: "user", content: "Connect me with him" },
    ],
    { userProfile }
  );
  assert(connectHimResp.text.includes("Py Dev"), "Should resolve 'him' to Py Dev");
  assert.strictEqual(connectHimResp.pendingAction.targetUserId, "user_py_1", "Should preserve exact real target user ID");
  console.log("  ✅ Anaphoric teammate reference ('him') passed.");

  // 4. Multiple Teammate Connections ("the first two", "second and third")
  console.log("\n4. Testing Multiple Teammate Connection Requests...");
  const multiConnResp = generateFallbackResponse(
    [
      { role: "user", content: "Find teammates" },
      { role: "assistant", content: "Here are candidates", recommendations: { teammates: sampleTeammates } },
      { role: "user", content: "Connect me with the first two" },
    ],
    { userProfile }
  );
  assert(multiConnResp.text.includes("Py Dev and UI Designer"), "Should prompt to connect with Py Dev and UI Designer");
  assert.strictEqual(multiConnResp.pendingAction.type, "send_team_connection_requests");
  assert.deepStrictEqual(multiConnResp.pendingAction.targetUserIds, ["user_py_1", "user_ui_2"]);
  console.log("  ✅ Multiple teammate connection requests passed.");

  // 5. Ambiguity Resolution (CRITICAL RULE #6: Do not guess when ambiguous)
  console.log("\n5. Testing Ambiguity Resolution...");
  const ambiguousResp = generateFallbackResponse(
    [
      { role: "user", content: "Find two hackathons" },
      { role: "assistant", content: "Here are hackathons", recommendations: { hackathons: sampleHackathons.slice(0, 2) } },
      { role: "user", content: "Tell me about it" },
    ],
    { userProfile }
  );
  assert(ambiguousResp.text.includes("Which hackathon do you mean"), "Should prompt clarification for ambiguous 'it'");
  assert(ambiguousResp.text.includes("VoltHacks AI Challenge") && ambiguousResp.text.includes("React Web Summit Hackathon"), "Should list candidate options");
  console.log("  ✅ Ambiguity resolution clarification prompt passed.");

  // 6. Context Switching
  console.log("\n6. Testing Context Switching...");
  const contextSwitchSeq = [
    { role: "user", content: "Find AI hackathons" },
    { role: "assistant", content: "Here are AI hackathons", recommendations: { hackathons: [sampleHackathons[0]] } },
    { role: "user", content: "Which one is best?" },
    { role: "assistant", content: "VoltHacks is best", recommendations: { hackathons: [sampleHackathons[0]] } },
    // User switches search query
    { role: "user", content: "Find React hackathons" },
    { role: "assistant", content: "Here are React hackathons", recommendations: { hackathons: [sampleHackathons[1]] } },
    { role: "user", content: "Which one is best?" },
  ];

  const switchResp = generateFallbackResponse(contextSwitchSeq, { userProfile });
  assert(switchResp.text.includes("React Web Summit Hackathon"), "Should evaluate newly searched React hackathon, not old AI hackathon");
  console.log("  ✅ Context switching passed.");

  // 7. Context Reset Commands
  console.log("\n7. Testing Context Reset Commands...");
  assert(isContextResetCommand("Start over"), "Should recognize 'Start over'");
  assert(isContextResetCommand("clear context"), "Should recognize 'clear context'");

  const resetResp = generateFallbackResponse(
    [
      { role: "user", content: "Find hackathons" },
      { role: "assistant", content: "Here are hackathons", recommendations: { hackathons: sampleHackathons } },
      { role: "user", content: "Start over" },
    ],
    { userProfile }
  );
  assert(resetResp.text.includes("Context cleared!"), "Should confirm context reset");
  console.log("  ✅ Context reset commands passed.");

  // 8. Grammar & Spelling Tolerance with Context
  console.log("\n8. Testing Grammar & Spelling Tolerance with Context...");
  const typoReqResp = generateFallbackResponse(
    [
      { role: "user", content: "Find hackathons" },
      { role: "assistant", content: "Here is VoltHacks", recommendations: { hackathons: [sampleHackathons[0]] } },
      { role: "user", content: "what skill i need for this hackthon" },
    ],
    { userProfile }
  );
  assert(typoReqResp.text.includes("VoltHacks AI Challenge"), "Should handle typos ('skill i need for this hackthon')");

  const typoConnectResp = generateFallbackResponse(
    [
      { role: "user", content: "Find teammates" },
      { role: "assistant", content: "Here is Py Dev", recommendations: { teammates: [sampleTeammates[0]] } },
      { role: "user", content: "connect me wid him" },
    ],
    { userProfile }
  );
  assert(typoConnectResp.text.includes("Py Dev"), "Should handle typo 'connect me wid him'");
  console.log("  ✅ Grammar and spelling tolerance with context passed.");

  // 9. Context Debug Mode
  console.log("\n9. Testing Context Debug Mode...");
  const debugResp = generateFallbackResponse(
    [
      { role: "user", content: "Find hackathons" },
      { role: "assistant", content: "Here is VoltHacks", recommendations: { hackathons: [sampleHackathons[0]] } },
      { role: "user", content: "debug context" },
    ],
    { userProfile, debug: true }
  );
  assert(debugResp.debugContext, "Should contain debugContext object");
  assert(debugResp.text.includes("Selected Hackathon:"), "Should present developer debug text representation");
  console.log("  ✅ Context debug mode passed.");

  // 10. Complete Multi-Turn Conversational Flow (Requirement #22)
  console.log("\n10. Testing Complete Multi-Turn Conversational Flow...");

  let history = [];

  // Step 1: Find AI hackathons
  history.push({ role: "user", content: "Find AI hackathons" });
  let step1 = generateFallbackResponse(history, { userProfile });
  assert(step1.toolCalls, "Step 1 should execute search_hackathons tool call");

  // Simulate tool response
  history.push({ role: "tool", name: "search_hackathons", content: JSON.stringify({ hackathons: sampleHackathons }) });
  history.push({ role: "assistant", content: "Found 3 hackathons", recommendations: { hackathons: sampleHackathons } });

  // Step 2: Which one is best?
  history.push({ role: "user", content: "Which one is best?" });
  let step2 = generateFallbackResponse(history, { userProfile });
  assert(step2.recommendations.hackathons.length === 1, "Step 2 should recommend 1 best hackathon");
  const selectedHackTitle = step2.recommendations.hackathons[0].title || step2.recommendations.hackathons[0].name;
  history.push({ role: "assistant", content: step2.text, recommendations: step2.recommendations });

  // Step 3: Why?
  history.push({ role: "user", content: "Why?" });
  let step3 = generateFallbackResponse(history, { userProfile });
  assert(step3.text.includes("strongest fit"), "Step 3 should explain why selected hackathon was recommended");
  history.push({ role: "assistant", content: step3.text });

  // Step 4: What skills does it require?
  history.push({ role: "user", content: "What skills does it require?" });
  let step4 = generateFallbackResponse(history, { userProfile });
  assert(step4.text.includes(selectedHackTitle), "Step 4 should display requirements for selected hackathon");
  history.push({ role: "assistant", content: step4.text });

  // Step 5: What skills am I missing?
  history.push({ role: "user", content: "What skills am I missing?" });
  let step5 = generateFallbackResponse(history, { userProfile });
  assert(step5.text.includes("You may need:"), "Step 5 should show skill gap analysis");
  history.push({ role: "assistant", content: step5.text });

  // Step 6: Find teammates
  history.push({ role: "user", content: "Find teammates" });
  let step6 = generateFallbackResponse(history, { userProfile });
  // Simulate teammates search tool response
  history.push({ role: "tool", name: "find_teammates", content: JSON.stringify({ teammates: sampleTeammates }) });
  history.push({ role: "assistant", content: "Found 3 teammates", recommendations: { teammates: sampleTeammates } });

  // Step 7: Which one is best?
  history.push({ role: "user", content: "Which one is best?" });
  let step7 = generateFallbackResponse(history, { userProfile });
  assert.strictEqual(step7.recommendations.teammates.length, 1, "Step 7 should return 1 best teammate card");
  const bestTeammate = step7.recommendations.teammates[0];
  const bestTeammateName = bestTeammate.name;
  const bestTeammateId = bestTeammate.userId || bestTeammate.id || bestTeammate._id;
  history.push({ role: "assistant", content: step7.text, recommendations: step7.recommendations });

  // Step 8: Why him?
  history.push({ role: "user", content: "Why him?" });
  let step8 = generateFallbackResponse(history, { userProfile });
  assert(step8.text.includes(bestTeammateName), "Step 8 should explain why best teammate was selected");
  history.push({ role: "assistant", content: step8.text });

  // Step 9: Connect me with him
  history.push({ role: "user", content: "Connect me with him" });
  let step9 = generateFallbackResponse(history, { userProfile });
  assert(step9.pendingAction, "Step 9 should generate connection confirmation pendingAction");
  assert.strictEqual(step9.pendingAction.targetUserId, bestTeammateId, "Step 9 should preserve real target user ID");
  history.push({ role: "assistant", content: step9.text, pendingAction: step9.pendingAction });

  // Step 10: Yes
  history.push({ role: "user", content: "Yes" });
  let step10 = generateFallbackResponse(history, { userProfile });
  assert.strictEqual(step10.toolCalls[0].name, "send_connection_request", "Step 10 should issue send_connection_request tool call");
  assert.strictEqual(step10.toolCalls[0].args.targetUserId, bestTeammateId);

  console.log("  ✅ Complete 10-step multi-turn conversational flow passed end-to-end.");

  console.log("\nALL PHASE 6 AGENT MEMORY & CONTEXTUAL INTELLIGENCE TESTS PASSED SUCCESSFULLY! 🎉\n");
}

runPhase6Tests().catch((err) => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});
