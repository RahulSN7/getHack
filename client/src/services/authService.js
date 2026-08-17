// ---------------------------------------------------------------------------
// authService.js — Centralized Authentication API Service
// Communicates with Express backend via Vite /api proxy.
// ---------------------------------------------------------------------------

const API_BASE = "/api/auth";

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
      if (response.status === 409) {
        message = "An account with this email already exists.";
      } else if (response.status === 504 || response.status === 502 || response.status === 503) {
        message = "Backend server is unreachable. Please ensure the Express server is running on port 5000.";
      } else if (response.status === 404) {
        message = "Authentication API endpoint not found.";
      } else {
        message = "Unable to process authentication request. Please try again.";
      }
    }
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export const authService = {
  // Login user
  async login({ email, password }) {
    const response = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
  },

  // Signup user with single role ('participant' or 'organizer')
  async signup({ name, email, password, role }) {
    const response = await fetch(`${API_BASE}/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ name, email, password, role }),
    });
    return handleResponse(response);
  },

  // Get current authenticated user
  async getCurrentUser() {
    const response = await fetch(`${API_BASE}/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    return handleResponse(response);
  },

  // Logout user & clear session
  async logout() {
    const response = await fetch(`${API_BASE}/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    return handleResponse(response);
  },
};
