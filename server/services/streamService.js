// ---------------------------------------------------------------------------
// server/services/streamService.js — Stream Chat Server-Side Integration
// Initializes the Stream Chat server client and provides helper functions
// for token generation and user synchronization.
// ---------------------------------------------------------------------------

const { StreamChat } = require("stream-chat");

let serverClient = null;

/**
 * Returns the initialized Stream Chat server client singleton.
 * Uses STREAM_API_KEY and STREAM_API_SECRET from environment variables.
 */
function getStreamClient() {
  if (!serverClient) {
    const apiKey = process.env.STREAM_API_KEY;
    const apiSecret = process.env.STREAM_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error(
        "Stream Chat credentials missing. Set STREAM_API_KEY and STREAM_API_SECRET in .env"
      );
    }

    serverClient = StreamChat.getInstance(apiKey, apiSecret);
  }
  return serverClient;
}

/**
 * Generates a Stream Chat user token for the given getHack user ID.
 * @param {string} userId — The MongoDB _id string of the getHack user
 * @returns {string} JWT token for Stream Chat frontend SDK
 */
function generateStreamToken(userId) {
  const client = getStreamClient();
  return client.createToken(String(userId));
}

/**
 * Upserts a getHack user into Stream Chat so they can be referenced
 * in channels and messages. Syncs name and avatar.
 * @param {object} user — A getHack user document (or safe user object)
 */
async function upsertStreamUser(user) {
  const client = getStreamClient();
  const userId = String(user._id || user.id);
  const name = user.name || "Participant";
  const avatar = user.profile?.avatar || user.avatar || "";

  // Build the full avatar URL if it's a relative path
  let image = "";
  if (avatar) {
    image = avatar.startsWith("http") ? avatar : avatar;
  }

  await client.upsertUser({
    id: userId,
    name,
    image,
    role: "user",
  });

  return userId;
}

module.exports = {
  getStreamClient,
  generateStreamToken,
  upsertStreamUser,
};
