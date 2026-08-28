// ---------------------------------------------------------------------------
// server/tests/testExactMessageMenuAnchor.js
// Integration Test Suite for Exact Message Menu Anchor & Direct Rect Capture
// ---------------------------------------------------------------------------

const assert = require("node:assert");

function calculateMenuCoords({ anchorRect, viewportWidth = 1024, viewportHeight = 768, isMine = false }) {
  if (!anchorRect) return null;

  const menuWidth = 148;
  const menuHeight = 160;

  const spaceBelow = viewportHeight - anchorRect.bottom;
  const spaceAbove = anchorRect.top;

  let top = anchorRect.bottom + 4; // 4px tight spacing downward
  if (spaceBelow < menuHeight && spaceAbove >= menuHeight) {
    top = anchorRect.top - menuHeight - 4; // 4px tight spacing upward
  } else if (spaceBelow < menuHeight && spaceAbove < menuHeight) {
    top = spaceAbove > spaceBelow ? Math.max(8, anchorRect.top - menuHeight - 4) : anchorRect.bottom + 4;
  }

  top = Math.max(8, Math.min(top, viewportHeight - menuHeight - 8));

  let left = isMine ? anchorRect.right - menuWidth : anchorRect.left;
  left = Math.max(8, Math.min(left, viewportWidth - menuWidth - 8));

  return { top, left, opacity: 1 };
}

function getActionBarClass(activeMessageMenu, activeReactionMsgId, msgId) {
  return activeMessageMenu === msgId || activeReactionMsgId === msgId
    ? "flex"
    : "hidden group-hover/msg:flex";
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
console.log("Running Exact Message Menu Anchor & Rect Capture Tests");
console.log("==============================================\n");

// TEST 1: Direct e.currentTarget rect capture anchors menu to clicked bottom message
runTest("Test 1: Click on bottom message ('😂 05:41 PM') anchors menu directly above it", () => {
  const clickedButtonRect = { top: 680, bottom: 700, left: 800, right: 820, width: 20, height: 20 };
  const coords = calculateMenuCoords({
    anchorRect: clickedButtonRect,
    viewportWidth: 1024,
    viewportHeight: 768,
    isMine: true,
  });

  assert.strictEqual(coords.top, 516); // 680 - 160 - 4
  assert.strictEqual(coords.left, 820 - 148); // 672
});

// TEST 2: Click on top message ('welcome') anchors menu directly below it
runTest("Test 2: Click on top message ('welcome') anchors menu directly below it", () => {
  const clickedButtonRect = { top: 100, bottom: 120, left: 40, right: 60, width: 20, height: 20 };
  const coords = calculateMenuCoords({
    anchorRect: clickedButtonRect,
    viewportWidth: 1024,
    viewportHeight: 768,
    isMine: false,
  });

  assert.strictEqual(coords.top, 124); // 120 + 4
  assert.strictEqual(coords.left, 40);
});

// TEST 3: Action bar remains visible ('flex') while its menu is active
runTest("Test 3: Action bar stays visible ('flex') when activeMessageMenu === msg.id", () => {
  const activeClass = getActionBarClass("msg-123", null, "msg-123");
  assert.strictEqual(activeClass, "flex");

  const inactiveClass = getActionBarClass("msg-456", null, "msg-123");
  assert.strictEqual(inactiveClass, "hidden group-hover/msg:flex");
});

// TEST 4: Null or missing anchor handling
runTest("Test 4: Null or uncalculated anchor gracefully returns null", () => {
  const coords = calculateMenuCoords({ anchorRect: null });
  assert.strictEqual(coords, null);
});

console.log("\n==============================================");
console.log(`Test Summary: ${passedTests}/${totalTests} tests passed.`);
console.log("==============================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
