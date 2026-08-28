// ---------------------------------------------------------------------------
// server/tests/testLeftChatPreviewEditSync.js
// Integration Test Suite for Left Chat Preview Edit Synchronization & Precision
// ---------------------------------------------------------------------------

const assert = require("node:assert");

function getConversationPreview(channel) {
  const messages = channel.state?.messages || [];
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  if (!lastMessage) return "No messages yet";

  const isLastMessageEdited = Boolean(
    lastMessage &&
    !lastMessage.deleted_at &&
    lastMessage.type !== "deleted" &&
    (lastMessage.is_edited ||
      lastMessage.message_text_updated_at ||
      (Array.isArray(lastMessage.edit_history) && lastMessage.edit_history.length > 0) ||
      (Array.isArray(lastMessage.extraData?.edit_history) && lastMessage.extraData.edit_history.length > 0))
  );

  let text = "";
  if (lastMessage.deleted_at || lastMessage.type === "deleted") {
    text = "This message was deleted";
  } else if (lastMessage.custom_type === "team_invitation" || lastMessage.type === "team_invitation") {
    text = "🤝 Hackathon Team Invitation";
  } else if (lastMessage.text && lastMessage.text.trim()) {
    text = lastMessage.text.trim();
  } else if (Array.isArray(lastMessage.attachments) && lastMessage.attachments.length > 0) {
    const att = lastMessage.attachments[0];
    const isImg = att.type === "image" || !!att.image_url;
    text = isImg ? "🖼️ Image" : `📎 ${att.title || att.name || "File"}`;
  }

  if (isLastMessageEdited && text && !text.startsWith("This message was deleted") && !text.startsWith("Edited ·")) {
    text = `Edited · ${text}`;
  }

  return text || "No messages yet";
}

function handleStreamMessageUpdateEvent(channelsList, event) {
  const cid = event.cid || event.channel_id;
  return channelsList.map((ch) => {
    if (ch.cid === cid) {
      // Simulate Stream Chat SDK updating internal messages list
      if (event.message && ch.state?.messages) {
        const msgIdx = ch.state.messages.findIndex((m) => m.id === event.message.id);
        if (msgIdx !== -1) {
          ch.state.messages[msgIdx] = { ...ch.state.messages[msgIdx], ...event.message };
        } else {
          ch.state.messages.push(event.message);
        }
      }
      return Object.assign(Object.create(Object.getPrototypeOf(ch)), ch);
    }
    return ch;
  });
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
console.log("Running Left Chat Preview Edit Sync Tests");
console.log("==============================================\n");

// TEST 1: Unedited latest message shows plain text
runTest("Test 1: Unedited latest message preview shows plain text", () => {
  const channel = {
    cid: "messaging:c1",
    state: {
      messages: [{ id: "m1", text: "Hello Rahul", created_at: "2026-08-28T17:00:00.000Z" }],
    },
  };

  assert.strictEqual(getConversationPreview(channel), "Hello Rahul");
});

// TEST 2: Editing the latest message updates preview to 'Edited · <new text>'
runTest("Test 2: Editing the latest message updates preview to 'Edited · <new text>'", () => {
  let channel = {
    cid: "messaging:c1",
    state: {
      messages: [{ id: "m1", text: "Hello Rahul", created_at: "2026-08-28T17:00:00.000Z" }],
    },
  };

  const updateEvent = {
    cid: "messaging:c1",
    type: "message.updated",
    message: {
      id: "m1",
      text: "Hello Rahul, how are you?",
      is_edited: true,
      edit_history: [{ text: "Hello Rahul" }],
    },
  };

  const updatedChannels = handleStreamMessageUpdateEvent([channel], updateEvent);
  const updatedPreview = getConversationPreview(updatedChannels[0]);

  assert.strictEqual(updatedPreview, "Edited · Hello Rahul, how are you?");
});

// TEST 3: Editing an OLDER message preserves the actual latest message preview
runTest("Test 3: Editing an older message preserves the actual latest message preview", () => {
  let channel = {
    cid: "messaging:c1",
    state: {
      messages: [
        { id: "m1", text: "First Message", created_at: "2026-08-28T17:00:00.000Z" },
        { id: "m2", text: "Latest Message", created_at: "2026-08-28T17:05:00.000Z" },
      ],
    },
  };

  // Edit message 1 (older)
  const updateEvent = {
    cid: "messaging:c1",
    type: "message.updated",
    message: {
      id: "m1",
      text: "Edited First Message",
      is_edited: true,
      edit_history: [{ text: "First Message" }],
    },
  };

  const updatedChannels = handleStreamMessageUpdateEvent([channel], updateEvent);
  const updatedPreview = getConversationPreview(updatedChannels[0]);

  // Preview MUST remain the latest message in chronological order
  assert.strictEqual(updatedPreview, "Latest Message");
});

// TEST 4: Deleting the latest message updates preview to 'This message was deleted'
runTest("Test 4: Deleting the latest message updates preview to 'This message was deleted'", () => {
  let channel = {
    cid: "messaging:c1",
    state: {
      messages: [{ id: "m1", text: "Hello", created_at: "2026-08-28T17:00:00.000Z" }],
    },
  };

  const deleteEvent = {
    cid: "messaging:c1",
    type: "message.deleted",
    message: {
      id: "m1",
      type: "deleted",
      deleted_at: "2026-08-28T17:06:00.000Z",
    },
  };

  const updatedChannels = handleStreamMessageUpdateEvent([channel], deleteEvent);
  const updatedPreview = getConversationPreview(updatedChannels[0]);

  assert.strictEqual(updatedPreview, "This message was deleted");
});

console.log("\n==============================================");
console.log(`Test Summary: ${passedTests}/${totalTests} tests passed.`);
console.log("==============================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
