// ---------------------------------------------------------------------------
// server/tests/testRealtimeLeftChatPreviewSync.js
// Integration Test Suite for Real-Time Left Chat Preview & Sorting Sync
// ---------------------------------------------------------------------------

const assert = require("node:assert");

function getChannelLatestTimestamp(channel, clearedAt) {
  if (!channel) return 0;
  const clearTime = clearedAt ? new Date(clearedAt).getTime() : 0;
  const rawMessages = channel.state?.messages || [];
  const visibleMessages = clearTime
    ? rawMessages.filter((m) => {
        const t = new Date(m.created_at || m.createdAt).getTime();
        return !isNaN(t) && t > clearTime;
      })
    : rawMessages;

  if (visibleMessages.length > 0) {
    const lastMsg = visibleMessages[visibleMessages.length - 1];
    const t = new Date(lastMsg.created_at || lastMsg.createdAt).getTime();
    if (!isNaN(t)) return t;
  }

  const lastAt = channel.state?.last_message_at || channel.data?.last_message_at || channel.created_at;
  const t = lastAt ? new Date(lastAt).getTime() : 0;
  return isNaN(t) ? 0 : t;
}

function sortChannelsByLatest(channelsList, chatStatesMap = {}) {
  return [...channelsList].sort((a, b) => {
    const timeA = getChannelLatestTimestamp(a, chatStatesMap[a.cid]?.clearedAt);
    const timeB = getChannelLatestTimestamp(b, chatStatesMap[b.cid]?.clearedAt);
    return timeB - timeA;
  });
}

function getConversationPreviewText(channel, clearedAt) {
  const clearTime = clearedAt ? new Date(clearedAt).getTime() : 0;
  const rawMessages = channel.state?.messages || [];
  const visibleMessages = clearTime
    ? rawMessages.filter((m) => {
        const t = new Date(m.created_at || m.createdAt).getTime();
        return !isNaN(t) && t > clearTime;
      })
    : rawMessages;

  const lastMessage = visibleMessages.length > 0 ? visibleMessages[visibleMessages.length - 1] : null;

  if (!lastMessage) return "No messages yet";

  if (lastMessage.deleted_at || lastMessage.type === "deleted") {
    return "This message was deleted";
  }

  if (lastMessage.custom_type === "team_invitation" || lastMessage.type === "team_invitation") {
    return "🤝 Hackathon Team Invitation";
  }

  const isEdited = Boolean(
    !lastMessage.deleted_at &&
    lastMessage.type !== "deleted" &&
    (lastMessage.is_edited ||
      lastMessage.message_text_updated_at ||
      (Array.isArray(lastMessage.edit_history) && lastMessage.edit_history.length > 0) ||
      (Array.isArray(lastMessage.extraData?.edit_history) && lastMessage.extraData.edit_history.length > 0))
  );

  let text = "";
  if (lastMessage.text && lastMessage.text.trim()) {
    text = lastMessage.text.trim();
  } else if (Array.isArray(lastMessage.attachments) && lastMessage.attachments.length > 0) {
    const att = lastMessage.attachments[0];
    const isImg = att.type === "image" || !!att.image_url;
    const title = att.title || att.name || "File";
    text = isImg ? "🖼️ Image" : `📎 ${title}`;
  }

  if (isEdited && text && !text.startsWith("This message was deleted") && !text.startsWith("Edited ·")) {
    text = `Edited · ${text}`;
  }

  return text || "Message";
}

