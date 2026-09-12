// ---------------------------------------------------------------------------
// server/tools/index.js — GetHack AI Agent Tools Registry & Dispatcher
// Central entrypoint for all agent tool schemas and execution.
// ---------------------------------------------------------------------------

const {
  searchHackathonsDefinition,
  searchHackathons,
} = require("./searchHackathons");

const {
  getMyProfileDefinition,
  getMyProfile,
} = require("./getMyProfile");

const {
  findTeammatesDefinition,
  findTeammates,
} = require("./findTeammates");

const {
  getHackathonDetailsDefinition,
  getHackathonDetails,
} = require("./getHackathonDetails");

const {
  getUserProfileDefinition,
  getUserProfile,
} = require("./getUserProfile");

const {
  getMyNetworkDefinition,
  getMyNetwork,
} = require("./getMyNetwork");

const {
  sendConnectionRequestDefinition,
  sendConnectionRequest,
} = require("./sendConnectionRequest");

const {
  acceptConnectionRequestDefinition,
  acceptConnectionRequest,
} = require("./acceptConnectionRequest");

const {
  createTeamDefinition,
  createTeam,
} = require("./createTeam");

const {
  inviteToTeamDefinition,
  inviteToTeam,
} = require("./inviteToTeam");

// Map of registered tool handlers keyed by tool name
const toolsMap = {
  search_hackathons: searchHackathons,
  get_my_profile: getMyProfile,
  find_teammates: findTeammates,
  get_hackathon_details: getHackathonDetails,
  get_user_profile: getUserProfile,
  get_my_network: getMyNetwork,
  send_connection_request: sendConnectionRequest,
  accept_connection_request: acceptConnectionRequest,
  create_team: createTeam,
  invite_to_team: inviteToTeam,
};

// List of available tool schema definitions for LLM declarations
const toolDefinitions = [
  searchHackathonsDefinition,
  getMyProfileDefinition,
  findTeammatesDefinition,
  getHackathonDetailsDefinition,
  getUserProfileDefinition,
  getMyNetworkDefinition,
  sendConnectionRequestDefinition,
  acceptConnectionRequestDefinition,
  createTeamDefinition,
  inviteToTeamDefinition,
];

/**
 * Get available tool schema definitions formatted for LLM engines
 * @returns {Array<Object>} List of tool definitions
 */
function getToolDefinitions() {
  return toolDefinitions;
}

/**
 * Execute a tool by name with arguments
 * 
 * @param {string} name - Registered tool name
 * @param {Object} args - Arguments payload for the tool
 * @param {Object} [context] - Execution context (e.g. user, conversation)
 * @returns {Promise<Object>} Execution result object
 */
async function executeTool(name, args = {}, context = {}) {
  const handler = toolsMap[name];

  if (!handler) {
    console.warn(`[GetHack AI Tools]: Attempted to execute unregistered tool '${name}'`);
    return {
      success: false,
      error: `Tool '${name}' is not registered.`,
    };
  }

  try {
    const result = await handler(args, context);
    return result;
  } catch (error) {
    console.error(`[GetHack AI Tools Execution Error: ${name}]:`, error);
    return {
      success: false,
      error: `Error executing tool '${name}'`,
    };
  }
}

module.exports = {
  getToolDefinitions,
  executeTool,
  toolsMap,
  toolDefinitions,
};
