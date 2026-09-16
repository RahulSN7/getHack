
// authService.js — Centralized OTP Authentication API Service
// Communicates with Express backend via Vite /api proxy.


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
      } else if (response.status === 429) {
        message = "Too many requests. Please wait before trying again.";
      } else if (response.status === 504 || response.status === 502 || response.status === 503) {
        message = "Backend server is unreachable. Please ensure the Express server is running on port 5000.";
      } else if (response.status === 404) {
        message = "No account found with this email. Please Sign Up first.";
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
  // Send 6-digit verification OTP to email
  // isSignup: true for Sign Up flow, false/undefined for Sign In flow
  async sendOtp({ email, role, isSignup }) {
    const response = await fetch(`${API_BASE}/send-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ email, role, isSignup: !!isSignup }),
    });
    return handleResponse(response);
  },

  // Verify OTP & complete authentication
  // isSignup: true for Sign Up flow, false/undefined for Sign In flow
  async verifyOtp({ email, otp, name, role, isSignup }) {
    const response = await fetch(`${API_BASE}/verify-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ email, otp, name, role, isSignup: !!isSignup }),
    });
    return handleResponse(response);
  },

  // Google OAuth Authentication
  async googleAuth({ credential, code, role }) {
    const response = await fetch(`${API_BASE}/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ credential, code, role }),
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

  // Logout user & clear session cookie
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
