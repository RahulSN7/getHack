// ---------------------------------------------------------------------------
// chatService.js — Chat API Service
// ---------------------------------------------------------------------------

const API_BASE_URL = "/api";

export const chatService = {
  /**
   * Fetch Stream Chat token for authenticated user.
   */
  async getChatToken() {
    const response = await fetch(`${API_BASE_URL}/chat/token`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.message || "Failed to get chat token.");
      error.status = response.status;
      throw error;
    }

    return data;
  },

  /**
   * Ensure target getHack connection exists in
   * Stream Chat before creating a channel.
   */
  async ensureTargetUser(targetUserId) {
    if (!targetUserId) {
      throw new Error("Target user ID is missing.");
    }

    const response = await fetch(`${API_BASE_URL}/chat/ensure-user`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        targetUserId: String(targetUserId),
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.message || "Failed to synchronize chat user.");
      error.status = response.status;
      throw error;
    }

    if (!data.success) {
      throw new Error(data.message || "Stream user synchronization failed.");
    }

    return data;
  },

  /**
   * Block a user.
   */
  async blockUser(targetUserId) {
    const response = await fetch(`${API_BASE_URL}/chat/block/${targetUserId}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    return response.json();
  },

  /**
   * Unblock a user.
   */
  async unblockUser(targetUserId) {
    const response = await fetch(`${API_BASE_URL}/chat/unblock/${targetUserId}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    return response.json();
  },

  /**
   * Get block status for a user.
   */
  async getBlockStatus(targetUserId) {
    const response = await fetch(`${API_BASE_URL}/chat/block-status/${targetUserId}`, {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    return response.json();
  },

  /**
   * Get all chat states (favourites & closed) for current user.
   */
  async getChatStates() {
    const response = await fetch(`${API_BASE_URL}/chat/states`, {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    return response.json();
  },

  /**
   * Toggle favourite status for a channel.
   */
  async toggleFavourite(channelCid, isFavourite, targetUserId) {
    const response = await fetch(`${API_BASE_URL}/chat/favourite`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelCid, isFavourite, targetUserId }),
    });
    return response.json();
  },

  /**
   * Close a chat conversation for current user.
   */
  async closeChat(channelCid, targetUserId) {
    const response = await fetch(`${API_BASE_URL}/chat/close`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelCid, targetUserId }),
    });
    return response.json();
  },

  /**
   * Reopen a closed chat conversation for current user.
   */
  async reopenChat(channelCid) {
    const response = await fetch(`${API_BASE_URL}/chat/reopen`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelCid }),
    });
    return response.json();
  },
};