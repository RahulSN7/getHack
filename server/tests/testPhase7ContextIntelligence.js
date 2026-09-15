const { generateFallbackResponse, extractStructuredContext } = require("../services/aiService");

/**
 * Phase 7 Context & Decision Intelligence Automated Test Suite
 */
async function runPhase7Tests() {
  console.log("=================================================");
  console.log("   RUNNING GET HACK A1 - PHASE 7 TEST SUITE      ");
  console.log("=================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] Test ${totalTests}: ${message}`);
      passedTests++;
    } else {
      console.error(`[FAIL] Test ${totalTests}: ${message}`);
    }
  }

  // --- MOCK DATA ---
  const hackathonA = {
    id: "hack_a",
    _id: "hack_a",
    title: "AI Innovation Challenge",
    name: "AI Innovation Challenge",
    skills: ["AI / ML", "Python", "TensorFlow"],
    requiredSkills: ["AI / ML", "Python", "TensorFlow"],
    description: "Build cutting edge AI solutions.",
  };

  const hackathonB = {
    id: "hack_b",
    _id: "hack_b",
    title: "Web3 Decentralized Hackathon",
    name: "Web3 Decentralized Hackathon",
    skills: ["Solidity", "React", "Web3.js"],
    requiredSkills: ["Solidity", "React", "Web3.js"],
    description: "Build decentralized apps on blockchain.",
  };

  const teammatePyDev = {
    id: "user_py",
    userId: "user_py",
    _id: "user_py",
    name: "Py Dev",
    role: "AI / ML Developer",
    skills: ["Python", "TensorFlow", "Machine Learning"],
    bio: "AI specialist with experience in computer vision.",
    connectionStatus: "not_connected",
    availability: "available",
  };

  const teammateJsDev = {
    id: "user_js",
    userId: "user_js",
    _id: "user_js",
    name: "JS Dev",
    role: "Frontend Developer",
    skills: ["JavaScript", "React", "Node.js"],
    bio: "Full stack JavaScript developer.",
    connectionStatus: "not_connected",
    availability: "available",
  };

  const mockUserContext = {
    userProfile: {
      id: "current_user_1",
      name: "Current User",
      role: "Full Stack Developer",
      skills: ["Python", "AI", "React", "JavaScript", "C++"],
    },
  };

  // =======
  // TEST A — Hackathon Context & Multi-turn Flow
  // =======
  console.log("--- TEST A: Hackathon Context & Multi-turn Flow ---");
  const conversationA = [];

  // Turn 1: Find AI hackathons
  conversationA.push({ role: "user", content: "Find AI hackathons" });
  const turnA1 = generateFallbackResponse(conversationA, {
    ...mockUserContext,
    searchData: { hackathons: [hackathonA, hackathonB] },
  });
  assert(
    turnA1.recommendations?.hackathons?.length === 2,
    "Turn 1: Returns list of AI hackathons"
  );
  conversationA.push({
    role: "assistant",
    content: turnA1.text,
    recommendations: turnA1.recommendations,
  });

  // Turn 2: Which one is best?
  conversationA.push({ role: "user", content: "Which one is best?" });
  const turnA2 = generateFallbackResponse(conversationA, mockUserContext);
  assert(
    turnA2.recommendations?.hackathons?.length === 1,
    "Turn 2: Recommends EXACTLY ONE best hackathon"
  );
  const selectedHackTitle = turnA2.recommendations?.hackathons[0]?.title;
  assert(
    selectedHackTitle === hackathonA.title,
    `Turn 2: Recommends ${hackathonA.title} as top fit`
  );
  conversationA.push({
    role: "assistant",
    content: turnA2.text,
    recommendations: turnA2.recommendations,
  });

  // Turn 3: What skills do I require?
  conversationA.push({ role: "user", content: "What skills do I require?" });
  const turnA3 = generateFallbackResponse(conversationA, mockUserContext);
  assert(
    turnA3.text.includes(hackathonA.title) && turnA3.text.includes("Python"),
    "Turn 3: Resolves required skills for recommended hackathon (VoltHacks/AI Innovation)"
  );
  conversationA.push({
    role: "assistant",
    content: turnA3.text,
    recommendations: turnA3.recommendations,
  });

  // Turn 4: What skills am I missing?
  conversationA.push({ role: "user", content: "What skills am I missing?" });
  const turnA4 = generateFallbackResponse(conversationA, mockUserContext);
  assert(
    turnA4.text.toLowerCase().includes("python") || turnA4.text.toLowerCase().includes("ai"),
    "Turn 4: Resolves skill gap for currently selected hackathon"
  );
  conversationA.push({
    role: "assistant",
    content: turnA4.text,
    recommendations: turnA4.recommendations,
  });

  // Turn 5: Find teammates
  conversationA.push({ role: "user", content: "Find teammates" });
  const turnA5 = generateFallbackResponse(conversationA, {
    ...mockUserContext,
    teammatesData: { teammates: [teammatePyDev, teammateJsDev] },
  });
  assert(
    turnA5.recommendations?.teammates?.length > 0,
    "Turn 5: Returns teammates for selected hackathon"
  );
  conversationA.push({
    role: "assistant",
    content: turnA5.text,
    recommendations: turnA5.recommendations,
  });

  // Turn 6: Which teammate is best?
  conversationA.push({ role: "user", content: "Which teammate is best?" });
  const turnA6 = generateFallbackResponse(conversationA, {
    ...mockUserContext,
    teammatesData: { teammates: [teammatePyDev, teammateJsDev] },
  });
  assert(
    turnA6.recommendations?.teammates?.length === 1,
    "Turn 6: Returns EXACTLY ONE best teammate card"
  );
  assert(
    turnA6.recommendations?.teammates[0]?.name === "Py Dev",
    "Turn 6: Identifies Py Dev as best teammate match"
  );
  conversationA.push({
    role: "assistant",
    content: turnA6.text,
    recommendations: turnA6.recommendations,
  });


  // =======
  // TEST B — Teammate Context & Pronoun Direct Connect
  // =======
  console.log("\n--- TEST B: Teammate Context & Pronoun Direct Connect ---");
  const conversationB = [];

  // Turn 1: Find JavaScript teammates
  conversationB.push({ role: "user", content: "Find JavaScript teammates" });
  const turnB1 = generateFallbackResponse(conversationB, {
    ...mockUserContext,
    teammatesData: { teammates: [teammateJsDev] },
  });
  assert(
    turnB1.recommendations?.teammates?.length === 1,
    "Turn 1: Returns JavaScript teammate"
  );
  conversationB.push({
    role: "assistant",
    content: turnB1.text,
    recommendations: turnB1.recommendations,
  });

  // Turn 2: Which one is best?
  conversationB.push({ role: "user", content: "Which one is best?" });
  const turnB2 = generateFallbackResponse(conversationB, {
    ...mockUserContext,
    teammatesData: { teammates: [teammateJsDev] },
  });
  assert(
    turnB2.recommendations?.teammates?.length === 1 &&
    turnB2.recommendations?.teammates[0]?.name === "JS Dev",
    "Turn 2: Recommends JS Dev as best teammate"
  );
  conversationB.push({
    role: "assistant",
    content: turnB2.text,
    recommendations: turnB2.recommendations,
  });

  // Turn 3: Tell me about him
  conversationB.push({ role: "user", content: "Tell me about him" });
  const turnB3 = generateFallbackResponse(conversationB, mockUserContext);
  assert(
    turnB3.text.includes("JS Dev"),
    "Turn 3: Resolves 'him' to JS Dev and returns profile details"
  );
  conversationB.push({
    role: "assistant",
    content: turnB3.text,
    recommendations: turnB3.recommendations,
  });

  // Turn 4: Connect me with him
  conversationB.push({ role: "user", content: "Connect me with him" });
  const turnB4 = generateFallbackResponse(conversationB, {
    ...mockUserContext,
    teammatesData: { teammates: [teammateJsDev] },
  });
  assert(
    (turnB4.pendingAction && turnB4.pendingAction.targetUserId === "user_js") ||
    (turnB4.toolCalls && turnB4.toolCalls[0]?.args?.targetUserId === "user_js"),
    "Turn 4: Resolves 'him' to JS Dev and returns connection request prompt"
  );


  // =======
  // TEST C — Hackathon Switch
  // =======
  console.log("\n--- TEST C: Hackathon Selection Switch ---");
  const conversationC = [];

  // Turn 1: Find AI hackathons
  conversationC.push({ role: "user", content: "Find AI hackathons" });
  const turnC1 = generateFallbackResponse(conversationC, {
    ...mockUserContext,
    searchData: { hackathons: [hackathonA, hackathonB] },
  });
  conversationC.push({
    role: "assistant",
    content: turnC1.text,
    recommendations: turnC1.recommendations,
  });

  // Turn 2: Which one is best?
  conversationC.push({ role: "user", content: "Which one is best?" });
  const turnC2 = generateFallbackResponse(conversationC, {
    ...mockUserContext,
    searchData: { hackathons: [hackathonA, hackathonB] },
  });
  assert(
    turnC2.recommendations?.hackathons?.length === 1,
    "Turn 2: Explicitly selects Hackathon A"
  );
  conversationC.push({
    role: "assistant",
    content: turnC2.text,
    recommendations: turnC2.recommendations,
  });

  // Turn 3: What skills do I require?
  conversationC.push({ role: "user", content: "What skills do I require?" });
  const turnC3 = generateFallbackResponse(conversationC, mockUserContext);
  assert(
    turnC3.text.includes("AI / ML") || turnC3.text.includes("Python"),
    "Turn 3: Analyzes requirements for Hackathon A"
  );
  conversationC.push({
    role: "assistant",
    content: turnC3.text,
    recommendations: turnC3.recommendations,
  });

  // Turn 4: Explicitly switch to Hackathon B
  conversationC.push({ role: "user", content: "Select Web3 Decentralized Hackathon" });
  const turnC4 = generateFallbackResponse(conversationC, {
    ...mockUserContext,
    searchData: { hackathons: [hackathonA, hackathonB] },
  });
  assert(
    turnC4.recommendations?.hackathons?.length === 1 &&
    turnC4.recommendations?.hackathons[0]?.title.includes("Web3"),
    "Turn 4: Explicitly switches selection to Hackathon B"
  );
  conversationC.push({
    role: "assistant",
    content: turnC4.text,
    recommendations: turnC4.recommendations,
  });

  // Turn 5: What skills do I require? (should be Web3 skills now)
  conversationC.push({ role: "user", content: "What skills do I require?" });
  const turnC5 = generateFallbackResponse(conversationC, mockUserContext);
  assert(
    turnC5.text.includes("Solidity") || turnC5.text.includes("Web3"),
    "Turn 5: Analyzes requirements for Hackathon B (NOT Hackathon A)"
  );


  // =======
  // TEST D — Ambiguous Context Handling
  // =======
  console.log("\n--- TEST D: Ambiguous Context Handling ---");
  const conversationD = [];

  // Search results with 2 hackathons, but NO specific hackathon selected yet
  conversationD.push({ role: "user", content: "Find web development hackathons" });
  conversationD.push({
    role: "assistant",
    content: "Here are Web Dev hackathons:",
    recommendations: { hackathons: [hackathonA, hackathonB] },
  });

  // Search web dev hackathons
  conversationD.push({ role: "user", content: "Find web development hackathons" });
  conversationD.push({
    role: "assistant",
    content: "Here are Web Dev hackathons:",
    recommendations: { hackathons: [hackathonA, hackathonB] },
  });

  // Ask without selection: What skills do I require?
  conversationD.push({ role: "user", content: "What skills do I require?" });
  const turnD = generateFallbackResponse(conversationD, mockUserContext);
  assert(
    turnD.text.includes("Which hackathon do you mean"),
    "Turn D: Detects ambiguous context and prompts user for clarification"
  );


  // =======
  // TEST E — Skill Override Priority
  // =======
  console.log("\n--- TEST E: Skill Override Priority ---");
  const conversationE = [];

  conversationE.push({ role: "user", content: "Find AI teammates for this hackathon" });
  conversationE.push({
    role: "assistant",
    content: "Here are AI teammates:",
    recommendations: { teammates: [teammatePyDev] },
  });

  conversationE.push({ role: "user", content: "Find JavaScript teammates" });
  const turnE = generateFallbackResponse(conversationE, mockUserContext);
  const findTeammatesCall = turnE.toolCalls?.find((t) => t.name === "find_teammates");
  assert(
    findTeammatesCall && findTeammatesCall.args?.skills?.some((s) => s.toLowerCase() === "javascript"),
    "Turn E: Explicit JavaScript skill requirement overrides previous AI hackathon context"
  );


  // =======
  // TEST F — Direct Connection via Pronoun
  // =======
  console.log("\n--- TEST F: Direct Connection via Pronoun ---");
  const conversationF = [];

  conversationF.push({ role: "user", content: "Find teammates" });
  conversationF.push({
    role: "assistant",
    content: "Here are teammates:",
    recommendations: { teammates: [teammatePyDev, teammateJsDev] },
  });

  conversationF.push({ role: "user", content: "Which teammate is best?" });
  conversationF.push({
    role: "assistant",
    content: "I recommend Py Dev as the best teammate.",
    recommendations: { teammates: [teammatePyDev] },
  });

  conversationF.push({ role: "user", content: "Connect me with him" });
  const turnF = generateFallbackResponse(conversationF, {
    ...mockUserContext,
    teammatesData: { teammates: [teammatePyDev] },
  });

  assert(
    (turnF.pendingAction && turnF.pendingAction.targetUserId === "user_py") ||
    (turnF.toolCalls && turnF.toolCalls[0]?.args?.targetUserId === "user_py"),
    "Turn F: Correctly resolves 'him' to Py Dev and executes connection request"
  );


  console.log("\n=================================================");
  console.log(`   PHASE 7 TEST RESULTS: ${passedTests}/${totalTests} PASSED`);
  console.log("=================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runPhase7Tests().catch((err) => {
  console.error("Test Suite Execution Error:", err);
  process.exit(1);
});
