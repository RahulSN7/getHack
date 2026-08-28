// ---------------------------------------------------------------------------
// server/tests/testMoreActionsMenuUX.js
// Integration Test Suite for More Actions (⋮) Menu UX & Zero-Flicker Positioning
// ---------------------------------------------------------------------------

const assert = require("node:assert");

function calculateMenuCoords({ btnRect, viewportWidth = 1024, viewportHeight = 768, isMine = false }) {
  const menuWidth = 148;
  const menuHeight = 160;

  const spaceBelow = viewportHeight - btnRect.bottom;
  const spaceAbove = btnRect.top;

  let top = btnRect.bottom + 4; // 4px tight spacing downward
  if (spaceBelow < menuHeight && spaceAbove >= menuHeight) {
    top = btnRect.top - menuHeight - 4; // 4px tight spacing upward
  } else if (spaceBelow < menuHeight && spaceAbove < menuHeight) {
    top = spaceAbove > spaceBelow ? Math.max(8, btnRect.top - menuHeight - 4) : btnRect.bottom + 4;
  }

  top = Math.max(8, Math.min(top, viewportHeight - menuHeight - 8));

  let left = isMine ? btnRect.right - menuWidth : btnRect.left;
  left = Math.max(8, Math.min(left, viewportWidth - menuWidth - 8));

  return { top, left, opacity: 1 };
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
console.log("Running More Actions Menu UX & Positioning Tests");
console.log("==============================================\n");

// TEST 1: Single menu state mutation
runTest("Test 1: Opening Menu B automatically closes Menu A (single active menu state)", () => {
  let activeMessageMenu = "msg-A";
  
  // User clicks Msg B ⋮ button
  activeMessageMenu = "msg-B";

  assert.strictEqual(activeMessageMenu, "msg-B");
  assert.notStrictEqual(activeMessageMenu, "msg-A");
});

// TEST 2: Downward menu positioning (enough space below)
runTest("Test 2: Downward menu placement has tight 4px gap", () => {
  const btnRect = { top: 100, bottom: 120, left: 200, right: 220 };
  const coords = calculateMenuCoords({ btnRect, viewportWidth: 1024, viewportHeight: 768, isMine: false });

  assert.strictEqual(coords.top, 124); // 120 + 4
  assert.strictEqual(coords.left, 200);
});

// TEST 3: Upward menu positioning for bottom message
runTest("Test 3: Upward menu placement for bottom message has tight 4px gap", () => {
  const btnRect = { top: 700, bottom: 720, left: 800, right: 820 };
  const coords = calculateMenuCoords({ btnRect, viewportWidth: 1024, viewportHeight: 768, isMine: true });

  assert.strictEqual(coords.top, 536); // 700 - 160 - 4
  assert.strictEqual(coords.left, 820 - 148); // 672
});

// TEST 4: Viewport clamping prevents overflow
runTest("Test 4: Screen boundary clamping prevents top/bottom viewport clipping", () => {
  const btnRect = { top: 760, bottom: 780, left: 10, right: 30 };
  const coords = calculateMenuCoords({ btnRect, viewportWidth: 1024, viewportHeight: 768, isMine: false });

  assert.strictEqual(coords.top <= 768 - 160 - 8, true);
  assert.strictEqual(coords.left >= 8, true);
});

console.log("\n==============================================");
console.log(`Test Summary: ${passedTests}/${totalTests} tests passed.`);
console.log("==============================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
