
// server/tests/testTeammatesForHackathonRouting.js
// Integration Test Suite for GetHack A1 "Best Teammates for A1 Hackathon" Intent Routing


const assert = require("assert");
const mongoose = require("mongoose");
const { callLLM } = require("../services/aiService");
const User = require("../models/user");
const Hackathon = require("../models/hackathon");
const { findTeammates } = require("../tools/findTeammates");
const { searchHackathons } = require("../tools/searchHackathons");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/gethack_test";

async function runTests() {
  console.log("=== STARTING TEAMMATES FOR HACKATHON ROUTING TESTS ===");

  const context = {
    userProfile: {
      id: "user_test_main",
      skills: ["MERN", "JavaScript", "C++"],
      interests: ["AI", "Web Development"],
    },
    user: { _id: "user_test_main", name: "Test Main User" },
  };

  const sampleHackathons = [
    {
      id: "hack_a1_1",
      _id: "hack_a1_1",
      title: "VoltHacks AI Challenge",
      name: "VoltHacks AI Challenge",
      description: "Build cutting edge AI solutions with MERN and C++.",
      skills: ["AI", "JavaScript", "MERN", "C++"],
      themes: ["AI"],
      registrationDeadline: "2026-10-15T23:59:59.000Z",
      mode: "Online",
      status: "registration_open",
    },
    {
      id: "hack_a1_2",
      _id: "hack_a1_2",
      title: "Python Machine Learning Summit",
      name: "Python Machine Learning Summit",
      description: "Data science and ML hackathon.",
      skills: ["Python", "Machine Learning"],
      themes: ["AI"],
      registrationDeadline: "2026-09-20T23:59:59.000Z",
      mode: "Online",
      status: "registration_open",
    },
    {
      id: "hack_a1_3",
      _id: "hack_a1_3",
      title: "Fullstack JS Sprint",
      name: "Fullstack JS Sprint",
      description: "Web app sprint.",
      skills: ["JavaScript", "React", "Node.js"],
      themes: ["Web"],
      registrationDeadline: "2026-11-01T23:59:59.000Z",
      mode: "Online",
      status: "registration_open",
    },
  ];

  const sampleTeammates = [
    {
      id: "u_1",
      userId: "u_1",
      _id: "u_1",
      name: "Rahul Tech",
      role: "AI Developer",
      skills: ["AI", "Python", "JavaScript"],
      availability: "available",
      connectionState: "none",
    },
    {
      id: "u_2",
      userId: "u_2",
      _id: "u_2",
      name: "Aman Design",
      role: "UI/UX Designer",
      skills: ["UI/UX", "Figma", "CSS"],
      availability: "available",
      connectionState: "none",
    },
    {
      id: "u_3",
      userId: "u_3",
      _id: "u_3",
      name: "Priya Backend",
      role: "Backend Engineer",
      skills: ["Node.js", "MongoDB", "C++"],
      availability: "available",
      connectionState: "none",
    },
    {
      id: "u_4",
      userId: "u_4",
      _id: "u_4",
      name: "Sam Py",
      role: "Python Dev",
      skills: ["Python", "Django"],
      availability: "available",
      connectionState: "none",
    },
    {
      id: "u_5",
      userId: "u_5",
      _id: "u_5",
      name: "Karan ML",
      role: "ML Researcher",
      skills: ["Machine Learning", "AI", "Python"],
      availability: "available",
      connectionState: "none",
    },
    {
      id: "u_6",
      userId: "u_6",
      _id: "u_6",
      name: "Neha Frontend",
      role: "Frontend Dev",
      skills: ["React", "JavaScript", "CSS"],
      availability: "available",
      connectionState: "none",
    },
  ];

  let testPassed = 0;
  let testTotal = 8;

  -----------------------
    // TEST 1: User asks "Find teammates for A1 hackathon"
    -----------------------
      console.log("\n--- TEST 1: User asks 'Find teammates for A1 hackathon' ---");
  const t1UserMsg = { role: "user", content: "Find teammates for A1 hackathon" };
  const t1Res = await callLLM([t1UserMsg], context);

  // Must call find_teammates tool, NOT search_hackathons
  assert.ok(t1Res.toolCalls?.some((tc) => tc.name === "find_teammates"), "Must call find_teammates tool call");
  assert.ok(!t1Res.toolCalls?.some((tc) => tc.name === "search_hackathons"), "Must NOT call search_hackathons tool");
  console.log("T1 Tool Call:", t1Res.toolCalls.map((tc) => tc.name).join(", "));

  // Simulate tool execution turn
  const t1ToolResMsg = { role: "tool", name: "find_teammates", content: JSON.stringify({ count: 6, candidatesAfterFilters: 6, teammates: sampleTeammates }) };
  const t1FinalRes = await callLLM([t1UserMsg, { role: "assistant", content: "Calling find_teammates" }, t1ToolResMsg], context);

  assert.ok(t1FinalRes.recommendations?.teammates, "T1 response must return teammates recommendations");
  assert.strictEqual(t1FinalRes.recommendations?.hackathons, undefined, "T1 response must NOT return hackathons recommendations");
  console.log("T1 Teammates returned count:", t1FinalRes.recommendations.teammates.length);
  console.log("✅ TEST 1 PASSED");
  testPassed++;

  -----------------------
    // TEST 2: User asks "Provide me best teammates for A1 hackathon"
    -----------------------
      console.log("\n--- TEST 2: User asks 'Provide me best teammates for A1 hackathon' ---");
  const t2UserMsg = { role: "user", content: "Provide me best teammates for A1 hackathon" };
  const t2Res = await callLLM([t2UserMsg], context);

  assert.ok(t2Res.toolCalls?.some((tc) => tc.name === "find_teammates"), "Must trigger find_teammates tool call");
  assert.ok(!t2Res.toolCalls?.some((tc) => tc.name === "search_hackathons"), "Must NOT trigger search_hackathons tool call");

  const t2ToolResMsg = { role: "tool", name: "find_teammates", content: JSON.stringify({ count: 6, candidatesAfterFilters: 6, teammates: sampleTeammates }) };
  const t2FinalRes = await callLLM([t2UserMsg, { role: "assistant", content: "Calling find_teammates" }, t2ToolResMsg], context);

  assert.ok(t2FinalRes.recommendations?.teammates, "T2 must return teammate cards");
  assert.strictEqual(t2FinalRes.recommendations.teammates.length, 1, "Best teammates prompt must return EXACTLY 1 card");
  console.log("T2 Teammates returned count:", t2FinalRes.recommendations.teammates.length);
  console.log("✅ TEST 2 PASSED");
  testPassed++;

  -----------------------
    // TEST 3: User asks "Find Python teammates for A1"
    -----------------------
      console.log("\n--- TEST 3: User asks 'Find Python teammates for A1' ---");
  const t3UserMsg = { role: "user", content: "Find Python teammates for A1" };
  const t3Res = await callLLM([t3UserMsg], context);

  const t3FindTc = t3Res.toolCalls?.find((tc) => tc.name === "find_teammates");
  assert.ok(t3FindTc, "Must call find_teammates");
  assert.ok(t3FindTc.args.skills?.includes("Python"), "Search args must specify Python skill");

  const pythonTeammates = sampleTeammates.filter((t) => t.skills.includes("Python"));
  const t3ToolResMsg = { role: "tool", name: "find_teammates", content: JSON.stringify({ count: pythonTeammates.length, candidatesAfterFilters: pythonTeammates.length, teammates: pythonTeammates }) };
  const t3FinalRes = await callLLM([t3UserMsg, { role: "assistant", content: "Calling find_teammates" }, t3ToolResMsg], context);

  assert.ok(t3FinalRes.recommendations?.teammates, "T3 must return Python teammate cards");
  console.log("T3 Python teammates returned:", t3FinalRes.recommendations.teammates.map((t) => t.name).join(", "));
  console.log("✅ TEST 3 PASSED");
  testPassed++;

  -----------------------
    // TEST 4: User asks "Find AI teammates for this hackathon" after hackathon search turn
    -----------------------
      console.log("\n--- TEST 4: User asks 'Find AI teammates for this hackathon' ---");
  const turn1SearchUserMsg = { role: "user", content: "Suggest me hackathons" };
  const turn1SearchAssistantMsg = { role: "assistant", content: "Here are upcoming hackathons:", recommendations: { hackathons: sampleHackathons } };
  const t4UserMsg = { role: "user", content: "Find AI teammates for this hackathon" };

  const t4Res = await callLLM([turn1SearchUserMsg, turn1SearchAssistantMsg, t4UserMsg], context);
  assert.ok(t4Res.toolCalls?.some((tc) => tc.name === "find_teammates"), "Must call find_teammates");

  const aiTeammates = sampleTeammates.filter((t) => t.skills.includes("AI"));
  const t4ToolResMsg = { role: "tool", name: "find_teammates", content: JSON.stringify({ count: aiTeammates.length, candidatesAfterFilters: aiTeammates.length, teammates: aiTeammates }) };
  const t4FinalRes = await callLLM([turn1SearchUserMsg, turn1SearchAssistantMsg, t4UserMsg, { role: "assistant", content: "Searching teammates..." }, t4ToolResMsg], context);

  assert.ok(t4FinalRes.recommendations?.teammates, "T4 must return AI teammate cards");
  console.log("T4 AI teammates count:", t4FinalRes.recommendations.teammates.length);
  console.log("✅ TEST 4 PASSED");
  testPassed++;

  -----------------------
    // TEST 5: User asks "Which teammate is best for A1?"
    -----------------------
      console.log("\n--- TEST 5: User asks 'Which teammate is best for A1?' ---");
  const t5UserMsg = { role: "user", content: "Which teammate is best for A1?" };
  const t5ToolResMsg = { role: "tool", name: "find_teammates", content: JSON.stringify({ count: sampleTeammates.length, candidatesAfterFilters: sampleTeammates.length, teammates: sampleTeammates }) };
  const t5FinalRes = await callLLM([t5UserMsg, { role: "assistant", content: "Finding teammates..." }, t5ToolResMsg], context);

  assert.ok(t5FinalRes.recommendations?.teammates, "T5 must return teammate recommendations");
  assert.strictEqual(t5FinalRes.recommendations.teammates.length, 1, "Single best query must return exactly 1 teammate card");
  console.log("T5 Single best teammate:", t5FinalRes.recommendations.teammates[0].name);
  console.log("✅ TEST 5 PASSED");
  testPassed++;

  -----------------------
    // TEST 6: User asks "Find A1 hackathons"
    -----------------------
      console.log("\n--- TEST 6: User asks 'Find A1 hackathons' ---");
  const t6UserMsg = { role: "user", content: "Find A1 hackathons" };
  const t6Res = await callLLM([t6UserMsg], context);

  assert.ok(t6Res.toolCalls?.some((tc) => tc.name === "search_hackathons"), "Must call search_hackathons for hackathon request");
  assert.ok(!t6Res.toolCalls?.some((tc) => tc.name === "find_teammates"), "Must NOT call find_teammates for hackathon search");
  console.log("T6 Tool Call:", t6Res.toolCalls[0].name);

  const t6ToolResMsg = { role: "tool", name: "search_hackathons", content: JSON.stringify({ count: 3, hackathons: sampleHackathons }) };
  const t6FinalRes = await callLLM([t6UserMsg, { role: "assistant", content: "Searching hackathons..." }, t6ToolResMsg], context);

  assert.ok(t6FinalRes.recommendations?.hackathons, "T6 must return hackathon cards");
  console.log("T6 Hackathons count:", t6FinalRes.recommendations.hackathons.length);
  console.log("✅ TEST 6 PASSED");
  testPassed++;

  -----------------------
    // TEST 7: User asks "Which one is best?" (hackathon follow-up)
    -----------------------
      console.log("\n--- TEST 7: User asks 'Which one is best?' after hackathon search ---");
  const t7UserMsg = { role: "user", content: "Which one is best?" };
  const t7FinalRes = await callLLM([turn1SearchUserMsg, turn1SearchAssistantMsg, t7UserMsg], context);

  assert.ok(t7FinalRes.recommendations?.hackathons, "T7 must return single best hackathon card");
  assert.strictEqual(t7FinalRes.recommendations.hackathons.length, 1, "T7 must return exactly 1 hackathon card");
  console.log("T7 Single best hackathon:", t7FinalRes.recommendations.hackathons[0].title);
  console.log("✅ TEST 7 PASSED");
  testPassed++;

  -----------------------
    // TEST 8: User asks "Find teammates for this hackathon"
    -----------------------
      console.log("\n--- TEST 8: User asks 'Find teammates for this hackathon' ---");
  const t8UserMsg = { role: "user", content: "Find teammates for this hackathon" };
  const t8Res = await callLLM([turn1SearchUserMsg, turn1SearchAssistantMsg, t8UserMsg], context);

  assert.ok(t8Res.toolCalls?.some((tc) => tc.name === "find_teammates"), "T8 must call find_teammates");
  console.log("T8 Tool Call:", t8Res.toolCalls[0].name);
  console.log("✅ TEST 8 PASSED");
  testPassed++;

  console.log(`\n=== RESULT: ${testPassed}/${testTotal} TESTS PASSED ===`);
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
