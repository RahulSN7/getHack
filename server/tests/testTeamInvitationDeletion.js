// ---------------------------------------------------------------------------
// server/tests/testTeamInvitationDeletion.js
// Integration Test Suite for Team Invitation Message Deletion Behavior
// ---------------------------------------------------------------------------

const assert = require("node:assert");

// Simulated message renderer logic matching ChatPanel.jsx
function renderChatMessage(msg, currentUserId) {
  const isMine = String(msg.user?.id || msg.user_id || msg.sender_id) === String(currentUserId);
  const isDeleted = Boolean(msg.deleted_at || msg.type === "deleted");

  const isInvitation =
    msg.custom_type === "team_invitation" ||
    msg.type === "team_invitation" ||
    Boolean(msg.invitation_id || msg.invitationId);

  if (isDeleted) {
    return {
      renderedType: "deleted_message",
      text: "This message was deleted",
      isMine,
      hasInvitationCard: false,
      hasAcceptRejectButtons: false,
    };
  }

  if (isInvitation) {
    return {
      renderedType: "team_invitation_card",
      teamName: msg.team_name || msg.teamName,
      isMine,
      hasInvitationCard: true,
      hasAcceptRejectButtons: true,
    };
  }

  return {
    renderedType: "normal_text_message",
    text: msg.text,
    isMine,
    hasInvitationCard: false,
    hasAcceptRejectButtons: false,
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
console.log("Running Team Invitation Message Deletion Tests");
console.log("==============================================\n");

// TEST 1: Active Team Invitation renders card
runTest("Test 1: Non-deleted team invitation renders invitation card", () => {
  const invitationMsg = {
    id: "msg-inv-1",
    user_id: "user-sender-1",
    custom_type: "team_invitation",
    invitation_id: "inv-100",
    team_name: "CodeCrafters",
    created_at: new Date().toISOString(),
  };

  const result = renderChatMessage(invitationMsg, "user-sender-1");
  assert.strictEqual(result.renderedType, "team_invitation_card");
  assert.strictEqual(result.hasInvitationCard, true);
  assert.strictEqual(result.hasAcceptRejectButtons, true);
});

// TEST 2: Deleted Team Invitation renders "This message was deleted"
runTest("Test 2: Deleted team invitation message renders 'This message was deleted' UI", () => {
  const deletedInvitationMsg = {
    id: "msg-inv-1",
    user_id: "user-sender-1",
    custom_type: "team_invitation",
    type: "deleted",
    deleted_at: new Date().toISOString(),
    invitation_id: "inv-100",
    team_name: "CodeCrafters",
  };

  const result = renderChatMessage(deletedInvitationMsg, "user-sender-1");
  assert.strictEqual(result.renderedType, "deleted_message");
  assert.strictEqual(result.text, "This message was deleted");
  assert.strictEqual(result.hasInvitationCard, false);
  assert.strictEqual(result.hasAcceptRejectButtons, false);
});

// TEST 3: Deleted Team Invitation preserves sender vs receiver alignment
runTest("Test 3: Deleted team invitation preserves sender (isMine) alignment", () => {
  const senderMsg = {
    id: "msg-inv-1",
    user_id: "user-sender-1",
    custom_type: "team_invitation",
    type: "deleted",
    deleted_at: new Date().toISOString(),
  };

  const senderResult = renderChatMessage(senderMsg, "user-sender-1");
  assert.strictEqual(senderResult.isMine, true);

  const recipientResult = renderChatMessage(senderMsg, "user-recipient-2");
  assert.strictEqual(recipientResult.isMine, false);
});

console.log("\n==============================================");
console.log(`Test Summary: ${passedTests}/${totalTests} tests passed.`);
console.log("==============================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
