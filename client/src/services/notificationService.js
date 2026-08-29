// ---------------------------------------------------------------------------
// client/src/services/notificationService.js — Notification API Client Service
// Communicates with Express backend notification endpoints using session cookie
// ---------------------------------------------------------------------------

const API_BASE = "/api/notifications";

async function handleResponse(response) {
  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const error = new Error(data?.message || "Unable to process notification request.");
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export const notificationService = {
  // Fetch paginated notifications for current authenticated user
  async getNotifications({ page = 1, limit = 20 } = {}) {
    const response = await fetch(`${API_BASE}?page=${page}&limit=${limit}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    return handleResponse(response);
  },

  // Fetch unread notification count
  async getUnreadNotificationCount() {
    const response = await fetch(`${API_BASE}/unread-count`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    return handleResponse(response);
  },

  // Mark single notification as read
  async markNotificationAsRead(notificationId) {
    const response = await fetch(`${API_BASE}/${notificationId}/read`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    return handleResponse(response);
  },

  // Mark all notifications as read
  async markAllNotificationsAsRead() {
    const response = await fetch(`${API_BASE}/read-all`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    return handleResponse(response);
  },

  // Delete single notification
  async deleteNotification(notificationId) {
    const response = await fetch(`${API_BASE}/${notificationId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    return handleResponse(response);
  },

  // Clear all notifications
  async clearAllNotifications() {
    const response = await fetch(`${API_BASE}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    return handleResponse(response);
  },
};
