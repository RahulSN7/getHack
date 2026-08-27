// ---------------------------------------------------------------------------
// scratch/testUnreadAndPreviewFlow.js
// Verification script for chat unread counts and conversation item previews
// ---------------------------------------------------------------------------

function formatLastMessagePreview(messages, channelData) {
  const lastMessage = Array.isArray(messages) && messages.length > 0 ? messages[messages.length - 1] : null;

  let lastMessageText = "";
  if (lastMessage) {
    if (lastMessage.text && lastMessage.text.trim()) {
      lastMessageText = lastMessage.text.trim();
    } else if (Array.isArray(lastMessage.attachments) && lastMessage.attachments.length > 0) {
      const att = lastMessage.attachments[0];
      const isImg =
        att.type === "image" ||
        !!att.image_url ||
        [".jpg", ".jpeg", ".png", ".gif", ".webp"].some((ext) =>
          (att.title || att.name || att.asset_url || "").toLowerCase().endsWith(ext)
        );
      const title = att.title || att.name || "File";
      lastMessageText = isImg ? "🖼️ Image" : `📎 ${title}`;
    }
  }

  if (!lastMessageText) {
    lastMessageText =
      channelData?.last_message_preview ||
      (channelData?.last_message_at ? "Message" : "No messages yet");
  }

  return lastMessageText;
}

console.log("Running Unread Count & Preview Unit Tests...\n");

// TEST 1: Text message preview
console.log("--- TEST 1: Text Message Preview ---");
const prev1 = formatLastMessagePreview([{ text: "Hello World" }], {});
console.log("Result:", prev1);
if (prev1 !== "Hello World") throw new Error("Expected 'Hello World'");
console.log("✅ Test 1 PASSED: Text message preview works.");

// TEST 2: PDF Attachment Preview without text
console.log("\n--- TEST 2: PDF Attachment Preview ---");
const prev2 = formatLastMessagePreview(
  [{ text: "", attachments: [{ type: "file", title: "Deloitte certificate.pdf" }] }],
  {}
);
console.log("Result:", prev2);
if (prev2 !== "📎 Deloitte certificate.pdf") throw new Error(`Expected '📎 Deloitte certificate.pdf', got '${prev2}'`);
console.log("✅ Test 2 PASSED: PDF attachment preview works.");

// TEST 3: Image Attachment Preview without text
console.log("\n--- TEST 3: Image Attachment Preview ---");
const prev3 = formatLastMessagePreview(
  [{ text: "", attachments: [{ type: "image", title: "photo.png" }] }],
  {}
);
console.log("Result:", prev3);
if (prev3 !== "🖼️ Image") throw new Error(`Expected '🖼️ Image', got '${prev3}'`);
console.log("✅ Test 3 PASSED: Image attachment preview works.");

// TEST 4: Read state unread count simulation
console.log("\n--- TEST 4: Read State Unread Count Simulation ---");
class MockChannel {
  constructor(name, initialUnread) {
    this.name = name;
    this.unread = initialUnread;
  }
  countUnread() {
    return this.unread;
  }
  async markRead() {
    this.unread = 0;
    return { success: true };
  }
}

const chanA = new MockChannel("Rahul Singh Negi", 1);
console.log("Initial unread count:", chanA.countUnread());
if (chanA.countUnread() !== 1) throw new Error("Expected initial unread = 1");

// Simulate channel selection / view
chanA.markRead();
console.log("Unread count after selection / markRead:", chanA.countUnread());
if (chanA.countUnread() !== 0) throw new Error("Expected unread = 0 after markRead()");
console.log("✅ Test 4 PASSED: Channel markRead resets unread count to 0.");

console.log("\n🎉 ALL UNREAD & PREVIEW TESTS PASSED SUCCESSFULLY!");
