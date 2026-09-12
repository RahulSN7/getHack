// ---------------------------------------------------------------------------
// client/src/services/aiService.js — Frontend Service for getHack AI
// Communicates with Express backend /api/ai endpoints.
// ---------------------------------------------------------------------------

const API_BASE = "/api/ai";

async function handleResponse(response) {
  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const error = new Error(data?.message || "AI Request failed.");
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export const aiService = {
  /**
   * Send a user goal / prompt to getHack AI
   * @param {Object} payload { message, conversationId, context }
   */
  async sendMessage({ message, conversationId, context }) {
    const response = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ message, conversationId, context }),
    });
    return handleResponse(response);
  },

  /**
   * Fetch conversation history list for current user
   */
  async getConversations() {
    const response = await fetch(`${API_BASE}/conversations`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    return handleResponse(response);
  },

  /**
   * Fetch conversation detail by ID
   */
  async getConversationById(id) {
    const response = await fetch(`${API_BASE}/conversations/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    return handleResponse(response);
  },

  /**
   * Delete a conversation
   */
  async deleteConversation(id) {
    const response = await fetch(`${API_BASE}/conversations/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    return handleResponse(response);
  },
};
