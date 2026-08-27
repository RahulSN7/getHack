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

  // Get my teams (teams created or joined by current user)
  async getMyTeams() {
    const response = await fetch(`${API_BASE}/my-teams`, {
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

  // Edit team details (Team Leader only)
  async updateTeam(id, payload) {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  // Direct join team fallback
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

  // Leave a team (Member only)
  async leaveTeam(id) {
    const response = await fetch(`${API_BASE}/${id}/leave`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    return handleResponse(response);
  },

  // Send request to join a team
  async sendTeamRequest(teamId, note = "") {
    const response = await fetch(`${API_BASE}/${teamId}/requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ note }),
    });
    return handleResponse(response);
  },

  // Get incoming requests for teams led by current user
  async getIncomingRequests() {
    const response = await fetch(`${API_BASE}/requests/incoming`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    return handleResponse(response);
  },

  // Get sent join requests submitted by current user
  async getSentRequests() {
    const response = await fetch(`${API_BASE}/requests/sent`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    return handleResponse(response);
  },

  // Accept a team join request (Team Leader only)
  async acceptRequest(requestId) {
    const response = await fetch(`${API_BASE}/requests/${requestId}/accept`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    return handleResponse(response);
  },

  // Reject a team join request (Team Leader only)
  async rejectRequest(requestId) {
    const response = await fetch(`${API_BASE}/requests/${requestId}/reject`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    return handleResponse(response);
  },

  // Cancel a sent team join request (Requester only)
  async cancelRequest(requestId) {
    const response = await fetch(`${API_BASE}/requests/${requestId}/cancel`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    return handleResponse(response);
  },

  // Remove a team member (Team Leader only)
  async removeMember(teamId, memberId) {
    const response = await fetch(`${API_BASE}/${teamId}/members/${memberId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    return handleResponse(response);
  },
};

export default teamService;

