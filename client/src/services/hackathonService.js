// ---------------------------------------------------------------------------
// hackathonService.js — Centralized API Service for Hackathons
// Communicates with Express backend /api/hackathons via Vite proxy.
// ---------------------------------------------------------------------------

const API_BASE = "/api/hackathons";

async function handleResponse(response) {
  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    let message = data?.message;
    if (!message) {
      if (response.status === 401) {
        message = "Unauthenticated. Please log in to perform this action.";
      } else if (response.status === 403) {
        message = "Access denied. You do not have permission for this action.";
      } else if (response.status === 404) {
        message = "Hackathon not found.";
      } else if (response.status === 504 || response.status === 502 || response.status === 503) {
        message = "Backend server is unreachable. Please ensure the server is running on port 5000.";
      } else {
        message = "Unable to process hackathon request. Please try again.";
      }
    }
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export const hackathonService = {
  // Get public hackathons list
  async getPublicHackathons() {
    const response = await fetch(`${API_BASE}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    return handleResponse(response);
  },

  // Get current organizer's hackathons list
  async getMyHackathons() {
    const response = await fetch(`${API_BASE}/my`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    return handleResponse(response);
  },

  // Get hackathon details by ID
  async getHackathonById(id) {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    return handleResponse(response);
  },

  // Create new hackathon (Organizer only)
  async createHackathon(payload) {
    const response = await fetch(`${API_BASE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  // Update hackathon by ID (Organizer + Owner only)
  async updateHackathon(id, payload) {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  // Delete hackathon by ID (Organizer + Owner only)
  async deleteHackathon(id) {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    return handleResponse(response);
  },
};
