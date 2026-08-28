// ---------------------------------------------------------------------------
// client/src/services/invitationService.js
// API Service for sending and responding to Team Invitations via Stream Chat
// ---------------------------------------------------------------------------

const API_BASE = "/api/invitations";

async function handleResponse(response) {
  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const message = data?.message || "Invitation request failed.";
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export const invitationService = {
  // Send Team Invitation directly into Stream Chat conversation
  async sendInvitation({ teamId, receiverId }) {
    const response = await fetch(`${API_BASE}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ teamId, receiverId }),
    });
    return handleResponse(response);
  },

  // Respond to Team Invitation (Accept or Reject)
  async respondToInvitation(invitationId, action) {
    const response = await fetch(`${API_BASE}/${invitationId}/respond`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ action }),
    });
    return handleResponse(response);
  },

  // Get single invitation details by ID
  async getInvitation(invitationId) {
    const response = await fetch(`${API_BASE}/${invitationId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    return handleResponse(response);
  },
};

export default invitationService;
