// ---------------------------------------------------------------------------
// userService.js — API Service for User Profiles & Network Connections
// Single point of interaction for participant profiles, completion, and requests
// ---------------------------------------------------------------------------

const API_BASE_URL = "/api";

async function request(endpoint, options = {}) {
  const defaultHeaders = {
    "Content-Type": "application/json",
  };

  const config = {
    credentials: "include",
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || "An unexpected error occurred.");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const userService = {
  // Fetch current user's own profile & completion status
  getOwnProfile: async () => {
    return request("/users/profile");
  },

  // Update current user's participant profile (supports FormData or JSON)
  updateParticipantProfile: async (profileData) => {
    if (typeof FormData !== "undefined" && profileData instanceof FormData) {
      const response = await fetch(`${API_BASE_URL}/users/profile/participant`, {
        method: "PUT",
        credentials: "include",
        body: profileData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(data.message || "An unexpected error occurred.");
        error.status = response.status;
        error.data = data;
        throw error;
      }
      return data;
    }
    return request("/users/profile/participant", {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
  },

  // Fetch a public participant profile by ID or handle
  getParticipantProfile: async (id) => {
    return request(`/users/participant/${id}`);
  },

  // Send a connection request with optional note (max 300 chars)
  sendConnectionRequest: async (receiverId, note = null) => {
    return request("/network/requests", {
      method: "POST",
      body: JSON.stringify({ receiverId, note }),
    });
  },

  // Fetch connections, incoming requests (with optional notes), and sent requests
  getNetworkRequests: async () => {
    return request("/network/requests");
  },

  // Accept or decline an incoming connection request
  respondToConnectionRequest: async (id, action) => {
    return request(`/network/requests/${id}`, {
      method: "PUT",
      body: JSON.stringify({ action }),
    });
  },
};
