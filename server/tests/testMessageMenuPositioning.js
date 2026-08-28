// ---------------------------------------------------------------------------
// server/tests/testMessageMenuPositioning.js
// Unit & Logic Test Suite for Smart Message Action Menu Positioning
// ---------------------------------------------------------------------------

const assert = require("node:assert");

function calculateMenuDirection(btnRect, containerRect, menuHeight = 150) {
  const spaceBelow = containerRect.bottom - btnRect.bottom;
  const spaceAbove = btnRect.top - containerRect.top;

  if (spaceBelow < menuHeight && spaceAbove >= menuHeight) {
    return "up";
  }
  if (spaceBelow < menuHeight && spaceAbove < menuHeight) {
    return spaceAbove > spaceBelow ? "up" : "down";
  }
  return "down";
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
console.log("Running Smart Message Menu Positioning Tests");
console.log("==============================================\n");

// TEST 1: Bottom message (insufficient space below -> opens UPWARD)
runTest("Test 1: Bottom message with spaceAbove >= 150 and spaceBelow < 150 opens UPWARD", () => {
  const containerRect = { top: 100, bottom: 600 }; // height = 500
  const btnRect = { top: 550, bottom: 580 }; // 20px from bottom (spaceBelow = 20, spaceAbove = 450)

  const direction = calculateMenuDirection(btnRect, containerRect, 150);
  assert.strictEqual(direction, "up");
});

// TEST 2: Top message (insufficient space above -> opens DOWNWARD)
runTest("Test 2: Top message with spaceAbove < 150 opens DOWNWARD", () => {
  const containerRect = { top: 100, bottom: 600 };
  const btnRect = { top: 110, bottom: 130 }; // 10px from top (spaceAbove = 10, spaceBelow = 470)

  const direction = calculateMenuDirection(btnRect, containerRect, 150);
  assert.strictEqual(direction, "down");
});

// TEST 3: Middle message with ample space below -> opens DOWNWARD
runTest("Test 3: Middle message with ample space below opens DOWNWARD", () => {
  const containerRect = { top: 100, bottom: 600 };
  const btnRect = { top: 200, bottom: 220 }; // spaceBelow = 380, spaceAbove = 100

  const direction = calculateMenuDirection(btnRect, containerRect, 150);
  assert.strictEqual(direction, "down");
});

// TEST 4: Constrained container pick side with more space
runTest("Test 4: Constrained container picks direction with greater available space", () => {
  const containerRect = { top: 100, bottom: 240 }; // height = 140
  const btnRect = { top: 180, bottom: 200 }; // spaceAbove = 80, spaceBelow = 40

  const direction = calculateMenuDirection(btnRect, containerRect, 150);
  assert.strictEqual(direction, "up");
});

console.log("\n==============================================");
console.log(`Test Summary: ${passedTests}/${totalTests} tests passed.`);
console.log("==============================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
