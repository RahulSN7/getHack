const assert = require("assert");
const {
  understandUserQuery,
  generateFallbackResponse,
} = require("../services/aiService");

async function runDirectConnectionTests() {
  console.log("=== RUNNING DIRECT CONNECTION REQUEST BY USER NAME TESTS ===\n");

  const sampleTeammates = [
    {
      userId: "user_py_1",
      id: "user_py_1",
      name: "Py Dev",
      role: "Machine Learning Engineer",
      skills: ["Python", "TensorFlow", "PyTorch"],
      availability: "available",
      connectionStatus: "not_connected",
    },
    {
      userId: "user_ui_2",
      id: "user_ui_2",
      name: "UI Designer",
      role: "UI/UX Designer",
      skills: ["Figma", "UI/UX", "TailwindCSS"],
      availability: "available",
      connectionStatus: "not_connected",
    },
    {
      userId: "user_connected_3",
      id: "user_connected_3",
      name: "Connected Friend",
      role: "Frontend Engineer",
      skills: ["React", "JavaScript"],
      availability: "available",
      connectionStatus: "connected",
      isConnected: true,
    },
    {
      userId: "user_pending_4",
      id: "user_pending_4",
      name: "Pending User",
      role: "Backend Engineer",
      skills: ["Node.js", "Express"],
      availability: "available",
      connectionStatus: "request_sent",
      isPending: true,
    },
    {
      userId: "user_incoming_5",
      id: "user_incoming_5",
      name: "Incoming User",
      role: "DevOps Engineer",
      skills: ["Docker", "AWS"],
      availability: "available",
      connectionStatus: "incoming_request",
      isIncoming: true,
    },
    {
      userId: "user_rahul_1",
      id: "user_rahul_1",
      name: "Rahul Singh",
      role: "Full Stack Developer",
      skills: ["React", "Node.js"],
      availability: "available",
      connectionStatus: "not_connected",
    },
    {
      userId: "user_rahul_2",
      id: "user_rahul_2",
      name: "Rahul Sharma",
      role: "Frontend Developer",
      skills: ["React", "CSS"],
      availability: "available",
      connectionStatus: "not_connected",
    },
  ];

  const userProfile = {
    userId: "user_me",
    id: "user_me",
    name: "Current Developer",
    skills: ["React", "JavaScript"],
    role: "Software Engineer",
  };

  // 1. Direct Tool Execution for Explicit Command ("Connect me with Py Dev")
  console.log("1. Testing Direct Tool Execution for Explicit Connect Command...");
  const directCmdResp = generateFallbackResponse(
    [{ role: "user", content: "Connect me with Py Dev" }],
    { userProfile, teammatesData: { teammates: sampleTeammates } }
  );
  assert(directCmdResp.toolCalls, "Should directly issue toolCalls without confirmation prompt");
  assert.strictEqual(directCmdResp.toolCalls[0].name, "send_connection_request");
  assert.strictEqual(directCmdResp.toolCalls[0].args.targetUserId, "user_py_1");
  console.log("  ✅ Direct tool execution for 'Connect me with Py Dev' passed.");

  // 2. Typos & Phrasing Tolerance
  console.log("\n2. Testing Grammar, Spelling & Typo Tolerance...");
  const typoPrompts = [
    "connect me with py dev",
    "connect me wid Py Dev",
    "connect me with pydev",
    "send connection request to Py Dev",
    "send req to py dev",
    "I want to connect with Py Dev",
    "i want conect with Py Dev",
  ];

  for (const prompt of typoPrompts) {
    const analysis = understandUserQuery(prompt);
    assert.strictEqual(analysis.intent, "DIRECT_CONNECT_USER", `Prompt '${prompt}' should classify as DIRECT_CONNECT_USER`);

    const resp = generateFallbackResponse(
      [{ role: "user", content: prompt }],
      { userProfile, teammatesData: { teammates: sampleTeammates } }
    );
    assert(resp.toolCalls, `Prompt '${prompt}' should directly trigger send_connection_request tool call`);
    assert.strictEqual(resp.toolCalls[0].args.targetUserId, "user_py_1");
  }
  console.log("  ✅ Grammar, spelling, and typo tolerance passed.");

  // 3. Already Connected User Handling
  console.log("\n3. Testing Already Connected User Handling...");
  const connResp = generateFallbackResponse(
    [{ role: "user", content: "Connect me with Connected Friend" }],
    { userProfile, teammatesData: { teammates: sampleTeammates } }
  );
  assert(connResp.text.includes("already connected"), "Should state 'You're already connected with Connected Friend'");
  assert(!connResp.toolCalls, "Should not issue tool call if already connected");
  console.log("  ✅ Already connected user handling passed.");

  // 4. Request Already Sent Handling
  console.log("\n4. Testing Request Already Sent Handling...");
  const pendingResp = generateFallbackResponse(
    [{ role: "user", content: "Connect me with Pending User" }],
    { userProfile, teammatesData: { teammates: sampleTeammates } }
  );
  assert(pendingResp.text.includes("already sent"), "Should state 'You have already sent a connection request'");
  assert(!pendingResp.toolCalls, "Should not issue tool call if request already sent");
  console.log("  ✅ Request already sent handling passed.");

  // 5. Incoming Request Existing Handling
  console.log("\n5. Testing Incoming Request Existing Handling...");
  const incomingResp = generateFallbackResponse(
    [{ role: "user", content: "Connect me with Incoming User" }],
    { userProfile, teammatesData: { teammates: sampleTeammates } }
  );
  assert(incomingResp.text.includes("already sent you a connection request"), "Should state '<User> has already sent you a connection request'");
  assert(!incomingResp.toolCalls, "Should not issue tool call if incoming request exists");
  console.log("  ✅ Incoming request existing handling passed.");

  // 6. Unknown User Handling ("Connect me with XYZ")
  console.log("\n6. Testing Unknown User Handling...");
  const unknownResp = generateFallbackResponse(
    [{ role: "user", content: "Connect me with XYZ" }],
    { userProfile, teammatesData: { teammates: sampleTeammates } }
  );
  assert(unknownResp.text.includes("couldn't find a getHack user named XYZ"), "Should state 'I couldn't find a getHack user named XYZ'");
  assert(!unknownResp.toolCalls, "Should not issue tool call for unknown user");
  console.log("  ✅ Unknown user handling passed.");

  // 7. Multiple User Disambiguation ("Connect me with Rahul")
  console.log("\n7. Testing Multiple User Disambiguation...");
  const multiUserResp = generateFallbackResponse(
    [{ role: "user", content: "Connect me with Rahul" }],
    { userProfile, teammatesData: { teammates: sampleTeammates } }
  );
  assert(multiUserResp.text.includes("multiple users named Rahul"), "Should prompt 'I found multiple users named Rahul'");
  assert.strictEqual(multiUserResp.recommendations.teammates.length, 2, "Should return candidate cards for both Rahuls");
  assert(!multiUserResp.toolCalls, "Should NOT send a request until target is unambiguous");
  console.log("  ✅ Multiple user disambiguation passed.");

  // 8. Self-Connection Prevention
  console.log("\n8. Testing Self-Connection Prevention...");
  const selfByKwResp = generateFallbackResponse(
    [{ role: "user", content: "Connect me with myself" }],
    { userProfile, teammatesData: { teammates: sampleTeammates } }
  );
  assert(selfByKwResp.text.includes("can't send a connection request to yourself"), "Should prevent self-connection by keyword");

  const selfByNameResp = generateFallbackResponse(
    [{ role: "user", content: "Connect me with Current Developer" }],
    { userProfile, teammatesData: { teammates: sampleTeammates } }
  );
  assert(selfByNameResp.text.includes("can't send a connection request to yourself"), "Should prevent self-connection by user name");
  console.log("  ✅ Self-connection prevention passed.");

  // 9. Conversational Context Preservation
  console.log("\n9. Testing Conversational Context Preservation after Direct Connection...");
  const history = [
    { role: "user", content: "Connect me with Py Dev" },
    {
      role: "tool",
      name: "send_connection_request",
      content: JSON.stringify({ success: true, targetName: "Py Dev", action: "send_connection_request" }),
    },
    { role: "assistant", content: "Connection request sent to Py Dev." },
    { role: "user", content: "What skills does he have?" },
  ];

  const skillFollowUpResp = generateFallbackResponse(history, { userProfile, teammatesData: { teammates: sampleTeammates } });
  assert(skillFollowUpResp.text.includes("Py Dev") && skillFollowUpResp.text.includes("Python"), "Should resolve 'he' to Py Dev and display skills");
  console.log("  ✅ Conversational context preservation passed.");

  // 10. End-to-End Tool Result Synthesis
  console.log("\n10. Testing Backend Tool Result Synthesis...");
  const synthResp = generateFallbackResponse(
    [
      { role: "user", content: "Connect me with Py Dev" },
      {
        role: "tool",
        name: "send_connection_request",
        content: JSON.stringify({ success: true, targetName: "Py Dev", action: "send_connection_request" }),
      },
    ],
    { userProfile }
  );
  assert.strictEqual(synthResp.text, "Connection request sent to **Py Dev**.");
  console.log("  ✅ Backend tool result synthesis passed.");

  console.log("\nALL DIRECT CONNECTION REQUEST BY USER NAME TESTS PASSED SUCCESSFULLY! 🎉\n");
}

runDirectConnectionTests().catch((err) => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});
