// ---------------------------------------------------------------------------
// chatService.js — Chat API Service
// Fetches Stream Chat token from the getHack backend.
// ---------------------------------------------------------------------------

const API_BASE_URL = "/api";

export const chatService = {
  /**
   * Fetches a Stream Chat token for the currently authenticated user.
   * @returns {{ token: string, apiKey: string, user: object }}
   */
  async getChatToken() {
    const response = await fetch(`${API_BASE_URL}/chat/token`, {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.message || "Failed to get chat token.");
      error.status = response.status;
      throw error;
    }

    return data;
  },
};
