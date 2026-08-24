// ---------------------------------------------------------------------------
// teamService.js — Centralized Team API Service
// Communicates with Express backend /api/teams endpoints
// ---------------------------------------------------------------------------

const API_BASE = "/api/teams";

async function handleResponse(response) {
  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const message = data?.message || "Team service request failed.";
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export const teamService = {
  // Create a new team in MongoDB backend
  async createTeam(payload) {
    const response = await fetch(`${API_BASE}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  // Get all teams from backend
  async getTeams() {
    const response = await fetch(`${API_BASE}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    return handleResponse(response);
  },

  // Get team details by ID
  async getTeamById(id) {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    return handleResponse(response);
  },

  // Request to join a team
  async joinTeam(id) {
    const response = await fetch(`${API_BASE}/${id}/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    return handleResponse(response);
  },
};

export default teamService;
