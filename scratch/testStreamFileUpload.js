// ---------------------------------------------------------------------------
// scratch/testStreamFileUpload.js
// Test Stream Chat JS SDK file upload methods
// ---------------------------------------------------------------------------

require("../server/node_modules/dotenv").config({ path: "f:/Projects/getHack/server/.env" });
const { StreamChat } = require("../server/node_modules/stream-chat");

async function testUpload() {
  const apiKey = process.env.STREAM_API_KEY;
  const apiSecret = process.env.STREAM_API_SECRET;

  console.log("Initializing StreamChat client...");
  const client = StreamChat.getInstance(apiKey, apiSecret);
  
  console.log("Checking client methods:");
  console.log("channel.sendFile exists:", typeof client.channel("messaging", "test").sendFile === "function");
  console.log("channel.sendImage exists:", typeof client.channel("messaging", "test").sendImage === "function");
}

testUpload().catch(console.error);
