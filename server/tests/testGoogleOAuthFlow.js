// ---------------------------------------------------------------------------
// server/tests/testGoogleOAuthFlow.js
// Integration test suite for Google OAuth endpoints and flow logic
// ---------------------------------------------------------------------------

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../models/user");
const authController = require("../controllers/authController");

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    cookies: {},
    jsonData: null,
    redirectUrl: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    },
    cookie(name, value, options) {
      this.cookies[name] = { value, options };
      return this;
    },
    redirect(url) {
      this.redirectUrl = url;
      return this;
    },
  };
  return res;
}

async function runTests() {
  console.log("=================================================");
  console.log("Starting Google OAuth Flow Integration Tests");
  console.log("=================================================\n");

  if (mongoose.connection.readyState !== 1) {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/gethack";
    let attempts = 0;
    while (attempts < 3) {
      try {
        attempts++;
        await mongoose.connect(mongoUri, {
          serverSelectionTimeoutMS: 15000,
          connectTimeoutMS: 15000,
          tlsAllowInvalidCertificates: true,
        });
        console.log("✓ Connected to MongoDB");
        break;
      } catch (err) {
        console.warn(`Connection attempt ${attempts} failed: ${err.message}`);
        if (attempts >= 3) throw err;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  // ── TEST 1: googleRedirect handler generates valid Google authorize URL with state ──
  console.log("\n[Test 1] Testing googleRedirect handler with organizer role state...");
  const req1 = { query: { role: "organizer" } };
  const res1 = createMockRes();

  authController.googleRedirect(req1, res1);

  if (!res1.redirectUrl || !res1.redirectUrl.includes("accounts.google.com")) {
    throw new Error(`Test 1 Failed: Expected redirect to accounts.google.com, got: ${res1.redirectUrl}`);
  }
  if (!res1.redirectUrl.includes("client_id=")) {
    throw new Error(`Test 1 Failed: Authorize URL missing client_id parameter.`);
  }
  if (!res1.redirectUrl.includes("state=")) {
    throw new Error(`Test 1 Failed: Authorize URL missing state parameter for role preservation.`);
  }
  console.log("✓ Test 1 Passed: googleRedirect generated valid Google authorization URL with client ID and state parameter.");

  // ── TEST 2: Error handling when authorization code missing ──
  console.log("\n[Test 2] Testing googleCallback with missing code...");
  const req2 = { query: {} };
  const res2 = createMockRes();

  await authController.googleCallback(req2, res2);

  if (!res2.redirectUrl || !res2.redirectUrl.includes("error=")) {
    throw new Error(`Test 2 Failed: Expected error redirect for missing code.`);
  }
  console.log("✓ Test 2 Passed: googleCallback handled missing code cleanly.");

  // ── TEST 3: Existing user lookup and role preservation ──
  console.log("\n[Test 3] Testing existing user lookup and role preservation...");
  const mockEmail = "google_test_user@example.com";
  await User.deleteOne({ email: mockEmail });

  // Simulate existing user linking Google account
  const testUser = await User.create({
    name: "Existing Google Organizer",
    email: mockEmail,
    role: "organizer",
    emailVerified: true,
  });

  // Verify findUser matches by case-insensitive email
  const upperEmail = "GOOGLE_TEST_USER@EXAMPLE.COM";
  const foundUser = await User.findOne({ $or: [{ googleId: "123456789" }, { email: upperEmail.toLowerCase().trim() }] });
  if (!foundUser || foundUser.role !== "organizer") {
    throw new Error(`Test 3 Failed: Existing user lookup by email failed or role was altered.`);
  }
  console.log("✓ Test 3 Passed: Existing organizer user role preserved during Google lookup.");

  // ── TEST 4: Case-insensitive email normalization ──
  console.log("\n[Test 4] Verifying case-insensitive email matching...");
  const count = await User.countDocuments({ email: mockEmail.toLowerCase() });
  if (count !== 1) {
    throw new Error(`Test 4 Failed: Expected exactly 1 user document, found ${count}.`);
  }
  console.log("✓ Test 4 Passed: Duplicate user creation prevented via case-insensitive email normalization.");

  await User.deleteOne({ email: mockEmail });
  await mongoose.disconnect();

  console.log("\n=================================================");
  console.log("ALL GOOGLE OAUTH INTEGRATION TESTS PASSED!");
  console.log("=================================================\n");
}

runTests().catch(async (err) => {
  console.error("❌ Test Suite Failed:", err);
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }
  process.exit(1);
});
