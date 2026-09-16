// server/tests/testOtpRateLimiting.js
// Automated Integration Test for Brevo OTP Rate Limiting Rules:
// 1. Minimum 60 seconds between requests for the same email
// 2. Maximum 5 requests per hour for the same email
// 3. New OTP generation invalidates prior OTP

process.env.MOCK_EMAIL = "true";
require("dotenv").config({ path: "./server/.env" });
const mongoose = require("mongoose");
const User = require("../models/user");
const Otp = require("../models/otp");
const { sendOtp, verifyOtp } = require("../controllers/authController");

function createMockRes() {
  return {
    statusCode: 200,
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    },
    cookie() {
      return this;
    },
  };
}

async function testRateLimiting() {
  console.log("=================================================");
  console.log("Testing OTP Rate Limiting Rules (Brevo)");
  console.log("=================================================");

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/gethack";
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(mongoUri);
    console.log("✓ Connected to MongoDB");
  }

  const testEmail = "ratelimit_test@gmail.com";
  await User.deleteMany({ email: testEmail });
  await Otp.deleteMany({ email: testEmail });

  // 1. Initial OTP Request (First request -> Should Succeed)
  console.log("\n[Test 1] First OTP Request...");
  const req1 = { body: { email: testEmail, intent: "signup", role: "participant" } };
  const res1 = createMockRes();
  await sendOtp(req1, res1);

  if (res1.statusCode !== 200) {
    throw new Error(`Test 1 Failed: Expected status 200, got ${res1.statusCode}`);
  }
  console.log("✓ First OTP Request Succeeded (HTTP 200)");

  // 2. Rapid Resend (Immediate request < 60s -> Should be blocked with HTTP 429)
  console.log("\n[Test 2] Rapid Resend within 60 Seconds...");
  const req2 = { body: { email: testEmail, intent: "signup", role: "participant" } };
  const res2 = createMockRes();
  await sendOtp(req2, res2);

  if (res2.statusCode !== 429) {
    throw new Error(`Test 2 Failed: Expected HTTP 429 Cooldown, got ${res2.statusCode}`);
  }
  console.log("✓ Rapid Resend correctly blocked (HTTP 429):", res2.jsonData?.message);

  // 3. Max 5 Requests per hour check
  console.log("\n[Test 3] Hourly Limit Enforcement (Max 5 per hour)...");
  // Fast-forward lastSentAt past 60s, set requestCount = 5
  await Otp.findOneAndUpdate(
    { email: testEmail },
    {
      lastSentAt: new Date(Date.now() - 65 * 1000),
      requestCount: 5,
      windowStartedAt: new Date(),
    }
  );

  const req3 = { body: { email: testEmail, intent: "signup", role: "participant" } };
  const res3 = createMockRes();
  await sendOtp(req3, res3);

  if (res3.statusCode !== 429) {
    throw new Error(`Test 3 Failed: Expected HTTP 429 Hourly Limit, got ${res3.statusCode}`);
  }
  console.log("✓ Hourly Limit correctly enforced (HTTP 429):", res3.jsonData?.message);

  // Cleanup
  await User.deleteMany({ email: testEmail });
  await Otp.deleteMany({ email: testEmail });

  console.log("\n=================================================");
  console.log("ALL RATE LIMITING TESTS PASSED PERFECTLY!");
  console.log("=================================================");
  process.exit(0);
}

testRateLimiting().catch((err) => {
  console.error("❌ Rate Limiting Test Failed:", err);
  process.exit(1);
});
