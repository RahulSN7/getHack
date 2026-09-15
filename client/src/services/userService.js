
// userService.js — API Service for User Profiles & Network Connections
// Single point of interaction for participant profiles, completion, and requests


const API_BASE_URL = "/api";

async function request(endpoint, options = {}) {
  const isFormData =
    typeof FormData !== "undefined" &&
    options.body instanceof FormData;

  const config = {
    credentials: "include",
    ...options,

    headers: {
      ...(isFormData
        ? {}
        : {
          "Content-Type":
            "application/json",
        }),

      ...(options.headers || {}),
    },
  };

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    config
  );

  const data =
    await response.json().catch(
      () => ({})
    );

  if (!response.ok) {
    const error = new Error(
      data.message ||
      "An unexpected error occurred."
    );

    error.status =
      response.status;

    error.data = data;

    throw error;
  }

  return data;
}

function notifyConnectionChanged(payload = {}) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("gethack:connection-changed", { detail: payload })
    );
  }
}

export const userService = {
  getOwnProfile: async () => {
    return request(
      "/users/profile"
    );
  },

  getProfileById: async (id) => {
    return request(`/users/profile/${id || "me"}`);
  },

  updateParticipantProfile:
    async (profileData) => {
      return request(
        "/users/profile/participant",
        {
          method: "PUT",
          body: profileData,
        }
      );
    },

  getOrganizerProfile: async (id) => {
    return request(`/users/organizer/${id || "me"}`);
  },

  updateOrganizerProfile: async (profileData) => {
    return request(
      "/users/profile/organizer",
      {
        method: "PUT",
        body: typeof FormData !== "undefined" && profileData instanceof FormData ? profileData : JSON.stringify(profileData),
      }
    );
  },

  getParticipants: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/users/participants${queryString ? `?${queryString}` : ""}`;
    return request(endpoint);
  },

  getTeammates: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/users/teammates${queryString ? `?${queryString}` : ""}`;
    return request(endpoint);
  },

  getParticipantProfile:
    async (id) => {
      return request(
        `/users/participant/${id}`
      );
    },

  sendConnectionRequest:
    async (
      receiverId,
      note = null
    ) => {
      const res = await request(
        "/network/requests",
        {
          method: "POST",
          body: JSON.stringify({
            receiverId,
            note,
          }),
        }
      );
      notifyConnectionChanged({ type: "connection:request-created", receiverId, result: res });
      return res;
    },

  getNetworkRequests:
    async () => {
      return request(
        "/network/requests"
      );
    },

  respondToConnectionRequest:
    async (id, action) => {
      const res = await request(
        `/network/requests/${id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            action,
          }),
        }
      );
      const eventType = action === "accept" ? "connection:request-accepted" : "connection:request-rejected";
      notifyConnectionChanged({ type: eventType, id, action, result: res });
      return res;
    },

  cancelConnectionRequest:
    async (id) => {
      const res = await request(
        `/network/requests/${id}`,
        {
          method: "DELETE",
        }
      );
      notifyConnectionChanged({ type: "connection:request-cancelled", id, result: res });
      return res;
    },

  removeConnection:
    async (targetUserId) => {
      const res = await request(
        `/network/connections/${targetUserId}`,
        {
          method: "DELETE",
        }
      );
      notifyConnectionChanged({ type: "connection:removed", targetUserId, result: res });
      return res;
    },
};