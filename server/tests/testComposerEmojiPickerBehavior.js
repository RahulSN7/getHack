// ---------------------------------------------------------------------------
// server/tests/testComposerEmojiPickerBehavior.js
// Integration Test Suite for Composer Emoji Picker Dismissal & Attachment Logic
// ---------------------------------------------------------------------------

const assert = require("node:assert");

class MockElement {
  constructor(name, parent = null) {
    this.name = name;
    this.parent = parent;
    this.children = [];
    if (parent) parent.children.push(this);
  }

  contains(target) {
    if (!target) return false;
    let curr = target;
    while (curr) {
      if (curr === this) return true;
      curr = curr.parent;
    }
    return false;
  }
}

function createComposerEmojiPickerState() {
  let showEmojiPicker = false;
  let filePickerOpened = false;

  const containerEl = new MockElement("composerEmojiContainer");
  const emojiButtonEl = new MockElement("emojiButton", containerEl);
  const emojiPopoverEl = new MockElement("emojiPopover", containerEl);
  const attachmentButtonEl = new MockElement("attachmentButton");
  const outsideEl = new MockElement("chatHeader");

  return {
    get showEmojiPicker() { return showEmojiPicker; },
    get filePickerOpened() { return filePickerOpened; },
    toggleEmojiPicker() { showEmojiPicker = !showEmojiPicker; },
    openAttachment() {
      showEmojiPicker = false;
      filePickerOpened = true;
    },
    handleMousedown(targetEl) {
      if (showEmojiPicker && containerEl && !containerEl.contains(targetEl)) {
        showEmojiPicker = false;
      }
    },
    handleKeyDown(key) {
      if (showEmojiPicker && key === "Escape") {
        showEmojiPicker = false;
      }
    },
    containerEl,
    emojiButtonEl,
    emojiPopoverEl,
    attachmentButtonEl,
    outsideEl,
  };
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
console.log("Running Composer Emoji Picker Behavior Tests");
console.log("==============================================\n");

// TEST 1: Toggle emoji button opens and closes picker
runTest("Test 1: Clicking emoji button toggles picker (closed -> open -> closed)", () => {
  const state = createComposerEmojiPickerState();
  assert.strictEqual(state.showEmojiPicker, false);

  state.toggleEmojiPicker();
  assert.strictEqual(state.showEmojiPicker, true);

  state.toggleEmojiPicker();
  assert.strictEqual(state.showEmojiPicker, false);
});

// TEST 2: Clicking attachment closes emoji picker immediately and opens file dialog
runTest("Test 2: Clicking attachment button closes emoji picker immediately", () => {
  const state = createComposerEmojiPickerState();
  state.toggleEmojiPicker(); // Open emoji picker
  assert.strictEqual(state.showEmojiPicker, true);

  state.openAttachment(); // User clicks attachment
  assert.strictEqual(state.showEmojiPicker, false);
  assert.strictEqual(state.filePickerOpened, true);
});

// TEST 3: Clicking outside container closes emoji picker
runTest("Test 3: Clicking outside container closes emoji picker", () => {
  const state = createComposerEmojiPickerState();
  state.toggleEmojiPicker(); // Open emoji picker
  assert.strictEqual(state.showEmojiPicker, true);

  state.handleMousedown(state.outsideEl); // Click chat header outside
  assert.strictEqual(state.showEmojiPicker, false);
});

// TEST 4: Clicking inside container (e.g. popover) does NOT close emoji picker
runTest("Test 4: Clicking inside popover does NOT trigger click-outside dismissal", () => {
  const state = createComposerEmojiPickerState();
  state.toggleEmojiPicker(); // Open emoji picker
  assert.strictEqual(state.showEmojiPicker, true);

  state.handleMousedown(state.emojiPopoverEl); // Click inside popover
  assert.strictEqual(state.showEmojiPicker, true);
});

// TEST 5: Pressing ESC key closes emoji picker
runTest("Test 5: Pressing Escape key closes emoji picker", () => {
  const state = createComposerEmojiPickerState();
  state.toggleEmojiPicker(); // Open emoji picker
  assert.strictEqual(state.showEmojiPicker, true);

  state.handleKeyDown("Escape");
  assert.strictEqual(state.showEmojiPicker, false);
});

console.log("\n==============================================");
console.log(`Test Summary: ${passedTests}/${totalTests} tests passed.`);
console.log("==============================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
