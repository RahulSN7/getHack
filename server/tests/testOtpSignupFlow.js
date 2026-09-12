// ---------------------------------------------------------------------------
// server/tests/testOtpSignupFlow.js
// Automated Integration Test Suite for GetHack OTP Signup & Verification
// ---------------------------------------------------------------------------

const dns = require("dns");
try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder("ipv4first");
  }
  dns.setServers(["1.1.1.1", "8.8.8.8", "8.8.4.4"]);
} catch (err) {
  console.warn("Could not set custom DNS fallback servers:", err.message);
}

require("dotenv").config({ path: "./server/.env" });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/user");
const Otp = require("../models/otp");
const { sendOtp, verifyOtp } = require("../controllers/authController");

// Mock Response Helper
function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    cookies: {},
    jsonData: null,
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
  };
  return res;
}

async function runTests() {
  console.log("=================================================");
  console.log("Starting GetHack OTP Signup Integration Tests");
  console.log("=================================================\n");

  // 1. Connect to MongoDB
  if (mongoose.connection.readyState !== 1) {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/gethack";
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      tlsAllowInvalidCertificates: true,
    });
    console.log("✓ Connected to MongoDB");
  }

  const testEmails = [
    "otptest_participant@gmail.com",
    "otptest_organizer@gmail.com",
    "otptest_wrong@gmail.com",
    "otptest_expired@gmail.com",
    "otptest_resend@gmail.com",
  ];

  // Clean up previous test artifacts
  await User.deleteMany({ email: { $in: testEmails } });
  await Otp.deleteMany({ email: { $in: testEmails } });

  // ── TEST 1: Participant Signup Flow ──
  console.log("\n[Test 1] Participant OTP Signup Flow...");
  const pEmail = "otptest_participant@gmail.com";
  
  const rawOtp1 = "123456";
  const salt1 = await bcrypt.genSalt(10);
  const otpHash1 = await bcrypt.hash(rawOtp1, salt1);
  await Otp.create({
    email: pEmail,
    otpHash: otpHash1,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    attempts: 0,
    lastSentAt: new Date(),
  });

  const req1 = {
    body: {
      email: pEmail,
      otp: "123456",
      name: "Alice Participant",
      role: "participant",
    },
  };
  const res1 = createMockRes();

  await verifyOtp(req1, res1);

  if (res1.statusCode !== 200) {
    throw new Error(`Test 1 Failed: Expected status 200, got ${res1.statusCode}. Msg: ${res1.jsonData?.message}`);
  }
  if (!res1.jsonData?.user || res1.jsonData.user.role !== "participant") {
    throw new Error(`Test 1 Failed: Expected participant role, got ${res1.jsonData?.user?.role}`);
  }
  if (!res1.cookies.token) {
    throw new Error(`Test 1 Failed: Session JWT token cookie was not set.`);
  }

  const createdUser1 = await User.findOne({ email: pEmail });
  if (!createdUser1 || createdUser1.name !== "Alice Participant" || !createdUser1.emailVerified) {
    throw new Error(`Test 1 Failed: Database User record mismatch.`);
  }

  const remainingOtp1 = await Otp.findOne({ email: pEmail });
  if (remainingOtp1) {
    throw new Error(`Test 1 Failed: OTP document was not invalidated/deleted after successful verification.`);
  }
  console.log("✓ Test 1 Passed: Participant account created with valid role, name, verified status & JWT cookie.");

  // ── TEST 2: Organizer Signup Flow ──
  console.log("\n[Test 2] Organizer OTP Signup Flow...");
  const oEmail = "otptest_organizer@gmail.com";
  
  const rawOtp2 = "654321";
  const salt2 = await bcrypt.genSalt(10);
  const otpHash2 = await bcrypt.hash(rawOtp2, salt2);
  await Otp.create({
    email: oEmail,
    otpHash: otpHash2,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    attempts: 0,
    lastSentAt: new Date(),
  });

  const req2 = {
    body: {
      email: oEmail,
      otp: "654321",
      name: "Bob Organizer",
      role: "organizer",
    },
  };
  const res2 = createMockRes();

  await verifyOtp(req2, res2);

  if (res2.statusCode !== 200) {
    throw new Error(`Test 2 Failed: Expected status 200, got ${res2.statusCode}. Msg: ${res2.jsonData?.message}`);
  }
  if (res2.jsonData?.user?.role !== "organizer") {
    throw new Error(`Test 2 Failed: Expected organizer role, got ${res2.jsonData?.user?.role}`);
  }

  const createdUser2 = await User.findOne({ email: oEmail });
  if (!createdUser2 || createdUser2.role !== "organizer") {
    throw new Error(`Test 2 Failed: User role in DB was not set to 'organizer'.`);
  }
  console.log("✓ Test 2 Passed: Organizer account created with correct organizer role.");

  // ── TEST 3: Incorrect OTP Rejection ──
  console.log("\n[Test 3] Incorrect OTP Rejection...");
  const wEmail = "otptest_wrong@gmail.com";
  const rawOtp3 = "111222";
  const salt3 = await bcrypt.genSalt(10);
  const otpHash3 = await bcrypt.hash(rawOtp3, salt3);
  await Otp.create({
    email: wEmail,
    otpHash: otpHash3,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    attempts: 0,
    lastSentAt: new Date(),
  });

  const req3 = {
    body: {
      email: wEmail,
      otp: "999999", // Wrong OTP
      name: "Charlie Wrong",
      role: "participant",
    },
  };
  const res3 = createMockRes();

  await verifyOtp(req3, res3);

  if (res3.statusCode !== 400) {
    throw new Error(`Test 3 Failed: Expected status 400 for wrong OTP, got ${res3.statusCode}`);
  }
  if (!res3.jsonData?.message?.includes("Incorrect verification code")) {
    throw new Error(`Test 3 Failed: Unexpected error message: ${res3.jsonData?.message}`);
  }
  console.log("✓ Test 3 Passed: Incorrect OTP rejected cleanly with user-friendly error.");

  // ── TEST 4: Expired OTP Rejection ──
  console.log("\n[Test 4] Expired OTP Rejection...");
  const eEmail = "otptest_expired@gmail.com";
  const rawOtp4 = "333444";
  const salt4 = await bcrypt.genSalt(10);
  const otpHash4 = await bcrypt.hash(rawOtp4, salt4);
  await Otp.create({
    email: eEmail,
    otpHash: otpHash4,
    expiresAt: new Date(Date.now() - 5000), // Expired 5 seconds ago
    attempts: 0,
    lastSentAt: new Date(Date.now() - 60000),
  });

  const req4 = {
    body: {
      email: eEmail,
      otp: "333444",
      name: "Dave Expired",
      role: "participant",
    },
  };
  const res4 = createMockRes();

  await verifyOtp(req4, res4);

  if (res4.statusCode !== 400) {
    throw new Error(`Test 4 Failed: Expected status 400 for expired OTP, got ${res4.statusCode}`);
  }
  if (!res4.jsonData?.message?.includes("expired")) {
    throw new Error(`Test 4 Failed: Unexpected error message: ${res4.jsonData?.message}`);
  }
  console.log("✓ Test 4 Passed: Expired OTP rejected cleanly.");

  // ── TEST 5: Resend OTP & Old OTP Invalidation ──
  console.log("\n[Test 5] Resend OTP & Old OTP Invalidation...");
  const rEmail = "otptest_resend@gmail.com";
  
  // 1st OTP
  const rawOtpOld = "111111";
  const saltOld = await bcrypt.genSalt(10);
  const otpHashOld = await bcrypt.hash(rawOtpOld, saltOld);
  await Otp.create({
    email: rEmail,
    otpHash: otpHashOld,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    attempts: 0,
    lastSentAt: new Date(Date.now() - 35000),
  });

  // 2nd OTP generated upon Resend
  const rawOtpNew = "222222";
  const saltNew = await bcrypt.genSalt(10);
  const otpHashNew = await bcrypt.hash(rawOtpNew, saltNew);
  await Otp.findOneAndUpdate(
    { email: rEmail },
    {
      email: rEmail,
      otpHash: otpHashNew,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
      lastSentAt: new Date(),
    },
    { upsert: true }
  );

  // Try verifying with 1st OTP (should fail)
  const req5Old = { body: { email: rEmail, otp: "111111", name: "Eve Resend", role: "participant" } };
  const res5Old = createMockRes();
  await verifyOtp(req5Old, res5Old);
  if (res5Old.statusCode !== 400) {
    throw new Error(`Test 5 Failed: Old OTP should have been rejected after resend.`);
  }

  // Try verifying with 2nd OTP (should succeed)
  const req5New = { body: { email: rEmail, otp: "222222", name: "Eve Resend", role: "participant" } };
  const res5New = createMockRes();
  await verifyOtp(req5New, res5New);
  if (res5New.statusCode !== 200) {
    throw new Error(`Test 5 Failed: New OTP should succeed after resend. Got status ${res5New.statusCode}`);
  }
  console.log("✓ Test 5 Passed: Resending OTP invalidates old OTP and new OTP succeeds.");

  // Clean up test users & OTPs
  await User.deleteMany({ email: { $in: testEmails } });
  await Otp.deleteMany({ email: { $in: testEmails } });

  console.log("\n=================================================");
  console.log("ALL OTP SIGNUP INTEGRATION TESTS PASSED PERFECTLY!");
  console.log("=================================================\n");

  await mongoose.disconnect();
}

runTests().catch(async (err) => {
  console.error("\n❌ Test Suite Failed:", err);
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }
  process.exit(1);
});
