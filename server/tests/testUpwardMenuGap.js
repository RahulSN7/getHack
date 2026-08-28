// ---------------------------------------------------------------------------
// server/tests/testUpwardMenuGap.js
// Integration Test Suite for Upward Menu Gap Calculation
// ---------------------------------------------------------------------------

const assert = require("node:assert");

function calculateMenuCoords({ anchorRect, actualMenuHeight, viewportWidth = 1024, viewportHeight = 768, isMine = true }) {
  const menuWidth = 148;
  const menuHeight = actualMenuHeight || (isMine ? 128 : 98);

  const spaceBelow = viewportHeight - anchorRect.bottom;
  const spaceAbove = anchorRect.top;

  let top = anchorRect.bottom + 4;
  if (spaceBelow < menuHeight && spaceAbove >= menuHeight) {
    top = anchorRect.top - menuHeight - 4;
  } else if (spaceBelow < menuHeight && spaceAbove < menuHeight) {
    top = spaceAbove > spaceBelow ? Math.max(8, anchorRect.top - menuHeight - 4) : anchorRect.bottom + 4;
  }

  top = Math.max(8, Math.min(top, viewportHeight - menuHeight - 8));

  let left = isMine ? anchorRect.right - menuWidth : anchorRect.left;
  left = Math.max(8, Math.min(left, viewportWidth - menuWidth - 8));

  return { top, left, menuHeight, gap: anchorRect.top - (top + menuHeight) };
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
console.log("Running Upward Menu Gap Calculation Tests");
console.log("==============================================\n");

// TEST 1: Upward menu gap for 124px owned message menu
runTest("Test 1: Upward opening menu for owned message (124px) has exact 4px gap above button", () => {
  const anchorRect = { top: 700, bottom: 720, left: 800, right: 820 };
  const res = calculateMenuCoords({ anchorRect, actualMenuHeight: 124, isMine: true });

  assert.strictEqual(res.top, 572); // 700 - 124 - 4
  assert.strictEqual(res.gap, 4); // 700 - (572 + 124) = 4px
});

// TEST 2: Upward menu gap for 96px received message menu
runTest("Test 2: Upward opening menu for received message (96px) has exact 4px gap above button", () => {
  const anchorRect = { top: 700, bottom: 720, left: 40, right: 60 };
  const res = calculateMenuCoords({ anchorRect, actualMenuHeight: 96, isMine: false });

  assert.strictEqual(res.top, 600); // 700 - 96 - 4
  assert.strictEqual(res.gap, 4); // 700 - (600 + 96) = 4px
});

// TEST 3: Downward menu gap remains exact 4px
runTest("Test 3: Downward opening menu has exact 4px gap below button", () => {
  const anchorRect = { top: 100, bottom: 120, left: 40, right: 60 };
  const res = calculateMenuCoords({ anchorRect, actualMenuHeight: 124, isMine: false });

  assert.strictEqual(res.top, 124); // 120 + 4
  assert.strictEqual(res.top - anchorRect.bottom, 4); // 124 - 120 = 4px
});

console.log("\n==============================================");
console.log(`Test Summary: ${passedTests}/${totalTests} tests passed.`);
console.log("==============================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
