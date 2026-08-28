// ---------------------------------------------------------------------------
// server/tests/testContainerViewportMenuDirection.js
// Integration Test Suite for Container Viewport Menu Direction
// ---------------------------------------------------------------------------

const assert = require("node:assert");

function calculateContainerMenuCoords({ anchorRect, containerRect, actualMenuHeight, viewportWidth = 1024, viewportHeight = 768, isMine = true }) {
  const menuWidth = 148;
  const menuHeight = actualMenuHeight || (isMine ? 128 : 98);
  const GAP = 6;
  const requiredSpace = menuHeight + GAP;

  const container = containerRect || { top: 0, bottom: viewportHeight, left: 0, right: viewportWidth };

  const spaceBelow = container.bottom - anchorRect.bottom;
  const spaceAbove = anchorRect.top - container.top;

  let top = anchorRect.bottom + GAP;
  let direction = "down";

  if (spaceBelow < requiredSpace && spaceAbove >= requiredSpace) {
    top = anchorRect.top - menuHeight - GAP;
    direction = "up";
  } else if (spaceBelow < requiredSpace && spaceAbove < requiredSpace) {
    top = spaceAbove > spaceBelow ? Math.max(container.top + 8, anchorRect.top - menuHeight - GAP) : anchorRect.bottom + GAP;
    direction = spaceAbove > spaceBelow ? "up" : "down";
  }

  top = Math.max(8, Math.min(top, viewportHeight - menuHeight - 8));

  let left = isMine ? anchorRect.right - menuWidth : anchorRect.left;
  left = Math.max(8, Math.min(left, viewportWidth - menuWidth - 8));

  return { top, left, direction, menuHeight, spaceBelow, spaceAbove };
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
console.log("Running Container Viewport Menu Direction Tests");
console.log("==============================================\n");

// TEST 1: Last message in chat container opens UPWARD with 6px gap
runTest("Test 1: Last message at bottom of chat container opens UPWARD with 6px gap", () => {
  const containerRect = { top: 100, bottom: 750, left: 0, right: 1024 };
  const anchorRect = { top: 700, bottom: 720, left: 800, right: 820 };

  const res = calculateContainerMenuCoords({ anchorRect, containerRect, actualMenuHeight: 124, isMine: true });

  assert.strictEqual(res.direction, "up");
  assert.strictEqual(res.top, 570); // 700 - 124 - 6
  assert.strictEqual(anchorRect.top - (res.top + res.menuHeight), 6); // 6px gap above trigger
  assert.ok(res.top + res.menuHeight < containerRect.bottom); // strictly inside container
});

// TEST 2: Middle message in chat container opens DOWNWARD with 6px gap
runTest("Test 2: Middle message with space below opens DOWNWARD with 6px gap", () => {
  const containerRect = { top: 100, bottom: 750, left: 0, right: 1024 };
  const anchorRect = { top: 300, bottom: 320, left: 800, right: 820 };

  const res = calculateContainerMenuCoords({ anchorRect, containerRect, actualMenuHeight: 124, isMine: true });

  assert.strictEqual(res.direction, "down");
  assert.strictEqual(res.top, 326); // 320 + 6
  assert.strictEqual(res.top - anchorRect.bottom, 6); // 6px gap below trigger
});

// TEST 3: Received message (96px height) near bottom opens UPWARD
runTest("Test 3: Received message (96px height) near bottom of container opens UPWARD", () => {
  const containerRect = { top: 100, bottom: 750, left: 0, right: 1024 };
  const anchorRect = { top: 680, bottom: 700, left: 40, right: 60 };

  const res = calculateContainerMenuCoords({ anchorRect, containerRect, actualMenuHeight: 96, isMine: false });

  assert.strictEqual(res.direction, "up");
  assert.strictEqual(res.top, 578); // 680 - 96 - 6
  assert.strictEqual(anchorRect.top - (res.top + res.menuHeight), 6); // 6px gap
});

console.log("\n==============================================");
console.log(`Test Summary: ${passedTests}/${totalTests} tests passed.`);
console.log("==============================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
