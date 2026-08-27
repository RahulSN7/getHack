// ---------------------------------------------------------------------------
// server/services/streamService.js
// Stream Chat Server-Side Integration
// ---------------------------------------------------------------------------

const { StreamChat } = require("stream-chat");

let serverClient = null;

// ---------------------------------------------------------------------------
// Get Stream server client
// ---------------------------------------------------------------------------
function getStreamClient() {
  if (!serverClient) {
    const apiKey =
      process.env.STREAM_API_KEY;

    const apiSecret =
      process.env.STREAM_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error(
        "Stream Chat credentials missing. Set STREAM_API_KEY and STREAM_API_SECRET in .env"
      );
    }

    serverClient =
      StreamChat.getInstance(
        apiKey,
        apiSecret
      );
  }

  return serverClient;
}

// ---------------------------------------------------------------------------
// Generate user token
// ---------------------------------------------------------------------------
function generateStreamToken(userId) {
  if (!userId) {
    throw new Error(
      "Cannot generate Stream token without user ID."
    );
  }

  const client = getStreamClient();

  return client.createToken(
    String(userId)
  );
}

// ---------------------------------------------------------------------------
// Format getHack user for Stream
// ---------------------------------------------------------------------------
function formatStreamUser(user) {
  if (!user) {
    throw new Error(
      "Cannot format empty user for Stream."
    );
  }

  const userId = String(
    user._id || user.id || ""
  );

  if (!userId) {
    throw new Error(
      "Cannot synchronize Stream user without an ID."
    );
  }

  const name =
    user.name || "Participant";

  const avatar =
    user.profile?.avatar ||
    user.avatar ||
    "";

  return {
    id: userId,
    name,
    image: avatar || undefined,
    role: "user",
  };
}

// ---------------------------------------------------------------------------
// Upsert one user
// ---------------------------------------------------------------------------
async function upsertStreamUser(user) {
  if (!user) {
    return null;
  }

  const client = getStreamClient();

  const streamUser =
    formatStreamUser(user);

  console.log(
    "[Stream] Upserting user:",
    streamUser.id
  );

  await client.upsertUser(
    streamUser
  );

  console.log(
    "[Stream] User upserted:",
    streamUser.id
  );

  return streamUser.id;
}

// ---------------------------------------------------------------------------
// Upsert multiple users
// ---------------------------------------------------------------------------
async function upsertStreamUsers(users) {
  if (
    !Array.isArray(users) ||
    users.length === 0
  ) {
    return [];
  }

  const client = getStreamClient();

  const formattedUsers = users
    .filter(Boolean)
    .map(formatStreamUser);

  if (
    formattedUsers.length === 0
  ) {
    return [];
  }

  console.log(
    "[Stream] Upserting users:",
    formattedUsers.map(
      (user) => user.id
    )
  );

  await client.upsertUsers(
    formattedUsers
  );

  console.log(
    "[Stream] Users upserted successfully:",
    formattedUsers.map(
      (user) => user.id
    )
  );

  return formattedUsers.map(
    (user) => user.id
  );
}

// ---------------------------------------------------------------------------
// Sync all MongoDB users
// ---------------------------------------------------------------------------
async function syncAllUsersToStream() {
  try {
    const User = require(
      "../models/user"
    );

    const allUsers =
      await User.find({});

    if (
      allUsers &&
      allUsers.length > 0
    ) {
      await upsertStreamUsers(
        allUsers
      );

      console.log(
        `[Stream Chat Sync] Successfully synchronized ${allUsers.length} MongoDB users into Stream Chat.`
      );
    }
  } catch (error) {
    console.warn(
      "Failed to synchronize all users into Stream Chat:",
      error.message
    );
  }
}

module.exports = {
  getStreamClient,
  generateStreamToken,
  upsertStreamUser,
  upsertStreamUsers,
  syncAllUsersToStream,
};