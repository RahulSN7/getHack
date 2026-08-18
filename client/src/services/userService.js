// ---------------------------------------------------------------------------
// userService.js — Centralized User & Organizer Profile API Service
// ---------------------------------------------------------------------------

const API_BASE = "/api/users";

async function handleResponse(response) {
  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const message = data?.message || "An unexpected error occurred while processing profile request.";
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export const userService = {
  // Fetch organizer profile by ID (or 'me')
  async getOrganizerProfile(id = "me") {
    const response = await fetch(`${API_BASE}/organizer/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    return handleResponse(response);
  },

  // Update own organizer profile
  async updateOrganizerProfile(payload) {
    const response = await fetch(`${API_BASE}/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },
};
