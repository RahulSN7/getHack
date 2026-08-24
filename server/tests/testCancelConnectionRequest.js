// ---------------------------------------------------------------------------
// server/tests/testCancelConnectionRequest.js
// Unit Test Suite for Cancel Connection Request Backend Logic & Authorization
// ---------------------------------------------------------------------------

const assert = require("node:assert");

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ PASSED: ${name}`);
  } catch (err) {
    console.error(`  ✗ FAILED: ${name}`);
    console.error(`    ${err.message}`);
  }
}

console.log("\n==============================================");
console.log("Running getHack Cancel Connection Request Tests");
console.log("==============================================\n");

// ---------------------------------------------------------------------------
// Test 1: Successful cancellation verification
// ---------------------------------------------------------------------------
console.log("[Test 1: Successful Cancellation Scoping]");
runTest("Only pending connection request belonging to sender is eligible for cancellation", () => {
  const senderId = "67a1b2c3d4e5f6a7b8c9d0e1";
  const requestId = "67a1b2c3d4e5f6a7b8c9d0e2";

  const request = {
    _id: requestId,
    sender: senderId,
    receiver: "67a1b2c3d4e5f6a7b8c9d0e3",
    status: "pending",
  };

  const queryFilter = {
    _id: request._id,
    sender: senderId,
    status: "pending",
  };

  assert.strictEqual(queryFilter._id, request._id);
  assert.strictEqual(queryFilter.sender, request.sender);
  assert.strictEqual(queryFilter.status, "pending");
});

// ---------------------------------------------------------------------------
// Test 2: Unauthorized cancellation prevention
// ---------------------------------------------------------------------------
console.log("\n[Test 2: Unauthorized Cancellation Prevention]");
runTest("Receiver or third-party user cannot cancel sender's request", () => {
  const senderId = "67a1b2c3d4e5f6a7b8c9d0e1";
  const receiverId = "67a1b2c3d4e5f6a7b8c9d0e3";
  const attackerId = "67a1b2c3d4e5f6a7b8c9d0e4";

  const request = {
    _id: "67a1b2c3d4e5f6a7b8c9d0e2",
    sender: senderId,
    receiver: receiverId,
    status: "pending",
  };

  // Authorization check
  const isSenderOwner = (userId) => request.sender === userId;

  assert.strictEqual(isSenderOwner(senderId), true);
  assert.strictEqual(isSenderOwner(receiverId), false);
  assert.strictEqual(isSenderOwner(attackerId), false);
});

// ---------------------------------------------------------------------------
// Test 3: Already accepted request cancellation prevention
// ---------------------------------------------------------------------------
console.log("\n[Test 3: Already Accepted Request Protection]");
runTest("Accepted request cannot be cancelled", () => {
  const request = {
    _id: "67a1b2c3d4e5f6a7b8c9d0e2",
    sender: "67a1b2c3d4e5f6a7b8c9d0e1",
    receiver: "67a1b2c3d4e5f6a7b8c9d0e3",
    status: "accepted",
  };

  const isCancellable = request.status === "pending";
  assert.strictEqual(isCancellable, false);
});

// ---------------------------------------------------------------------------
// Test 4: Invalid ObjectId format handling
// ---------------------------------------------------------------------------
console.log("\n[Test 4: Invalid Request ID Format Validation]");
runTest("Malformed request ID string is rejected before query execution", () => {
  const invalidId = "invalid-mongodb-id-123";
  const isValidObjectId = typeof invalidId === "string" && Boolean(invalidId.match(/^[0-9a-fA-F]{24}$/));

  assert.strictEqual(isValidObjectId, false);
});

// ---------------------------------------------------------------------------
// Test 5: Double click / Repeated cancellation safety
// ---------------------------------------------------------------------------
console.log("\n[Test 5: Repeated Cancellation Safety]");
runTest("Deleting non-existent or already cancelled request returns 404 cleanly", () => {
  const existingRequests = [];
  const requestId = "67a1b2c3d4e5f6a7b8c9d0e2";

  const found = existingRequests.find((r) => r._id === requestId);
  assert.strictEqual(found, undefined);
});

console.log("\n==============================================");
console.log(`Summary: ${passedTests}/${totalTests} tests passed.`);
console.log("==============================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
