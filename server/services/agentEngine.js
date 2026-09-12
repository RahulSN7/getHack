const { callLLM } = require("./aiService");
const { executeTool } = require("../tools");

const MAX_AGENT_STEPS = 5;
const STEP_TIMEOUT_MS = 15000;

/**
 * Execute the agent loop for a user goal/message.
 * 
 * @param {Object} params
 * @param {Object} params.user - Authenticated user Mongoose doc
 * @param {Object} params.conversation - AiConversation Mongoose doc
 * @param {string} params.message - Latest user message
 * @param {Object} params.context - Page/environment context
 * @returns {Promise<Object>} Agent result { text, recommendations, pendingAction, toolResults, completedSteps }
 */
async function runAgentLoop({ user, conversation, message, context = {} }) {
  console.log("\n[GetHack AI]");
  console.log("User message received");

  const completedSteps = [];
  const toolResults = [];

  // Update conversation context if supplied
  if (context && typeof context === "object") {
    conversation.context = {
      ...conversation.context,
      ...context,
    };
  }

  // 1. Goal Understanding & Initial Context Assembly
  completedSteps.push("Analyzing goal and user context");

  const messageHistory = conversation.messages.map((m) => ({
    role: m.role,
    content: m.content,
    pendingAction: m.pendingAction,
    recommendations: m.recommendations,
  }));

  // Append current user message
  messageHistory.push({ role: "user", content: message });

  // Enrich context with authenticated user profile overview
  const enrichedContext = {
    ...conversation.context,
    userProfile: {
      id: user._id ? user._id.toString() : user.id,
      name: user.name,
      role: user.role,
      skills: user.profile?.skills || [],
      interests: user.profile?.interests || [],
      location: user.profile?.location || "",
    },
  };

  let stepCount = 0;
  let finalResponseText = "";
  let recommendations = { hackathons: [], teammates: [] };
  let pendingAction = null;

  try {
    // 2. Loop Execution (controlled multi-step reasoning & tool calling)
    while (stepCount < MAX_AGENT_STEPS) {
      stepCount++;

      // Step execution with timeout safeguard
      const llmResult = await Promise.race([
        callLLM(messageHistory, enrichedContext),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Agent step timeout")), STEP_TIMEOUT_MS)
        ),
      ]);

      // Check if LLM generated tool calls
      if (llmResult && Array.isArray(llmResult.toolCalls) && llmResult.toolCalls.length > 0) {
        for (const toolCall of llmResult.toolCalls) {
          console.log("\n[GetHack AI]");
          console.log(`Tool selected: ${toolCall.name}`);

          console.log("\n[GetHack AI]");
          console.log(`Tool arguments: ${JSON.stringify(toolCall.args)}`);

          const result = await executeTool(toolCall.name, toolCall.args, enrichedContext);

          if (toolCall.name === "get_my_profile") {
            console.log("\n[GetHack AI]");
            console.log("Profile retrieved successfully");
          } else if (toolCall.name === "search_hackathons") {
            const hackathonCount = result.count !== undefined ? result.count : (result.hackathons ? result.hackathons.length : 0);
            console.log("\n[GetHack AI]");
            console.log(`Tool result: ${hackathonCount} hackathons`);
            if (result.hackathons) {
              recommendations.hackathons = result.hackathons;
            }
          } else if (toolCall.name === "find_teammates") {
            const candidateCount = result.count !== undefined ? result.count : (result.teammates ? result.teammates.length : 0);
            console.log("\n[GetHack AI]");
            console.log(`Candidates found: ${candidateCount}`);
            if (result.teammates) {
              recommendations.teammates = result.teammates;
            }
          } else if (toolCall.name === "get_my_network") {
            const connCount = result.count !== undefined ? result.count : (result.connections ? result.connections.length : 0);
            console.log("\n[GetHack AI]");
            console.log(`Connections found: ${connCount}`);
            if (result.connections) {
              recommendations.teammates = result.connections;
            }
          } else if (toolCall.name === "get_hackathon_details") {
            console.log("\n[GetHack AI]");
            console.log("Hackathon details retrieved successfully");
          } else if (toolCall.name === "get_user_profile") {
            console.log("\n[GetHack AI]");
            console.log("Candidate profile retrieved successfully");
          } else if (toolCall.name === "send_connection_request") {
            console.log("\n[GetHack AI]");
            console.log(`Connection request tool executed: ${result.success ? "Success" : "Failed"}`);
          } else {
            console.log("\n[GetHack AI]");
            console.log(`Tool executed: ${toolCall.name}`);
          }

          toolResults.push({
            toolName: toolCall.name,
            args: toolCall.args,
            result,
          });

          completedSteps.push(`Executed tool: ${toolCall.name}`);

          // Append tool execution and result into conversation history for LLM observation turn
          messageHistory.push({
            role: "assistant",
            content: `Called tool ${toolCall.name} with ${JSON.stringify(toolCall.args)}`,
          });
          messageHistory.push({
            role: "tool",
            name: toolCall.name,
            content: JSON.stringify(result),
          });
        }
        // Continue loop to allow LLM to process tool results and synthesize final response
        continue;
      }

      if (llmResult && llmResult.pendingAction) {
        pendingAction = llmResult.pendingAction;
        console.log("\n[GetHack AI]");
        console.log(`Confirmation requested for action: ${pendingAction.type}`);
      }

      // If text response generated without new tool calls
      if (llmResult && llmResult.text) {
        finalResponseText = llmResult.text;
        if (llmResult.recommendations) {
          if (Array.isArray(llmResult.recommendations.hackathons) && llmResult.recommendations.hackathons.length > 0) {
            recommendations.hackathons = llmResult.recommendations.hackathons;
          }
          if (Array.isArray(llmResult.recommendations.teammates) && llmResult.recommendations.teammates.length > 0) {
            recommendations.teammates = llmResult.recommendations.teammates;
          }
        }
        console.log("\n[GetHack AI]");
        console.log("Recommendation generated");
        break;
      }
    }

    if (!finalResponseText) {
      finalResponseText = "I processed your request and I am ready to assist you with getHack.";
      console.log("\n[GetHack AI]");
      console.log("Final response generated");
    }

    // 3. Finalize and return structured agent response payload
    return {
      text: finalResponseText,
      recommendations,
      pendingAction,
      toolResults,
      completedSteps,
    };
  } catch (error) {
    console.error("[Agent Engine Error]:", error);
    return {
      text: "GetHack AI encountered an error processing your goal. Please try again.",
      recommendations: { hackathons: [], teammates: [] },
      pendingAction: null,
      toolResults: [],
      completedSteps,
      error: error.message,
    };
  }
}

module.exports = {
  runAgentLoop,
  MAX_AGENT_STEPS,
};

