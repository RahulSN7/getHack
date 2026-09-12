const {
  generateFallbackResponse,
  understandUserQuery,
  extractTeammateSearchContext,
} = require("../services/aiService");

async function runPhase8Tests() {
  console.log("=================================================");
  console.log("   RUNNING GET HACK A1 - PHASE 8 TEST SUITE      ");
  console.log("   (Smart Teammate Discovery & Ranking)          ");
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

  // Test 1: understandUserQuery intent classification
  const q1 = understandUserQuery("Show teammates");
  assert(q1.intent === "FIND_TEAMMATES", "Query 'Show teammates' resolves to FIND_TEAMMATES");

  const q2 = understandUserQuery("show me more teemmates");
  assert(q2.intent === "SHOW_MORE_TEAMMATES", "Query 'show me more teemmates' (typo) resolves to SHOW_MORE_TEAMMATES");

  const q3 = understandUserQuery("more teammates");
  assert(q3.intent === "SHOW_MORE_TEAMMATES", "Query 'more teammates' resolves to SHOW_MORE_TEAMMATES");

  const q4 = understandUserQuery("give me more");
  assert(q4.intent === "SHOW_MORE_TEAMMATES", "Query 'give me more' resolves to SHOW_MORE_TEAMMATES");

  const q5 = understandUserQuery("which teammate is best?");
  assert(q5.intent === "RECOMMEND_BEST_TEAMMATE", "Query 'which teammate is best?' resolves to RECOMMEND_BEST_TEAMMATE");

  const q6 = understandUserQuery("Provide me best teammates for AI hackathon");
  assert(q6.intent === "FIND_TEAMMATES", "Plural 'best teammates' resolves to FIND_TEAMMATES (up to 5 cards)");

  // Test 2: Initial candidate search returns toolCall with limit 5
  const res1 = generateFallbackResponse([{ role: "user", content: "Show teammates" }], { userProfile: { id: "u0" } });
  const findToolCall1 = res1.toolCalls ? res1.toolCalls.find((tc) => tc.name === "find_teammates") : null;
  assert(
    findToolCall1 && findToolCall1.args.limit === 5,
    "Initial 'Show teammates' triggers find_teammates tool call with limit: 5"
  );

  // Test 3: Pagination context extraction & deduplication
  const mockMessages = [
    { role: "user", content: "Show teammates" },
    {
      role: "assistant",
      content: "I found 5 available teammates.",
      recommendations: {
        teammates: [
          { userId: "u1", name: "User 1" },
          { userId: "u2", name: "User 2" },
          { userId: "u3", name: "User 3" },
          { userId: "u4", name: "User 4" },
          { userId: "u5", name: "User 5" },
        ],
      },
    },
    { role: "user", content: "Show more teammates" },
  ];

  const searchCtx = extractTeammateSearchContext(mockMessages);
  assert(
    searchCtx.shownIds.length === 5 &&
      searchCtx.shownIds.includes("u1") &&
      searchCtx.shownIds.includes("u5"),
    "extractTeammateSearchContext extracts all 5 previously shown user IDs"
  );

  // Test 4: Continuation tool call passes excludeUserIds
  const res2 = generateFallbackResponse(mockMessages, { userProfile: { id: "u0" } });
  const findToolCall2 = res2.toolCalls ? res2.toolCalls.find((tc) => tc.name === "find_teammates") : null;
  assert(
    findToolCall2 &&
      findToolCall2.args.excludeUserIds &&
      findToolCall2.args.excludeUserIds.length === 5,
    "Continuation request 'Show more teammates' excludes previously shown candidate IDs"
  );

  // Test 5: Tool response turn for 5 more candidates
  const mockToolMessages = [
    ...mockMessages,
    {
      role: "tool",
      name: "find_teammates",
      content: JSON.stringify({
        success: true,
        count: 5,
        teammates: [
          { userId: "u6", name: "User 6" },
          { userId: "u7", name: "User 7" },
          { userId: "u8", name: "User 8" },
          { userId: "u9", name: "User 9" },
          { userId: "u10", name: "User 10" },
        ],
      }),
    },
  ];

  const res3 = generateFallbackResponse(mockToolMessages, { userProfile: { id: "u0" } });
  assert(
    res3.text && res3.text.includes("5 more eligible teammates") &&
      res3.recommendations && res3.recommendations.teammates.length === 5 &&
      res3.recommendations.teammates[0].userId === "u6",
    "Tool response turn returns 'Here are 5 more eligible teammates.' with 5 new candidates"
  );

  // Test 6: Fewer than 5 remaining
  const mockToolMessagesFewer = [
    ...mockMessages,
    {
      role: "tool",
      name: "find_teammates",
      content: JSON.stringify({
        success: true,
        count: 2,
        teammates: [
          { userId: "u6", name: "User 6" },
          { userId: "u7", name: "User 7" },
        ],
      }),
    },
  ];

  const res4 = generateFallbackResponse(mockToolMessagesFewer, { userProfile: { id: "u0" } });
  assert(
    res4.text.includes("remaining eligible teammates") &&
      res4.recommendations.teammates.length === 2,
    "Tool response turn for <5 candidates returns 'Here are the remaining eligible teammates.'"
  );

  // Test 7: 0 candidates remaining
  const mockToolMessagesZero = [
    ...mockMessages,
    {
      role: "tool",
      name: "find_teammates",
      content: JSON.stringify({
        success: true,
        count: 0,
        teammates: [],
      }),
    },
  ];

  const res5 = generateFallbackResponse(mockToolMessagesZero, { userProfile: { id: "u0" } });
  assert(
    res5.text.includes("No more eligible teammates are available right now") &&
      res5.recommendations.teammates.length === 0,
    "Tool response turn for 0 candidates returns 'No more eligible teammates are available right now.'"
  );

  // Test 8: New search resets shownIds context
  const mockNewSearchMessages = [
    ...mockMessages,
    { role: "user", content: "Find JavaScript teammates" },
  ];

  const searchCtx2 = extractTeammateSearchContext(mockNewSearchMessages);
  assert(
    searchCtx2.shownIds.length === 0 && searchCtx2.activeSkills.includes("JavaScript"),
    "New search 'Find JavaScript teammates' resets shownIds to [] and sets activeSkills to ['JavaScript']"
  );

  // Test 9: Interleaving 'Which teammate is best?' (1 card) with 'Show more teammates'
  const mockInterleavedMessages = [
    { role: "user", content: "Show teammates" },
    {
      role: "assistant",
      content: "I found 5 available teammates.",
      recommendations: {
        teammates: [
          { userId: "u1", name: "User 1", score: 80 },
          { userId: "u2", name: "User 2", score: 70 },
          { userId: "u3", name: "User 3", score: 60 },
          { userId: "u4", name: "User 4", score: 50 },
          { userId: "u5", name: "User 5", score: 40 },
        ],
      },
    },
    { role: "user", content: "Which teammate is best?" },
    {
      role: "assistant",
      content: "Based on your profile, I recommend User 1.",
      recommendations: {
        teammates: [{ userId: "u1", name: "User 1", score: 80 }],
      },
    },
    { role: "user", content: "Show more teammates" },
  ];

  const resInterleaved = generateFallbackResponse(mockInterleavedMessages, { userProfile: { id: "u0" } });
  const findToolCallInterleaved = resInterleaved.toolCalls ? resInterleaved.toolCalls.find((tc) => tc.name === "find_teammates") : null;
  assert(
    findToolCallInterleaved &&
      findToolCallInterleaved.args.excludeUserIds.includes("u1") &&
      findToolCallInterleaved.args.excludeUserIds.includes("u5"),
    "Show more teammates after 'Which teammate is best?' continues pagination excluding u1..u5"
  );

  console.log("\n=================================================");
  console.log(`   PHASE 8 TESTS COMPLETED: ${passedTests}/${totalTests} PASSED`);
  console.log("=================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

if (require.main === module) {
  runPhase8Tests().catch((err) => {
    console.error("Test error:", err);
    process.exit(1);
  });
}

module.exports = { runPhase8Tests };
