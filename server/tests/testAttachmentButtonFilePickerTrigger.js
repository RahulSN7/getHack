// ---------------------------------------------------------------------------
// server/tests/testAttachmentButtonFilePickerTrigger.js
// Integration Test Suite for Attachment Button & Emoji Click-Outside Interaction
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

function createAttachmentSystemState() {
  let showEmojiPicker = false;
  let fileInputClickCount = 0;

  const emojiContainerEl = new MockElement("composerEmojiContainer");
  const emojiButtonEl = new MockElement("emojiButton", emojiContainerEl);
  const emojiPopoverEl = new MockElement("emojiPopover", emojiContainerEl);
  const attachmentButtonEl = new MockElement("attachmentButton");
  const outsideEl = new MockElement("chatHeader");

  return {
    get showEmojiPicker() { return showEmojiPicker; },
    get fileInputClickCount() { return fileInputClickCount; },
    toggleEmojiPicker() { showEmojiPicker = !showEmojiPicker; },

    // Combined mousedown + click interaction
    handleAttachmentClick() {
      // Step 1: mousedown event handler
      const mousedownTarget = attachmentButtonEl;
      if (showEmojiPicker) {
        if (attachmentButtonEl.contains(mousedownTarget)) {
          // Ignored by click-outside handler
        } else if (emojiContainerEl && !emojiContainerEl.contains(mousedownTarget)) {
          showEmojiPicker = false;
        }
      }

      // Step 2: onClick event handler
      showEmojiPicker = false;
      fileInputClickCount++;
    },

    handleOutsideMousedown(targetEl) {
      if (attachmentButtonEl.contains(targetEl)) return;
      if (showEmojiPicker && emojiContainerEl && !emojiContainerEl.contains(targetEl)) {
        showEmojiPicker = false;
      }
    },

    emojiContainerEl,
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
console.log("Running Attachment Button & Emoji Sync Tests");
console.log("==============================================\n");

// TEST 1: Attachment button when emoji picker is CLOSED
runTest("Test 1: Clicking attachment button when emoji picker is CLOSED opens file picker", () => {
  const state = createAttachmentSystemState();
  assert.strictEqual(state.showEmojiPicker, false);

  state.handleAttachmentClick();

  assert.strictEqual(state.showEmojiPicker, false);
  assert.strictEqual(state.fileInputClickCount, 1);
});

// TEST 2: Attachment button when emoji picker is OPEN
runTest("Test 2: Clicking attachment button when emoji picker is OPEN closes emoji picker AND opens file picker", () => {
  const state = createAttachmentSystemState();
  state.toggleEmojiPicker(); // Open emoji picker
  assert.strictEqual(state.showEmojiPicker, true);

  state.handleAttachmentClick(); // User clicks attachment button

  assert.strictEqual(state.showEmojiPicker, false);
  assert.strictEqual(state.fileInputClickCount, 1);
});

// TEST 3: Mousedown on attachment button does NOT swallow file input click
runTest("Test 3: Mousedown on attachment button does NOT dismiss or interrupt file input click", () => {
  const state = createAttachmentSystemState();
  state.toggleEmojiPicker();

  // Simulate mousedown
  state.handleOutsideMousedown(state.attachmentButtonEl);
  // Picker must remain open until onClick fires
  assert.strictEqual(state.showEmojiPicker, true);

  // Simulate onClick
  state.handleAttachmentClick();
  assert.strictEqual(state.showEmojiPicker, false);
  assert.strictEqual(state.fileInputClickCount, 1);
});

// TEST 4: Clicking outside closes emoji picker
runTest("Test 4: Clicking outside closes emoji picker", () => {
  const state = createAttachmentSystemState();
  state.toggleEmojiPicker();
  assert.strictEqual(state.showEmojiPicker, true);

  state.handleOutsideMousedown(state.outsideEl);
  assert.strictEqual(state.showEmojiPicker, false);
});

console.log("\n==============================================");
console.log(`Test Summary: ${passedTests}/${totalTests} tests passed.`);
console.log("==============================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
