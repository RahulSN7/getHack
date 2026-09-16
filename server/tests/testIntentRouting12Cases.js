const assert = require("assert");
const { understandUserQuery, callLLM } = require("../services/aiService");

async function run12TestCaseVerification() {
  console.log("=================================================");
  console.log("VERIFYING 12 GETHACK AI INTENT & ROUTING TEST CASES");
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

  const mockContext = {
    userProfile: {
      name: "Test User",
      skills: ["React", "JavaScript", "C++"],
      interests: ["AI", "Web3"],
      location: "India",
    },
  };

  const sampleHackathon = {
    id: "hack-ai-101",
    _id: "hack-ai-101",
    title: "AI Global Challenge 2026",
    name: "AI Global Challenge 2026",
    skills: ["AI", "Python", "React"],
    requiredSkills: ["AI", "Python", "React"],
    mode: "Online",
    registrationDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    description: "Build cutting-edge AI hackathon projects",
  };

  // 1. "find hackathons"
  const q1 = understandUserQuery("find hackathons");
  check("Case 1: NLU 'find hackathons'", q1.intent === "HACKATHON_SEARCH", `got intent=${q1.intent}`);
  const r1 = await callLLM([{ role: "user", content: "find hackathons" }], mockContext);
  const r1Tool = Array.isArray(r1.toolCalls) && r1.toolCalls.some((t) => t.name === "search_hackathons");
  check("Case 1: Agent routes to search_hackathons tool", r1Tool, `got toolCalls=${JSON.stringify(r1.toolCalls)}`);

  // 2. "Find online AI hackathons for me."
  const q2 = understandUserQuery("Find online AI hackathons for me.");
  check("Case 2: NLU 'Find online AI hackathons for me.'", q2.intent === "HACKATHON_SEARCH", `got intent=${q2.intent}`);
  const r2 = await callLLM([{ role: "user", content: "Find online AI hackathons for me." }], mockContext);
  const r2Tool = Array.isArray(r2.toolCalls) && r2.toolCalls.some((t) => t.name === "search_hackathons" && t.args?.mode === "online");
  check("Case 2: Agent extracts mode=online and routes to search_hackathons", r2Tool, `got toolCalls=${JSON.stringify(r2.toolCalls)}`);

  // 3. "provide me best hacakthon"
  const q3 = understandUserQuery("provide me best hacakthon");
  check("Case 3: NLU 'provide me best hacakthon'", q3.intent === "RECOMMEND_BEST_HACKATHON" || q3.intent === "HACKATHON_SEARCH", `got intent=${q3.intent}`);
  const r3 = await callLLM([{ role: "user", content: "provide me best hacakthon" }], mockContext);
  const r3Tool = Array.isArray(r3.toolCalls) && r3.toolCalls.some((t) => t.name === "search_hackathons");
  check("Case 3: Agent routes typo best hacakthon to search_hackathons", r3Tool, `got toolCalls=${JSON.stringify(r3.toolCalls)}`);

  // 4. "find hacakthon"
  const q4 = understandUserQuery("find hacakthon");
  check("Case 4: NLU 'find hacakthon'", q4.intent === "HACKATHON_SEARCH", `got intent=${q4.intent}`);
  const r4 = await callLLM([{ role: "user", content: "find hacakthon" }], mockContext);
  const r4Tool = Array.isArray(r4.toolCalls) && r4.toolCalls.some((t) => t.name === "search_hackathons");
  check("Case 4: Agent routes 'find hacakthon' to search_hackathons", r4Tool, `got toolCalls=${JSON.stringify(r4.toolCalls)}`);

  // 5. "show me upcoming hackathons"
  const q5 = understandUserQuery("show me upcoming hackathons");
  check("Case 5: NLU 'show me upcoming hackathons'", q5.intent === "HACKATHON_SEARCH", `got intent=${q5.intent}`);
  const r5 = await callLLM([{ role: "user", content: "show me upcoming hackathons" }], mockContext);
  const r5Tool = Array.isArray(r5.toolCalls) && r5.toolCalls.some((t) => t.name === "search_hackathons");
  check("Case 5: Agent routes 'show me upcoming hackathons' to search_hackathons", r5Tool, `got toolCalls=${JSON.stringify(r5.toolCalls)}`);

  // 6. "find AI hackathons"
  const q6 = understandUserQuery("find AI hackathons");
  check("Case 6: NLU 'find AI hackathons'", q6.intent === "HACKATHON_SEARCH", `got intent=${q6.intent}`);
  const r6 = await callLLM([{ role: "user", content: "find AI hackathons" }], mockContext);
  const r6Tool = Array.isArray(r6.toolCalls) && r6.toolCalls.some((t) => t.name === "search_hackathons" && (t.args?.interests?.includes("AI") || t.args?.skills?.includes("AI")));
  check("Case 6: Agent routes 'find AI hackathons' with AI interest", r6Tool, `got toolCalls=${JSON.stringify(r6.toolCalls)}`);

  // 7. "find teammates"
  const q7 = understandUserQuery("find teammates");
  check("Case 7: NLU 'find teammates'", q7.intent === "FIND_TEAMMATES", `got intent=${q7.intent}`);
  const r7 = await callLLM([{ role: "user", content: "find teammates" }], mockContext);
  const r7Tool = Array.isArray(r7.toolCalls) && r7.toolCalls.some((t) => t.name === "find_teammates");
  check("Case 7: Agent routes 'find teammates' to find_teammates", r7Tool, `got toolCalls=${JSON.stringify(r7.toolCalls)}`);

  // 8. "find an AI developer"
  const q8 = understandUserQuery("find an AI developer");
  check("Case 8: NLU 'find an AI developer'", q8.intent === "FIND_TEAMMATES", `got intent=${q8.intent}`);
  const r8 = await callLLM([{ role: "user", content: "find an AI developer" }], mockContext);
  const r8Tool = Array.isArray(r8.toolCalls) && r8.toolCalls.some((t) => t.name === "find_teammates" && t.args?.skills?.includes("AI"));
  check("Case 8: Agent routes 'find an AI developer' with skill AI", r8Tool, `got toolCalls=${JSON.stringify(r8.toolCalls)}`);

  // 9. "connect me with Rahul"
  const q9 = understandUserQuery("connect me with Rahul");
  check("Case 9: NLU 'connect me with Rahul'", q9.intent === "DIRECT_CONNECT_USER" && q9.entities.targetName === "Rahul", `got intent=${q9.intent}, targetName=${q9.entities.targetName}`);
  const r9 = await callLLM([{ role: "user", content: "connect me with Rahul" }], mockContext);
  const r9UserFind = Array.isArray(r9.toolCalls) && r9.toolCalls.some((t) => t.name === "find_teammates" && t.args?.query === "Rahul");
  check("Case 9: Agent searches user named Rahul", r9UserFind, `got toolCalls=${JSON.stringify(r9.toolCalls)}`);

  // 10. "what skills do I need for this hackathon?"
  const history10 = [
    { role: "assistant", recommendations: { hackathons: [sampleHackathon] } },
    { role: "user", content: "what skills do I need for this hackathon?" },
  ];
  const q10 = understandUserQuery("what skills do I need for this hackathon?", history10);
  check("Case 10: NLU 'what skills do I need for this hackathon?'", q10.intent === "HACKATHON_REQUIREMENTS", `got intent=${q10.intent}`);
  const r10 = await callLLM(history10, mockContext);
  check("Case 10: Agent answers hackathon requirements using context", typeof r10.text === "string" && r10.text.includes("AI"), `got text=${r10.text}`);

  // 11. "when is the deadline?"
  const history11 = [
    { role: "assistant", recommendations: { hackathons: [sampleHackathon] } },
    { role: "user", content: "when is the deadline?" },
  ];
  const q11 = understandUserQuery("when is the deadline?", history11);
  check("Case 11: NLU 'when is the deadline?'", q11.intent === "HACKATHON_DEADLINE", `got intent=${q11.intent}`);
  const r11 = await callLLM(history11, mockContext);
  check("Case 11: Agent answers deadline using context", typeof r11.text === "string" && (r11.text.includes("Registration closes") || r11.text.includes("deadline")), `got text=${r11.text}`);

  // 12. "what can you do?"
  const q12 = understandUserQuery("what can you do?");
  check("Case 12: NLU 'what can you do?'", q12.intent === "GENERAL_AI_HELP", `got intent=${q12.intent}`);
  const r12 = await callLLM([{ role: "user", content: "what can you do?" }], mockContext);
  check("Case 12: Agent returns capabilities response", typeof r12.text === "string" && r12.text.includes("Your Hackathon Assistant"), `got text=${r12.text}`);

  console.log("\n=================================================");
  console.log(`RESULTS: ${passed} / ${total} TESTS PASSED`);
  console.log("=================================================");

  if (passed !== total) {
    process.exit(1);
  }
}

run12TestCaseVerification().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
