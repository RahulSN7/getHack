// ---------------------------------------------------------------------------
// server/tests/testWhatsAppFloatingMenu.js
// Unit & Logic Test Suite for WhatsApp-Style Floating Action Menu Coordinates
// ---------------------------------------------------------------------------

const assert = require("node:assert");

function calculateWhatsAppMenuCoords({ btnRect, windowHeight = 800, windowWidth = 1200, menuWidth = 148, menuHeight = 150, isMine = false }) {
  const spaceBelow = windowHeight - btnRect.bottom;
  const spaceAbove = btnRect.top;

  let top = btnRect.bottom + 4; // default downward
  if (spaceBelow < menuHeight && spaceAbove >= menuHeight) {
    top = btnRect.top - menuHeight - 4; // upward anchor
  } else if (spaceBelow < menuHeight && spaceAbove < menuHeight) {
    top = spaceAbove > spaceBelow ? Math.max(8, btnRect.top - menuHeight - 4) : btnRect.bottom + 4;
  }

  // Clamp vertical position
  top = Math.max(8, Math.min(top, windowHeight - menuHeight - 8));

  // Horizontal position
  let left = isMine ? btnRect.right - menuWidth : btnRect.left;
  left = Math.max(8, Math.min(left, windowWidth - menuWidth - 8));

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
console.log("Running WhatsApp Floating Menu Coordinate Tests");
console.log("==============================================\n");

// TEST 1: Bottom message (Hackathon Invitation near bottom of screen)
runTest("Test 1: Bottom message anchors UPWARD above the ⋮ button", () => {
  const btnRect = { top: 720, bottom: 740, left: 900, right: 920 };
  const coords = calculateWhatsAppMenuCoords({ btnRect, windowHeight: 800, windowWidth: 1200, isMine: true });

  // 720 - 150 - 4 = 566
  assert.strictEqual(coords.top, 566);
  assert.strictEqual(coords.left, 920 - 148); // 772
});

// TEST 2: Top message
runTest("Test 2: Top message anchors DOWNWARD below the ⋮ button", () => {
  const btnRect = { top: 50, bottom: 70, left: 100, right: 120 };
  const coords = calculateWhatsAppMenuCoords({ btnRect, windowHeight: 800, windowWidth: 1200, isMine: false });

  // 70 + 4 = 74
  assert.strictEqual(coords.top, 74);
  assert.strictEqual(coords.left, 100);
});

// TEST 3: Horizontal right edge clamping
runTest("Test 3: Menu position is clamped within viewport boundaries", () => {
  const btnRect = { top: 720, bottom: 740, left: 1180, right: 1195 }; // Near right boundary
  const coords = calculateWhatsAppMenuCoords({ btnRect, windowHeight: 800, windowWidth: 1200, isMine: true });

  // 1200 - 148 - 8 = 1044 (clamped to prevent right clipping)
  assert.ok(coords.left <= 1200 - 148 - 8);
});

console.log("\n==============================================");
console.log(`Test Summary: ${passedTests}/${totalTests} tests passed.`);
console.log("==============================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
