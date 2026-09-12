// server/tests/testOAuthDiagnostic.js
const http = require("http");
const dns = require("dns");
require("dotenv").config({ path: "./server/.env" });

console.log("=== OAUTH DIAGNOSTIC REPORT ===");
console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID ? "Configured (" + process.env.GOOGLE_CLIENT_ID.slice(0, 10) + "...)" : "MISSING");
console.log("GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET ? "Configured" : "MISSING");
console.log("GOOGLE_CALLBACK_URL:", process.env.GOOGLE_CALLBACK_URL || "MISSING");
console.log("CLIENT_URL:", process.env.CLIENT_URL || "MISSING");

// Test HTTP connection to localhost:5000
function testBackend(host, port, pathStr) {
  return new Promise((resolve) => {
    const req = http.get({ host, port, path: pathStr }, (res) => {
      console.log(`[HTTP TEST ${host}:${port}${pathStr}] Status: ${res.statusCode}, Location: ${res.headers.location || 'none'}`);
      resolve({ status: res.statusCode, location: res.headers.location });
    });
    req.on("error", (err) => {
      console.error(`[HTTP TEST ${host}:${port}${pathStr}] ERROR:`, err.message);
      resolve({ error: err.message });
    });
  });
}

async function run() {
  console.log("\nTesting Express Backend Ports...");
  await testBackend("127.0.0.1", 5000, "/api/auth/google");
  await testBackend("localhost", 5000, "/api/auth/google");
}

run();
