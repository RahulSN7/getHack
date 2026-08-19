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
  // Get public hackathons list with optional search, status, platform, mode, sort, page parameters
  async getPublicHackathons(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append("page", params.page);
    if (params.limit) query.append("limit", params.limit);
    if (params.search) query.append("search", params.search);
    if (params.status) query.append("status", params.status);
    if (params.platform) query.append("platform", params.platform);
    if (params.mode) query.append("mode", params.mode);
    if (params.sort) query.append("sort", params.sort);

    const queryString = query.toString() ? `?${query.toString()}` : "";
    const response = await fetch(`${API_BASE}${queryString}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    return handleResponse(response);
  },

  // Get upcoming hackathons
  async getUpcomingHackathons(params = {}) {
    return this.getPublicHackathons({ ...params, status: "upcoming" });
  },

  // Get active hackathons
  async getActiveHackathons(params = {}) {
    return this.getPublicHackathons({ ...params, status: "live" });
  },

  // Get registration-open hackathons
  async getRegistrationOpenHackathons(params = {}) {
    return this.getPublicHackathons({ ...params, status: "registration-open" });
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

  // Get organizer hackathon details by ID (Owner & Organizer check)
  async getOrganizerHackathonById(id) {
    const response = await fetch(`${API_BASE}/organizer/${id}`, {
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

  // Trigger manual multi-platform sync
  async triggerSync() {
    const response = await fetch(`${API_BASE}/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    return handleResponse(response);
  },
};
