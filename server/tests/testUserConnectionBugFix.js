const assert = require("assert");
const {
  generateFallbackResponse,
  extractTargetUserNameFromMessage,
  findMatchingUsersByName,
} = require("../services/aiService");

async function runTest() {
  console.log("=== STARTING GET HACK AI USER CONNECTION BUG FIX UNIT TESTS ===");

  // -------------------------------------------------------------
  // TEST 1: Extract Name "song" from Various Natural Language Phrases
  // -------------------------------------------------------------
  console.log("\n--- TEST 1: AI Name Extraction ---");
  const testPhrases = [
    "connect me with song",
    "I want to connect with song",
    "send a connection request to song",
    "connect me to Song",
    "find song for me",
    "I want to connect with Song",
    "Can you connect me with song?",
    "connect me with Song please",
    "please connect me with song",
    "connect me with a user named song",
  ];

  testPhrases.forEach((phrase) => {
    const extracted = extractTargetUserNameFromMessage(phrase);
    console.log(`  Phrase: "${phrase}" -> Extracted: "${extracted}"`);
    assert.strictEqual(
      extracted.toLowerCase(),
      "song",
      `Extraction failed for phrase "${phrase}". Got: "${extracted}"`
    );
  });
  console.log("✅ TEST 1 PASSED: Name extraction correctly extracts target name without filler words.");

  // -------------------------------------------------------------
  // TEST 2: User Name Search Matching (Case-Insensitive, Tokens, Handles, Email, ID)
  // -------------------------------------------------------------
  console.log("\n--- TEST 2: findMatchingUsersByName ---");
  const candidatePool = [
    {
      userId: "user_song_1",
      id: "user_song_1",
      name: "Song Gupta",
      profile: { handle: "song_gupta", role: "ML Engineer", skills: ["Python", "ML"] },
      email: "song@gethack.io",
      connectionStatus: "none",
    },
    {
      userId: "user_alex_2",
      id: "user_alex_2",
      name: "Alex Smith",
      profile: { handle: "alex_smith", role: "Frontend Dev", skills: ["React"] },
      email: "alex@gethack.io",
      connectionStatus: "none",
    },
  ];

  // Test exact & case variations ("song", "Song", "SONG")
  ["song", "Song", "SONG", "song_gupta", "song@gethack.io", "user_song_1"].forEach((searchTerm) => {
    const matched = findMatchingUsersByName(candidatePool, searchTerm);
    assert.strictEqual(matched.length, 1, `Search term "${searchTerm}" should find exactly 1 user`);
    assert.strictEqual(matched[0].name, "Song Gupta");
  });
  console.log("✅ TEST 2 PASSED: Matching logic resolves 'song', 'Song', 'SONG', handle, email, and ID to Song Gupta.");

  // -------------------------------------------------------------
  // TEST 3: Full AI Connection Flow - Initial Turn & Direct Search Trigger
  // -------------------------------------------------------------
  console.log("\n--- TEST 3: Full AI Flow Turn 1 (Tool Call Emission) ---");
  const context = {
    userProfile: { id: "user_me", name: "Current User", skills: ["JavaScript"] },
  };

  // Turn 1: User asks "connect me with song" when user isn't in cached pool yet
  const turn1Resp = generateFallbackResponse([{ role: "user", content: "connect me with song" }], context);
  assert(turn1Resp.toolCalls, "Turn 1 should emit find_teammates tool call");
  assert.strictEqual(turn1Resp.toolCalls[0].name, "find_teammates");
  assert.strictEqual(turn1Resp.toolCalls[0].args.query, "song", "Tool call query must be 'song'");
  console.log("  Turn 1 Response:", JSON.stringify(turn1Resp));
  console.log("✅ TEST 3 (Turn 1) PASSED: AI triggers find_teammates with query='song'.");

  // Turn 2: After tool execution returns candidate "Song Gupta"
  console.log("\n--- TEST 3: Full AI Flow Turn 2 (Confirmation Prompt & Recommendation Card) ---");
  const turn2Messages = [
    { role: "user", content: "connect me with song" },
    { role: "assistant", content: "", toolCalls: turn1Resp.toolCalls },
    {
      role: "tool",
      name: "find_teammates",
      content: JSON.stringify({
        success: true,
        count: 1,
        searchArgs: { query: "song" },
        teammates: candidatePool.slice(0, 1),
      }),
    },
  ];

  const turn2Resp = generateFallbackResponse(turn2Messages, context);
  console.log("  Turn 2 Response:", JSON.stringify(turn2Resp));
  assert(turn2Resp.pendingAction, "Turn 2 must set pendingAction");
  assert.strictEqual(turn2Resp.pendingAction.type, "send_connection_request");
  assert.strictEqual(turn2Resp.pendingAction.targetName, "Song Gupta");
  assert.strictEqual(turn2Resp.pendingAction.targetUserId, "user_song_1");
  assert(turn2Resp.recommendations?.teammates, "Turn 2 must include recommendation cards");
  console.log("✅ TEST 3 (Turn 2) PASSED: AI displays Song Gupta card and prompts for connection confirmation.");

  // Turn 3: User confirms ("Send request" / "Confirm")
  console.log("\n--- TEST 3: Full AI Flow Turn 3 (Confirmation Execution) ---");
  const turn3Messages = [
    ...turn2Messages,
    { role: "assistant", content: turn2Resp.text, pendingAction: turn2Resp.pendingAction },
    { role: "user", content: "Confirm" },
  ];
  const turn3Resp = generateFallbackResponse(turn3Messages, context);
  console.log("  Turn 3 Response:", JSON.stringify(turn3Resp));
  assert(turn3Resp.toolCalls, "Turn 3 should execute send_connection_request tool call");
  assert.strictEqual(turn3Resp.toolCalls[0].name, "send_connection_request");
  assert.strictEqual(turn3Resp.toolCalls[0].args.targetUserId, "user_song_1");
  console.log("✅ TEST 3 (Turn 3) PASSED: User confirmation triggers send_connection_request API.");

  // -------------------------------------------------------------
  // TEST 4: Case-Insensitive Prompt ("I want to connect with SONG")
  // -------------------------------------------------------------
  console.log("\n--- TEST 4: Case-Insensitive Prompt ('SONG') ---");
  const caseMessages = [
    { role: "user", content: "I want to connect with SONG" },
    { role: "assistant", content: "", toolCalls: [{ name: "find_teammates", args: { query: "SONG" } }] },
    {
      role: "tool",
      name: "find_teammates",
      content: JSON.stringify({
        success: true,
        count: 1,
        searchArgs: { query: "SONG" },
        teammates: candidatePool.slice(0, 1),
      }),
    },
  ];
  const caseResp = generateFallbackResponse(caseMessages, context);
  assert.strictEqual(caseResp.pendingAction?.targetName, "Song Gupta");
  console.log("✅ TEST 4 PASSED: 'SONG' resolves to Song Gupta.");

  // -------------------------------------------------------------
  // TEST 5: Non-Existent User ("connect me with NonExistentUser123")
  // -------------------------------------------------------------
  console.log("\n--- TEST 5: Non-Existent User ---");
  const notFoundMessages = [
    { role: "user", content: "connect me with NonExistentUser123" },
    { role: "assistant", content: "", toolCalls: [{ name: "find_teammates", args: { query: "NonExistentUser123" } }] },
    {
      role: "tool",
      name: "find_teammates",
      content: JSON.stringify({
        success: true,
        count: 0,
        searchArgs: { query: "NonExistentUser123" },
        teammates: [],
      }),
    },
  ];
  const notFoundResp = generateFallbackResponse(notFoundMessages, context);
  console.log("  Not Found Response:", notFoundResp.text);
  assert(notFoundResp.text.includes("I couldn't find a getHack user named NonExistentUser123"));
  console.log("✅ TEST 5 PASSED: Correct 'user not found' message returned only after searching database.");

  // -------------------------------------------------------------
  // TEST 6: Multiple Matches Disambiguation
  // -------------------------------------------------------------
  console.log("\n--- TEST 6: Disambiguation for Multiple Matches ---");
  const multiCandidatePool = [
    {
      userId: "user_song_1",
      id: "user_song_1",
      name: "Song Gupta",
      profile: { handle: "song_gupta", role: "ML Engineer" },
    },
    {
      userId: "user_song_2",
      id: "user_song_2",
      name: "Song Sharma",
      profile: { handle: "song_sharma", role: "Frontend Dev" },
    },
  ];

  const multiMessages = [
    { role: "user", content: "connect me with song" },
    { role: "assistant", content: "", toolCalls: [{ name: "find_teammates", args: { query: "song" } }] },
    {
      role: "tool",
      name: "find_teammates",
      content: JSON.stringify({
        success: true,
        count: 2,
        searchArgs: { query: "song" },
        teammates: multiCandidatePool,
      }),
    },
  ];
  const multiResp = generateFallbackResponse(multiMessages, context);
  console.log("  Multi Match Response Text:", multiResp.text);
  console.log("  Multi Match Recommendations Count:", multiResp.recommendations?.teammates?.length);
  assert(multiResp.text.includes("I found multiple users named song. Which one do you mean?"));
  assert.strictEqual(multiResp.recommendations?.teammates?.length, 2);
  assert(!multiResp.pendingAction, "Should NOT set pendingAction when multiple users match");
  console.log("✅ TEST 6 PASSED: Multiple matches trigger concise disambiguation question and return candidates.");

  console.log("\n🎉 ALL GET HACK AI USER CONNECTION BUG FIX UNIT TESTS PASSED SUCCESSFULLY! 🎉\n");
}

runTest().catch((err) => {
  console.error("❌ TEST SCRIPT ERROR:", err);
  process.exit(1);
});
