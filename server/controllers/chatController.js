// ---------------------------------------------------------------------------
// server/controllers/chatController.js — Chat Token Controller
// Generates Stream Chat tokens for authenticated getHack users.
// ---------------------------------------------------------------------------

const { generateStreamToken, upsertStreamUser } = require("../services/streamService");

// ---------------------------------------------------------------------------
// GET /api/chat/token — Get Stream Chat Token for Current User
// ---------------------------------------------------------------------------
const getStreamToken = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthenticated." });
    }

    // Upsert the authenticated user into Stream Chat
    const streamUserId = await upsertStreamUser(req.user);

    // Generate a user-scoped token
    const token = generateStreamToken(streamUserId);

    const apiKey = process.env.STREAM_API_KEY;

    return res.status(200).json({
      success: true,
      token,
      apiKey,
      user: {
        id: streamUserId,
        name: req.user.name,
        image: req.user.profile?.avatar || "",
      },
    });
  } catch (error) {
    console.error("GET STREAM TOKEN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate chat token.",
    });
  }
};

module.exports = {
  getStreamToken,
};
