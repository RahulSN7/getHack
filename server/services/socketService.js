// ---------------------------------------------------------------------------
// server/services/socketService.js — Socket.IO Real-Time Service for getHack
// Encapsulates Socket.IO server initialization, JWT auth, user room routing & notification events
// ---------------------------------------------------------------------------

const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const cookieParser = require("cookie-parser");

let io = null;

/**
 * Helper to parse cookies from handshake request header
 */
function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  const list = {};
  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    const name = parts.shift().trim();
    const value = decodeURIComponent(parts.join("="));
    if (name && value) {
      list[name] = value;
    }
  });
  return list;
}

/**
 * Initialize Socket.IO Server attached to Express HTTP server instance
 */
function initSocketService(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
    path: "/socket.io/",
  });

  // Socket authentication middleware using JWT token
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.request.headers.cookie;
      const cookies = parseCookies(cookieHeader);
      let token = cookies.token;

      // Fallback to handshake auth token / Bearer header
      if (!token && socket.handshake.auth && socket.handshake.auth.token) {
        token = socket.handshake.auth.token;
      }
      if (!token && socket.handshake.headers.authorization && socket.handshake.headers.authorization.startsWith("Bearer ")) {
        token = socket.handshake.headers.authorization.split(" ")[1];
      }

      if (!token) {
        console.warn("[NOTIFICATION REALTIME] Connection rejected: No authentication token.");
        return next(new Error("Unauthenticated socket connection."));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "gethack_super_secret_jwt_key_2026"
      );

      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        console.warn("[NOTIFICATION REALTIME] Connection rejected: User account not found.");
        return next(new Error("User account no longer exists."));
      }

      socket.user = user;
      socket.userId = user._id.toString();
      next();
    } catch (err) {
      console.warn("[NOTIFICATION REALTIME] Authentication failed:", err.message);
      next(new Error("Invalid or expired session."));
    }
  });

  io.on("connection", (socket) => {
    const roomName = `user:${socket.userId}`;
    socket.join(roomName);

    console.log(`[NOTIFICATION REALTIME] Connected user: ${socket.userId} (socket ${socket.id}, joined room ${roomName})`);

    socket.on("disconnect", (reason) => {
      console.log(`[NOTIFICATION REALTIME] Disconnected user: ${socket.userId} (reason: ${reason})`);
    });
  });

  return io;
}

/**
 * Get active Socket.IO server instance
 */
function getIO() {
  return io;
}

/**
 * Emit a real-time notification event strictly to the designated recipient's socket room
 *
 * Event name: "notification:created"
 * Payload: { notification }
 */
function emitNotificationToUser(recipientId, notification) {
  if (!io) {
    console.warn("[NOTIFICATION REALTIME] Cannot emit notification: Socket.IO server not initialized.");
    return false;
  }

  if (!recipientId || !notification) {
    return false;
  }

  const recipientStr = recipientId.toString();
  const roomName = `user:${recipientStr}`;

  console.log(`[NOTIFICATION REALTIME] Emitting event "notification:created" for notification ${notification._id} to room ${roomName}`);

  io.to(roomName).emit("notification:created", {
    notification,
  });

  return true;
}

module.exports = {
  initSocketService,
  getIO,
  emitNotificationToUser,
};
