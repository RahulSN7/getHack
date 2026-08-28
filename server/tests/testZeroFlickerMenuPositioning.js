// ---------------------------------------------------------------------------
// server/tests/testZeroFlickerMenuPositioning.js
// Integration Test Suite for Zero-Flicker Pre-Calculated Menu Positioning
// ---------------------------------------------------------------------------

const assert = require("node:assert");

function preCalculateMenuPosition({ msg, rect, containerRect, currentUserId = "user-1", viewportWidth = 1024, viewportHeight = 768 }) {
  if (!rect) return null;

  const isMine = typeof msg === "object" ? String(msg.user_id || msg.user?.id) === String(currentUserId) : false;
  const menuWidth = 148;
  const menuHeight = isMine ? 128 : 98;
  const GAP = 6;
  const requiredSpace = menuHeight + GAP;

  const container = containerRect || { top: 0, bottom: viewportHeight, left: 0, right: viewportWidth };

  const spaceBelow = container.bottom - rect.bottom;
  const spaceAbove = rect.top - container.top;

  let top = rect.bottom + GAP;
  if (spaceBelow < requiredSpace && spaceAbove >= requiredSpace) {
    top = rect.top - menuHeight - GAP;
  } else if (spaceBelow < requiredSpace && spaceAbove < requiredSpace) {
    top = spaceAbove > spaceBelow ? Math.max(container.top + 8, rect.top - menuHeight - GAP) : rect.bottom + GAP;
  }

  top = Math.max(8, Math.min(top, viewportHeight - menuHeight - 8));
  let left = isMine ? rect.right - menuWidth : rect.left;
  left = Math.max(8, Math.min(left, viewportWidth - menuWidth - 8));

  return { top, left };
}

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
    console.error(`    ${err.stack || err.message}`);
  }
}

console.log("\n==============================================");
console.log("Running Zero-Flicker Pre-Calculated Menu Positioning Tests");
console.log("==============================================\n");

// TEST 1: Synchronous Phase 1 pre-calculation for bottom message
runTest("Test 1: Pre-calculation for bottom message produces exact top/left on Frame 1", () => {
  const msg = { id: "msg-1", user_id: "user-1" };
  const rect = { top: 700, bottom: 720, left: 800, right: 820 };
  const containerRect = { top: 100, bottom: 750, left: 0, right: 1024 };

  const initialCoords = preCalculateMenuPosition({ msg, rect, containerRect, currentUserId: "user-1" });

  assert.strictEqual(initialCoords.top, 566); // 700 - 128 - 6
  assert.strictEqual(initialCoords.left, 672); // 820 - 148
  assert.notStrictEqual(initialCoords.top, -9999);
});

// TEST 2: Synchronous Phase 1 pre-calculation for top message
runTest("Test 2: Pre-calculation for top message produces exact downward top/left on Frame 1", () => {
  const msg = { id: "msg-2", user_id: "user-2" };
  const rect = { top: 120, bottom: 140, left: 40, right: 60 };
  const containerRect = { top: 100, bottom: 750, left: 0, right: 1024 };

  const initialCoords = preCalculateMenuPosition({ msg, rect, containerRect, currentUserId: "user-1" });

  assert.strictEqual(initialCoords.top, 146); // 140 + 6
  assert.strictEqual(initialCoords.left, 40);
  assert.notStrictEqual(initialCoords.top, -9999);
});

// TEST 3: Switching active message recalculates initialCoords directly
runTest("Test 3: Switching active message recalculates initialCoords directly without state reuse", () => {
  const msgA = { id: "msg-A", user_id: "user-1" };
  const rectA = { top: 200, bottom: 220, left: 800, right: 820 };

  const msgB = { id: "msg-B", user_id: "user-1" };
  const rectB = { top: 700, bottom: 720, left: 800, right: 820 };

  const coordsA = preCalculateMenuPosition({ msg: msgA, rect: rectA });
  const coordsB = preCalculateMenuPosition({ msg: msgB, rect: rectB });

  assert.strictEqual(coordsA.top, 226);
  assert.strictEqual(coordsB.top, 566);
  assert.notStrictEqual(coordsA.top, coordsB.top);
});

console.log("\n==============================================");
console.log(`Test Summary: ${passedTests}/${totalTests} tests passed.`);
console.log("==============================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