function processIncomingMessageEvent(channelsList, event, activeCid = null) {
  const cid = event.cid || event.channel_id;
  let updatedList = [...channelsList];
  let targetChan = updatedList.find((ch) => ch.cid === cid);

  if (!targetChan && event.channel) {
    targetChan = event.channel;
    updatedList.push(targetChan);
  }

  if (targetChan) {
    if (!targetChan.state) targetChan.state = { messages: [], unreadCount: 0 };
    if (!targetChan.state.messages) targetChan.state.messages = [];

    if (event.message) {
      const msg = event.message;
      const idx = targetChan.state.messages.findIndex((m) => m.id === msg.id);

      if (event.type === "message.deleted" || msg.type === "deleted" || msg.deleted_at) {
        if (idx !== -1) {
          targetChan.state.messages[idx] = {
            ...targetChan.state.messages[idx],
            ...msg,
            deleted_at: msg.deleted_at || new Date().toISOString(),
            type: "deleted",
          };
        }
      } else if (idx !== -1) {
        targetChan.state.messages[idx] = {
          ...targetChan.state.messages[idx],
          ...msg,
        };
      } else if (event.type === "message.new" || event.type === "notification.message_new") {
        targetChan.state.messages.push(msg);
      }

      targetChan.state.last_message_at = msg.created_at || new Date().toISOString();
    }

    if (activeCid === cid) {
      targetChan.state.unreadCount = 0;
    } else if (event.type === "message.new" || event.type === "notification.message_new") {
      targetChan.state.unreadCount = (targetChan.state.unreadCount || 0) + 1;
    }

    const clonedChan = Object.assign(Object.create(Object.getPrototypeOf(targetChan)), targetChan, {
      state: {
        ...targetChan.state,
        messages: [...targetChan.state.messages],
      },
    });

    const listIdx = updatedList.findIndex((ch) => ch.cid === cid);
    if (listIdx !== -1) {
      updatedList[listIdx] = clonedChan;
    } else {
      updatedList.push(clonedChan);
    }
  }

  return sortChannelsByLatest(updatedList);
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
console.log("Running Real-Time Left Chat Preview & Sorting Sync Tests");
console.log("==============================================\n");

// Channel A (Older channel, initial message at 10:00 AM)
const channelA = {
  cid: "messaging:chan-a",
  data: { targetName: "Rahul Singh" },
  state: {
    messages: [
      { id: "m1", text: "Edited · 💯 😮 🙌 👍", created_at: "2026-08-28T10:00:00Z" }
    ],
    unreadCount: 0,
    last_message_at: "2026-08-28T10:00:00Z",
  },
};

// Channel B (Newer channel, initial message at 11:00 AM)
const channelB = {
  cid: "messaging:chan-b",
  data: { targetName: "Priya Sharma" },
  state: {
    messages: [
      { id: "m10", text: "See you tomorrow", created_at: "2026-08-28T11:00:00Z" }
    ],
    unreadCount: 0,
    last_message_at: "2026-08-28T11:00:00Z",
  },
};

let initialList = [channelB, channelA];

// TEST 1: Initial list ordering (Channel B first, Channel A second)
runTest("Test 1: Initial list order — Channel B (11:00) before Channel A (10:00)", () => {
  const sorted = sortChannelsByLatest(initialList);
  assert.strictEqual(sorted[0].cid, "messaging:chan-b");
  assert.strictEqual(sorted[1].cid, "messaging:chan-a");
  assert.strictEqual(getConversationPreviewText(sorted[1]), "Edited · 💯 😮 🙌 👍");
});

// TEST 2: Incoming message for Channel A at 11:50 PM updates preview AND moves Channel A to top
runTest("Test 2: Real-Time Incoming Message — Channel A gets 'hello' at 11:50 PM -> updates preview and moves to top", () => {
  const event = {
    type: "message.new",
    cid: "messaging:chan-a",
    message: {
      id: "m2",
      text: "hello",
      created_at: "2026-08-28T23:50:00Z",
      user: { id: "rahul-id", name: "Rahul Singh" },
    },
  };

  const updatedList = processIncomingMessageEvent(initialList, event, null);

  // Channel A MUST now be at the TOP of the list
  assert.strictEqual(updatedList[0].cid, "messaging:chan-a", "Channel A must move to top");
  assert.strictEqual(getConversationPreviewText(updatedList[0]), "hello", "Preview must be 'hello'");
  assert.strictEqual(updatedList[0].state.unreadCount, 1, "Unread count must be 1 for inactive channel");

  initialList = updatedList;
});

// TEST 3: Editing latest message immediately updates left preview
runTest("Test 3: Edit latest message — Rahul edits 'hello' to 'hello, how are you?' -> preview updates immediately", () => {
  const editEvent = {
    type: "message.updated",
    cid: "messaging:chan-a",
    message: {
      id: "m2",
      text: "hello, how are you?",
      is_edited: true,
      edit_history: [{ text: "hello", edited_at: "2026-08-28T23:51:00Z" }],
      created_at: "2026-08-28T23:50:00Z",
    },
  };

  const updatedList = processIncomingMessageEvent(initialList, editEvent, null);
  assert.strictEqual(updatedList[0].cid, "messaging:chan-a");
  assert.strictEqual(getConversationPreviewText(updatedList[0]), "Edited · hello, how are you?");

  initialList = updatedList;
});

// TEST 4: Deleting latest message immediately updates left preview to 'This message was deleted'
runTest("Test 4: Delete latest message — Rahul deletes 'hello, how are you?' -> preview becomes 'This message was deleted'", () => {
  const deleteEvent = {
    type: "message.deleted",
    cid: "messaging:chan-a",
    message: {
      id: "m2",
      type: "deleted",
      deleted_at: "2026-08-28T23:52:00Z",
    },
  };

  const updatedList = processIncomingMessageEvent(initialList, deleteEvent, null);
  assert.strictEqual(updatedList[0].cid, "messaging:chan-a");
  assert.strictEqual(getConversationPreviewText(updatedList[0]), "This message was deleted");

  initialList = updatedList;
});

// TEST 5: File attachment message updates preview to '📎 Document.pdf'
runTest("Test 5: File attachment message -> preview becomes '📎 Document.pdf'", () => {
  const fileEvent = {
    type: "message.new",
    cid: "messaging:chan-a",
    message: {
      id: "m3",
      text: "",
      attachments: [{ type: "file", title: "Document.pdf" }],
      created_at: "2026-08-28T23:55:00Z",
    },
  };

  const updatedList = processIncomingMessageEvent(initialList, fileEvent, null);
  assert.strictEqual(updatedList[0].cid, "messaging:chan-a");
  assert.strictEqual(getConversationPreviewText(updatedList[0]), "📎 Document.pdf");

  initialList = updatedList;
});

// TEST 6: Active channel reads incoming message -> unread count remains 0
runTest("Test 6: Active open channel receives incoming message -> unread count remains 0", () => {
  const newMsgEvent = {
    type: "message.new",
    cid: "messaging:chan-a",
    message: {
      id: "m4",
      text: "Are you free?",
      created_at: "2026-08-28T23:58:00Z",
    },
  };

  const updatedList = processIncomingMessageEvent(initialList, newMsgEvent, "messaging:chan-a");
  assert.strictEqual(updatedList[0].cid, "messaging:chan-a");
  assert.strictEqual(getConversationPreviewText(updatedList[0]), "Are you free?");
  assert.strictEqual(updatedList[0].state.unreadCount, 0, "Active channel unread count must remain 0");
});

console.log("\n==============================================");
console.log(`Test Summary: ${passedTests}/${totalTests} tests passed.`);
console.log("==============================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
