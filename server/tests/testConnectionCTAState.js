// server/tests/testConnectionCTAState.js
const assert = require("assert");

// Test Connection Status Logic
function resolveConnectionStatus(currUserId, candidateId, connectionsMap) {
  if (currUserId === candidateId) {
    return "self"; // Excluded
  }

  const connInfo = connectionsMap[candidateId];
  if (!connInfo) return "none";

  if (connInfo.status === "accepted") {
    return "connected";
  }
  if (connInfo.status === "pending") {
    return "request_sent"; // Both sender and receiver directions render Request Sent
  }
  return "none";
}

function runTests() {
  console.log("=== RUNNING CONNECTION CTA STATE UNIT TESTS ===");

  const currUserId = "user_A";

  // Test A: No relationship
  const mapA = {};
  const statusA = resolveConnectionStatus(currUserId, "user_B", mapA);
  console.log("Test A (No relationship):", statusA);
  assert.strictEqual(statusA, "none", "Case 1 should return 'none' -> [Connect]");

  // Test B: Current user sent request (User A -> User B)
  const mapB = {
    user_B: { status: "pending", isSender: true, requestId: "req1" }
  };
  const statusB = resolveConnectionStatus(currUserId, "user_B", mapB);
  console.log("Test B (Current user sent request):", statusB);
  assert.strictEqual(statusB, "request_sent", "Case 2 should return 'request_sent' -> [Request Sent]");

  // Test C: Teammate sent request to current user (User B -> User A)
  const mapC = {
    user_B: { status: "pending", isSender: false, requestId: "req2" }
  };
  const statusC = resolveConnectionStatus(currUserId, "user_B", mapC);
  console.log("Test C (Teammate sent request to current user):", statusC);
  assert.strictEqual(statusC, "request_sent", "Case 3 should return 'request_sent' -> [Request Sent]");

  // Test D: Already connected
  const mapD = {
    user_B: { status: "accepted", isSender: true, requestId: "req3" }
  };
  const statusD = resolveConnectionStatus(currUserId, "user_B", mapD);
  console.log("Test D (Already connected):", statusD);
  assert.strictEqual(statusD, "connected", "Case 4 should return 'connected' -> [Connected]");

  // Test E: Current user is the same user
  const statusE = resolveConnectionStatus(currUserId, "user_A", mapA);
  console.log("Test E (Current user self match):", statusE);
  assert.strictEqual(statusE, "self", "Case 5 should exclude self");

  console.log("\n🎉 ALL CONNECTION CTA STATE TESTS PASSED SUCCESSFULLY!");
}

runTests();
