// server/tests/testPhase5AgenticActions.js
const assert = require("assert");
const { callLLM } = require("../services/aiService");

async function runTests() {
  console.log("=== RUNNING PHASE 5: AGENTIC ACTIONS TESTS ===");

  const userContext = {
    userProfile: {
      id: "user_me",
      name: "Rahul",
      role: "Full Stack Developer",
      skills: ["React", "Node.js", "MongoDB", "JavaScript"],
    },
    user: { _id: "user_me" },
  };

  const mockPyDev = {
    userId: "user_py",
    name: "Py Dev",
    role: "Machine Learning Engineer",
    skills: ["Python", "TensorFlow", "PyTorch"],
    availability: "available",
    connectionStatus: "not_connected",
  };

  const mockUIDesigner = {
    userId: "user_ui",
    name: "UI Designer",
    role: "UI/UX Designer",
    skills: ["Figma", "UI/UX"],
    availability: "available",
    connectionStatus: "not_connected",
  };

  const mockConnectedFriend = {
    userId: "user_friend",
    name: "Connected Friend",
    role: "Backend Engineer",
    skills: ["Node.js", "Go"],
    availability: "available",
    connectionStatus: "connected",
    isConnected: true,
  };

  const mockPendingFriend = {
    userId: "user_pending",
    name: "Pending Friend",
    role: "DevOps Engineer",
    skills: ["Docker", "Kubernetes"],
    availability: "available",
    connectionStatus: "request_sent",
    isPending: true,
  };

  const mockVoltHacks = {
    id: "hack_volt",
    title: "VoltHacks AI Hackathon",
    mode: "Online",
    registrationUrl: "https://gethack.test/volthacks",
    skills: ["Python", "TensorFlow", "React", "UI/UX"],
  };

  console.log("\n1. Testing Direct Connection Tool Execution for Explicit User Name...");
  const historyConnectPrompt = [
    { role: "user", content: "Recommend a teammate for AI" },
    {
      role: "assistant",
      recommendations: { teammates: [mockPyDev] },
      text: "I recommend Py Dev.",
    },
    { role: "user", content: "Connect me with Py Dev" },
  ];

  const resConnectPrompt = await callLLM(historyConnectPrompt, userContext);
  assert.ok(resConnectPrompt.toolCalls && resConnectPrompt.toolCalls.length === 1, "Direct command with explicit name should issue send_connection_request tool call.");
  assert.strictEqual(resConnectPrompt.toolCalls[0].name, "send_connection_request");
  assert.strictEqual(resConnectPrompt.toolCalls[0].args.targetUserId, "user_py");
  console.log("  ✅ Direct connection request tool execution passed.");

  console.log("\n2. Testing Anaphoric Pronoun Resolution with Confirmation Prompt ('connect me with him')...");
  const historyPronoun = [
    { role: "user", content: "Recommend a teammate" },
    {
      role: "assistant",
      recommendations: { teammates: [mockPyDev] },
      text: "I recommend Py Dev.",
    },
    { role: "user", content: "connect me with him" },
  ];

  const resPronoun = await callLLM(historyPronoun, userContext);
  assert.ok(resPronoun.text.includes("Py Dev"), "Must resolve pronoun 'him' to Py Dev.");
  assert.ok(resPronoun.pendingAction && resPronoun.pendingAction.targetUserId === "user_py", "Must target Py Dev ID.");
  console.log("  ✅ Anaphoric pronoun 'him' resolved with confirmation prompt.");

  console.log("\n3. Testing Connection Action Execution upon Confirmation...");
  const historyConfirmConnect = [
    ...historyPronoun,
    {
      role: "assistant",
      text: resPronoun.text,
      pendingAction: resPronoun.pendingAction,
    },
    { role: "user", content: "Yes" },
  ];

  const resConfirmConnect = await callLLM(historyConfirmConnect, userContext);
  assert.ok(resConfirmConnect.toolCalls && resConfirmConnect.toolCalls.length === 1, "Must issue send_connection_request tool call.");
  assert.strictEqual(resConfirmConnect.toolCalls[0].name, "send_connection_request");
  assert.strictEqual(resConfirmConnect.toolCalls[0].args.targetUserId, "user_py");
  console.log("  ✅ Issued send_connection_request tool call upon user confirmation.");

  console.log("\n4. Testing Action Cancellation ('No' / 'Cancel')...");
  const historyCancel = [
    ...historyPronoun,
    {
      role: "assistant",
      text: resPronoun.text,
      pendingAction: resPronoun.pendingAction,
    },
    { role: "user", content: "No" },
  ];

  const resCancel = await callLLM(historyCancel, userContext);
  assert.ok(!resCancel.toolCalls || resCancel.toolCalls.length === 0, "Must NOT execute any tool calls on cancellation.");
  assert.ok(resCancel.text.includes("canceled"), "Must inform user that action was canceled.");
  console.log("  ✅ Action canceled without performing tool call.");

  console.log("\n5. Testing Duplicate Request Prevention (Already Connected)...");
  const historyAlreadyConnected = [
    { role: "user", content: "Recommend teammate" },
    {
      role: "assistant",
      recommendations: { teammates: [mockConnectedFriend] },
      text: "Here is Connected Friend.",
    },
    { role: "user", content: "Connect with Connected Friend" },
  ];

  const resAlreadyConn = await callLLM(historyAlreadyConnected, userContext);
  assert.ok(!resAlreadyConn.toolCalls, "Must NOT call connection tool for already connected user.");
  assert.ok(resAlreadyConn.text.includes("already connected"), "Must inform user they are already connected.");
  console.log("  ✅ Duplicate request prevented for already connected user.");

  console.log("\n6. Testing Duplicate Request Prevention (Request Already Sent)...");
  const historyAlreadySent = [
    { role: "user", content: "Recommend teammate" },
    {
      role: "assistant",
      recommendations: { teammates: [mockPendingFriend] },
      text: "Here is Pending Friend.",
    },
    { role: "user", content: "Connect with Pending Friend" },
  ];

  const resAlreadySent = await callLLM(historyAlreadySent, userContext);
  assert.ok(!resAlreadySent.toolCalls, "Must NOT call connection tool when request already sent.");
  assert.ok(resAlreadySent.text.includes("already sent a connection request"), "Must inform user request was already sent.");
  console.log("  ✅ Duplicate request prevented for request already sent state.");

  console.log("\n7. Testing Incoming Connection Request Acceptance Flow...");
  const mockNetworkData = {
    incoming: [
      { id: "req_1", senderId: "user_rahul_in", name: "Rahul S", role: "Frontend Dev" },
    ],
  };

  const historyAccept = [
    { role: "assistant", tool_calls: [{ name: "get_my_network", args: {} }] },
    { role: "tool", name: "get_my_network", content: JSON.stringify(mockNetworkData) },
    { role: "user", content: "Accept Rahul's request" },
  ];

  const resAcceptPrompt = await callLLM(historyAccept, userContext);
  assert.ok(resAcceptPrompt.text.includes("accept the connection request from **Rahul S**"), "Must prompt for confirmation to accept request.");
  assert.ok(resAcceptPrompt.pendingAction && resAcceptPrompt.pendingAction.type === "accept_connection_request", "Must set pendingAction for accept_connection_request.");

  // Confirm accept
  const historyConfirmAccept = [
    ...historyAccept,
    { role: "assistant", text: resAcceptPrompt.text, pendingAction: resAcceptPrompt.pendingAction },
    { role: "user", content: "Confirm" },
  ];

  const resConfirmAccept = await callLLM(historyConfirmAccept, userContext);
  assert.ok(resConfirmAccept.toolCalls && resConfirmAccept.toolCalls.length === 1, "Must issue accept_connection_request tool call.");
  assert.strictEqual(resConfirmAccept.toolCalls[0].name, "accept_connection_request");
  console.log("  ✅ Incoming connection request acceptance flow passed.");

  console.log("\n8. Testing Team Creation Action Flow...");
  const historyTeamCreate = [
    { role: "user", content: "Find AI hackathons" },
    { role: "assistant", recommendations: { hackathons: [mockVoltHacks] }, text: "Here is VoltHacks." },
    { role: "user", content: "Build my team" },
    { role: "assistant", recommendations: { teammates: [mockPyDev, mockUIDesigner] }, text: "I recommend Py Dev and UI Designer." },
    { role: "user", content: "Create this team" },
  ];

  const resCreatePrompt = await callLLM(historyTeamCreate, userContext);
  assert.ok(resCreatePrompt.text.includes("create the team"), "Must prompt for confirmation to create team.");
  assert.ok(resCreatePrompt.pendingAction && resCreatePrompt.pendingAction.type === "create_team", "Must set pendingAction for create_team.");

  // Confirm create team
  const historyConfirmCreateTeam = [
    ...historyTeamCreate,
    { role: "assistant", text: resCreatePrompt.text, pendingAction: resCreatePrompt.pendingAction },
    { role: "user", content: "Yes, do it" },
  ];

  const resConfirmCreateTeam = await callLLM(historyConfirmCreateTeam, userContext);
  assert.ok(resConfirmCreateTeam.toolCalls && resConfirmCreateTeam.toolCalls.length === 1, "Must issue create_team tool call.");
  assert.strictEqual(resConfirmCreateTeam.toolCalls[0].name, "create_team");
  console.log("  ✅ Team creation action flow passed.");

  console.log("\n9. Testing Team Invitation Action Flow...");
  const historyTeamInvite = [
    { role: "user", content: "Recommend teammate" },
    { role: "assistant", recommendations: { teammates: [mockPyDev] }, text: "Here is Py Dev." },
    { role: "user", content: "Invite Py Dev to my team" },
  ];

  const resInvitePrompt = await callLLM(historyTeamInvite, userContext);
  assert.ok(resInvitePrompt.text.includes("invite **Py Dev** to your team"), "Must prompt for confirmation to invite to team.");
  assert.ok(resInvitePrompt.pendingAction && resInvitePrompt.pendingAction.type === "invite_to_team", "Must set pendingAction for invite_to_team.");

  // Confirm invite
  const historyConfirmInvite = [
    ...historyTeamInvite,
    { role: "assistant", text: resInvitePrompt.text, pendingAction: resInvitePrompt.pendingAction },
    { role: "user", content: "Yes" },
  ];

  const resConfirmInvite = await callLLM(historyConfirmInvite, userContext);
  assert.ok(resConfirmInvite.toolCalls && resConfirmInvite.toolCalls.length === 1, "Must issue invite_to_team tool call.");
  assert.strictEqual(resConfirmInvite.toolCalls[0].name, "invite_to_team");
  console.log("  ✅ Team invitation action flow passed.");

  console.log("\n10. Testing External Registration Safety Handling...");
  const historyExtReg = [
    { role: "user", content: "Find AI hackathons" },
    { role: "assistant", recommendations: { hackathons: [mockVoltHacks] }, text: "Here is VoltHacks." },
    { role: "user", content: "Register me for VoltHacks" },
  ];

  const resExtReg = await callLLM(historyExtReg, userContext);
  assert.ok(!resExtReg.toolCalls, "Must NOT issue external registration tool calls.");
  assert.ok(resExtReg.text.includes("I can't complete external registration directly from getHack"), "Must state external registration policy.");
  assert.ok(resExtReg.text.includes("https://gethack.test/volthacks"), "Must provide official registration link.");
  console.log("  ✅ External registration safety handling passed.");

  console.log("\nALL PHASE 5 AGENTIC ACTIONS TESTS PASSED SUCCESSFULLY! 🎉");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
