const assert = require("assert");
const { callLLM, understandUserQuery } = require("../services/aiService");

async function runTests() {
  console.log("=================================================");
  console.log("RUNNING GETHACK A1 GRAMMAR & TYPO TOLERANCE TESTS");
  console.log("=================================================\n");

  let passed = 0;
  let total = 0;

  function check(testName, condition, detail = "") {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${detail}`);
    }
  }

  // 1. Direct Unit Testing for understandUserQuery()
  console.log("--- 1. Testing understandUserQuery NLU Layer ---");

  const q1 = understandUserQuery("what skill i require");
  check("NLU: 'what skill i require'", q1.intent === "HACKATHON_REQUIREMENTS" && q1.normalizedQuery.includes("require"), `got intent=${q1.intent}`);

  const q2 = understandUserQuery("what skills i requr");
  check("NLU: 'what skills i requr'", q2.intent === "HACKATHON_REQUIREMENTS" && q2.normalizedQuery.includes("require"), `got intent=${q2.intent}`);

  const q3 = understandUserQuery("which skill need for this hackthon");
  check("NLU: 'which skill need for this hackthon'", q3.intent === "HACKATHON_REQUIREMENTS" && q3.normalizedQuery.includes("hackathon"), `got intent=${q3.intent}`);

  const q4 = understandUserQuery("which temmate best for ai hackthon");
  check("NLU: 'which temmate best for ai hackthon'", q4.intent === "RECOMMEND_BEST_TEAMMATE" && q4.entities.hackathonName === "AI", `got intent=${q4.intent}`);

  const q5 = understandUserQuery("best hackthon for me");
  check("NLU: 'best hackthon for me'", q5.intent === "RECOMMEND_BEST_HACKATHON", `got intent=${q5.intent}`);

  const q6 = understandUserQuery("find temmates for this hackthon");
  check("NLU: 'find temmates for this hackthon'", q6.intent === "FIND_TEAMMATES", `got intent=${q6.intent}`);

  const q7 = understandUserQuery("what skill i miss");
  check("NLU: 'what skill i miss'", q7.intent === "HACKATHON_SKILL_GAP", `got intent=${q7.intent}`);

  const q8 = understandUserQuery("when regestration close");
  check("NLU: 'when regestration close'", q8.intent === "HACKATHON_DEADLINE" && q8.normalizedQuery.includes("registration"), `got intent=${q8.intent}`);

  const q9 = understandUserQuery("find temmate for java script");
  check("NLU: 'find temmate for java script'", q9.intent === "FIND_TEAMMATES" && q9.entities.skill === "JavaScript", `got skill=${q9.entities.skill}`);

  const q10 = understandUserQuery("find temmate for mongo db");
  check("NLU: 'find temmate for mongo db'", q10.intent === "FIND_TEAMMATES" && q10.entities.skill === "MongoDB", `got skill=${q10.entities.skill}`);

  // 2. Integration Test: Single Turn Heuristic LLM Calls with Typos
  console.log("\n--- 2. Testing End-to-End Heuristic Agent with Typos ---");

  const mockContext = {
    userProfile: {
      name: "A1 Test User",
      skills: ["MERN", "JavaScript", "C++"],
      interests: ["AI", "Web3"],
      location: "India",
    },
  };

  const sampleHackathon = {
    id: "hack-volthacks-101",
    _id: "hack-volthacks-101",
    title: "VoltHacks AI Challenge",
    name: "VoltHacks AI Challenge",
    skills: ["AI", "Python", "MERN"],
    requiredSkills: ["AI", "Python", "MERN"],
    mode: "Online",
    registrationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    description: "Build cutting-edge AI apps",
  };

  const sampleTeammate = {
    id: "user-py-dev",
    _id: "user-py-dev",
    userId: "user-py-dev",
    name: "Py Dev",
    role: "AI Developer",
    skills: ["Python", "AI", "TensorFlow"],
    availability: "available",
  };

  // 2a. Hackathon Discovery with Typos
  const rSearch = await callLLM([{ role: "user", content: "find hackthon" }], mockContext);
  check("Agent: 'find hackthon' triggers search tool", Array.isArray(rSearch.toolCalls) && rSearch.toolCalls.some(t => t.name === "search_hackathons"), `toolCalls=${JSON.stringify(rSearch.toolCalls)}`);

  const rShow = await callLLM([{ role: "user", content: "show me hacathons" }], mockContext);
  check("Agent: 'show me hacathons' triggers search tool", Array.isArray(rShow.toolCalls) && rShow.toolCalls.some(t => t.name === "search_hackathons"), `toolCalls=${JSON.stringify(rShow.toolCalls)}`);

  // 2b. Teammate Search with Typos
  const rTeammates = await callLLM([{ role: "user", content: "find temmates" }], mockContext);
  check("Agent: 'find temmates' triggers find_teammates tool", Array.isArray(rTeammates.toolCalls) && rTeammates.toolCalls.some(t => t.name === "find_teammates"), `toolCalls=${JSON.stringify(rTeammates.toolCalls)}`);

  const rTeammateSkill = await callLLM([{ role: "user", content: "find temmate for java script" }], mockContext);
  check("Agent: 'find temmate for java script' passes JavaScript skill", Array.isArray(rTeammateSkill.toolCalls) && rTeammateSkill.toolCalls.some(t => t.args.skills && t.args.skills.includes("JavaScript")), `args=${JSON.stringify(rTeammateSkill.toolCalls?.[0]?.args)}`);

  // 2c. Requirements with Typos (with hackathon context)
  const reqMessages = [
    { role: "user", content: "find ai hackthon" },
    { role: "assistant", content: "Here are 5 hackathons", recommendations: { hackathons: [sampleHackathon] } },
    { role: "user", content: "what skill i requr" },
  ];
  const rReq = await callLLM(reqMessages, mockContext);
  check("Agent: 'what skill i requr' returns hackathon requirements", rReq.text.includes("VoltHacks") && rReq.text.includes("required skills"), `text=${rReq.text}`);

  // 2d. Skill Gap with Typos
  const gapMessages = [
    { role: "user", content: "find ai hackthon" },
    { role: "assistant", content: "Here are 5 hackathons", recommendations: { hackathons: [sampleHackathon] } },
    { role: "user", content: "what skill i miss" },
  ];
  const rGap = await callLLM(gapMessages, mockContext);
  check("Agent: 'what skill i miss' returns skill gap analysis", rGap.text.includes("Based on your GetHack profile") && (rGap.text.includes("Python") || rGap.text.includes("AI")), `text=${rGap.text}`);

  // 2e. Deadline with Typos
  const dlMessages = [
    { role: "user", content: "find ai hackthon" },
    { role: "assistant", content: "Here are 5 hackathons", recommendations: { hackathons: [sampleHackathon] } },
    { role: "user", content: "when regestration close" },
  ];
  const rDl = await callLLM(dlMessages, mockContext);
  check("Agent: 'when regestration close' returns registration deadline", rDl.text.includes("Registration closes on") || rDl.text.includes("VoltHacks"), `text=${rDl.text}`);

  // 3. Multi-Turn Conversation Flow with Typos
  console.log("\n--- 3. Testing Full Multi-Turn Conversation Sequence with Typos ---");

  const multiTurnHistory = [];

  // Turn 1: find ai hackthon
  multiTurnHistory.push({ role: "user", content: "find ai hackthon" });
  const step1 = await callLLM(multiTurnHistory, mockContext);
  check("Multi-turn Step 1: 'find ai hackthon' returns search tool", Array.isArray(step1.toolCalls) && step1.toolCalls.some(t => t.name === "search_hackathons"));

  // Mock tool output for 5 hackathons
  const fiveHackathons = [
    sampleHackathon,
    { id: "h2", name: "AI World Cup", skills: ["Python", "TensorFlow"], mode: "Online" },
    { id: "h3", name: "Innovate AI", skills: ["MERN", "PyTorch"], mode: "Online" },
    { id: "h4", name: "BuildAI 2026", skills: ["C++", "AI"], mode: "Online" },
    { id: "h5", name: "DeepHack", skills: ["Python", "JavaScript"], mode: "Online" },
  ];
  multiTurnHistory.push({ role: "tool", name: "search_hackathons", content: JSON.stringify({ hackathons: fiveHackathons, count: 5 }) });
  multiTurnHistory.push({ role: "assistant", content: "I found 5 upcoming hackathons.", recommendations: { hackathons: fiveHackathons } });

  // Turn 2: which one bst
  multiTurnHistory.push({ role: "user", content: "which one bst" });
  const step2 = await callLLM(multiTurnHistory, mockContext);
  check("Multi-turn Step 2: 'which one bst' recommends ONE best hackathon", step2.recommendations && step2.recommendations.hackathons?.length === 1 && step2.recommendations.hackathons[0].id === sampleHackathon.id, `got recommendations=${JSON.stringify(step2.recommendations)}`);
  multiTurnHistory.push({ role: "assistant", content: step2.text, recommendations: step2.recommendations });

  // Turn 3: what skill i need
  multiTurnHistory.push({ role: "user", content: "what skill i need" });
  const step3 = await callLLM(multiTurnHistory, mockContext);
  check("Multi-turn Step 3: 'what skill i need' returns VoltHacks requirements", step3.text.includes("VoltHacks") && step3.text.includes("required skills"), `text=${step3.text}`);
  multiTurnHistory.push({ role: "assistant", content: step3.text, recommendations: step3.recommendations });

  // Turn 4: what skill i miss
  multiTurnHistory.push({ role: "user", content: "what skill i miss" });
  const step4 = await callLLM(multiTurnHistory, mockContext);
  check("Multi-turn Step 4: 'what skill i miss' returns VoltHacks skill gap", step4.text.includes("Based on your GetHack profile"), `text=${step4.text}`);
  multiTurnHistory.push({ role: "assistant", content: step4.text, recommendations: step4.recommendations });

  // Turn 5: which temmate bst
  multiTurnHistory.push({ role: "user", content: "which temmate bst" });
  const step5 = await callLLM(multiTurnHistory, mockContext);
  check("Multi-turn Step 5: 'which temmate bst' triggers find_teammates for VoltHacks", Array.isArray(step5.toolCalls) && step5.toolCalls.some(t => t.name === "find_teammates"), `toolCalls=${JSON.stringify(step5.toolCalls)}`);

  // Mock tool output for teammate find
  multiTurnHistory.push({ role: "tool", name: "find_teammates", content: JSON.stringify({ teammates: [sampleTeammate, { id: "t2", name: "Bob", skills: ["AI"] }], count: 2 }) });
  multiTurnHistory.push({ role: "assistant", content: "I found 2 teammates.", recommendations: { teammates: [sampleTeammate, { id: "t2", name: "Bob", skills: ["AI"] }] } });

  // Turn 6: which temmate bst (with candidates in history)
  multiTurnHistory.push({ role: "user", content: "which temmate bst" });
  const step6 = await callLLM(multiTurnHistory, mockContext);
  check("Multi-turn Step 6: 'which temmate bst' returns ONE best teammate card", step6.recommendations && step6.recommendations.teammates?.length === 1 && step6.recommendations.teammates[0].name === "Py Dev", `text=${step6.text}`);

  console.log("\n=================================================");
  console.log(`TEST SUMMARY: ${passed} / ${total} TESTS PASSED`);
  console.log("=================================================");

  if (passed === total) {
    console.log("ALL GRAMMAR & TYPO TOLERANCE TESTS PASSED SUCCESSFULLY! ✅");
    process.exit(0);
  } else {
    console.error("SOME TESTS FAILED! ❌");
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed with error:", err);
  process.exit(1);
});
