// ---------------------------------------------------------------------------
// userService.js — API Service for User Profiles & Network Connections
// Single point of interaction for participant profiles, completion, and requests
// ---------------------------------------------------------------------------

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

export const userService = {
  getOwnProfile: async () => {
    return request(
      "/users/profile"
    );
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

  getParticipants: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/users/participants${queryString ? `?${queryString}` : ""}`;
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
      return request(
        "/network/requests",
        {
          method: "POST",
          body: JSON.stringify({
            receiverId,
            note,
          }),
        }
      );
    },

  getNetworkRequests:
    async () => {
      return request(
        "/network/requests"
      );
    },

  respondToConnectionRequest:
    async (id, action) => {
      return request(
        `/network/requests/${id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            action,
          }),
        }
      );
    },

  cancelConnectionRequest:
    async (id) => {
      return request(
        `/network/requests/${id}`,
        {
          method: "DELETE",
        }
      );
    },
};