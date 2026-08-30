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
   * Check chat access & connection authorization for a target user.
   */
  async checkChatAccess(targetUserId) {
    const response = await fetch(`${API_BASE_URL}/chat/access/${targetUserId}`, {
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

  /**
   * Clear all messages in a chat conversation for both users.
   */
  async clearChat(cid) {
    const response = await fetch(`${API_BASE_URL}/chat/clear`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cid }),
    });
    return response.json();
  },

  /**
   * Upload a file or image attachment for chat / group avatar.
   */
  async uploadFile(file) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/chat/upload`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Failed to upload file.");
    }
    return data;
  },

  /**
   * Create a persistent group chat in MongoDB backend & Stream Chat.
   */
  async createGroup({ name, memberUserIds, avatarUrl }) {
    const response = await fetch(`${API_BASE_URL}/chat/groups`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, memberUserIds, avatarUrl }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Failed to create persistent group.");
    }
    return data;
  },

  /**
   * Fetch all persistent groups for the authenticated user from MongoDB.
   */
  async getGroups() {
    const response = await fetch(`${API_BASE_URL}/chat/groups`, {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch user groups.");
    }
    return data;
  },

  /**
   * Fetch single group details by ID or channel ID.
   */
  async getGroupById(groupId) {
    const response = await fetch(`${API_BASE_URL}/chat/groups/${groupId}`, {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(data.message || "Failed to fetch group details.");
      err.status = response.status;
      throw err;
    }
    return data;
  },

  /**
   * Update group description.
   */
  async updateGroupDescription(groupId, description) {
    const response = await fetch(`${API_BASE_URL}/chat/groups/${groupId}/description`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Failed to update group description.");
    }
    return data;
  },

  /**
   * Add members to an existing group.
   */
  async addGroupMembers(groupId, memberUserIds) {
    const response = await fetch(`${API_BASE_URL}/chat/groups/${groupId}/members`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberUserIds }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Failed to add members to group.");
    }
    return data;
  },

  /**
   * Update group avatar (admin only).
   */
  async updateGroupAvatar(groupId, avatarUrl) {
    const response = await fetch(`${API_BASE_URL}/chat/groups/${groupId}/avatar`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarUrl }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Failed to update group avatar.");
    }
    return data;
  },

  /**
   * Update group name (admin only).
   */
  async updateGroupName(groupId, name) {
    const response = await fetch(`${API_BASE_URL}/chat/groups/${groupId}/name`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Failed to update group name.");
    }
    return data;
  },

  /**
   * Remove a member from group (admin only).
   */
  async removeGroupMember(groupId, memberId) {
    const response = await fetch(`${API_BASE_URL}/chat/groups/${groupId}/members/${memberId}`, {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Failed to remove member from group.");
    }
    return data;
  },

  /**
   * Fetch groups from which the current user was removed (read-only access).
   */
  async getRemovedGroups() {
    const response = await fetch(`${API_BASE_URL}/chat/groups/removed`, {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch removed groups.");
    }
    return data;
  },

  /**
   * Exit group chat (WhatsApp-style self-exit).
   */
  async exitGroup(groupId) {
    const response = await fetch(`${API_BASE_URL}/chat/groups/${groupId}/exit`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Failed to exit group.");
    }
    return data;
  },

  /**
   * Delete group chat for current user only (WhatsApp-style self-delete).
   */
  async deleteGroupForMe(groupId) {
    const response = await fetch(`${API_BASE_URL}/chat/groups/${groupId}/delete-for-me`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Failed to delete group for you.");
    }
    return data;
  },
};