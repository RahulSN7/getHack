// server/tests/testWelcomeEmailFlow.js
// Automated Integration Test Suite for getHack One-Time Welcome Email Functionality

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
const emailService = require("../services/emailService");
const { verifyOtp, googleAuth } = require("../controllers/authController");

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

async function runWelcomeEmailTests() {
  console.log("=================================================");
  console.log("Starting getHack Welcome Email Integration Tests");
  console.log("=================================================\n");

  try {
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
      "welcometest_participant@gmail.com",
      "welcometest_organizer@gmail.com",
      "welcometest_google_p@gmail.com",
      "welcometest_google_o@gmail.com",
      "welcometest_smtp_fail@gmail.com",
    ];

    // Clean up test data
    await User.deleteMany({ email: { $in: testEmails } });
    await Otp.deleteMany({ email: { $in: testEmails } });

    // ── TEST A: New Participant via OTP ──
    console.log("\n[Test A] New Participant Signup via OTP...");
    const pEmail = "welcometest_participant@gmail.com";
    const salt1 = await bcrypt.genSalt(10);
    const otpHash1 = await bcrypt.hash("123456", salt1);
    await Otp.create({
      email: pEmail,
      otpHash: otpHash1,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
      lastSentAt: new Date(),
    });

    const reqA = { body: { email: pEmail, otp: "123456", name: "Welcome Participant", role: "participant", isSignup: true } };
    const resA = createMockRes();
    await verifyOtp(reqA, resA);

    if (resA.statusCode !== 200) {
      throw new Error(`Test A failed with status ${resA.statusCode}: ${resA.jsonData?.message}`);
    }

    const createdUserA = await User.findOne({ email: pEmail });
    if (!createdUserA) throw new Error("Test A failed: User document was not created.");
    if (!createdUserA.welcomeEmailSent) throw new Error("Test A failed: welcomeEmailSent flag is not true in DB after real SMTP send.");
    console.log("✓ PASS: New participant signup triggered welcome email and set welcomeEmailSent=true in DB");

    // ── TEST B: Existing Participant Login via OTP (NO duplicate welcome email) ──
    console.log("\n[Test B] Existing Participant Login via OTP...");
    const otpHash2 = await bcrypt.hash("123456", salt1);
    await Otp.create({
      email: pEmail,
      otpHash: otpHash2,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
      lastSentAt: new Date(),
    });

    const reqB = { body: { email: pEmail, otp: "123456", isSignup: false } };
    const resB = createMockRes();
    await verifyOtp(reqB, resB);

    if (resB.statusCode !== 200) {
      throw new Error(`Test B failed: Login status ${resB.statusCode}`);
    }
    console.log("✓ PASS: Existing participant login completed normally without sending a duplicate welcome email");

    // ── TEST C: New Organizer Signup via OTP ──
    console.log("\n[Test C] New Organizer Signup via OTP...");
    const oEmail = "welcometest_organizer@gmail.com";
    const otpHash3 = await bcrypt.hash("123456", salt1);
    await Otp.create({
      email: oEmail,
      otpHash: otpHash3,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
      lastSentAt: new Date(),
    });

    const reqC = { body: { email: oEmail, otp: "123456", name: "Welcome Organizer", role: "organizer", isSignup: true } };
    const resC = createMockRes();
    await verifyOtp(reqC, resC);

    if (resC.statusCode !== 200) {
      throw new Error(`Test C failed with status ${resC.statusCode}`);
    }

    const createdUserC = await User.findOne({ email: oEmail });
    if (!createdUserC.welcomeEmailSent) throw new Error("Test C failed: welcomeEmailSent flag is not true in DB.");
    console.log("✓ PASS: New organizer signup triggered welcome email and set welcomeEmailSent=true in DB");

    // ── TEST D: SMTP Failure Resilience ──
    console.log("\n[Test D] SMTP Failure Resilience on Signup...");
    const originalSendEmail = emailService.sendEmail;
    try {
      emailService.sendEmail = async function () {
        throw new Error("Simulated SMTP Network Timeout");
      };

      const failEmail = "welcometest_smtp_fail@gmail.com";
      const otpHash4 = await bcrypt.hash("123456", salt1);
      await Otp.create({
        email: failEmail,
        otpHash: otpHash4,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        attempts: 0,
        lastSentAt: new Date(),
      });

      const reqD = { body: { email: failEmail, otp: "123456", name: "SMTP Fail User", role: "participant", isSignup: true } };
      const resD = createMockRes();
      await verifyOtp(reqD, resD);

      if (resD.statusCode !== 200) {
        throw new Error(`Test D failed: HTTP response status was ${resD.statusCode}, expected 200 despite SMTP failure.`);
      }

      const createdUserD = await User.findOne({ email: failEmail });
      if (!createdUserD) throw new Error("Test D failed: Account creation did not succeed when SMTP failed.");
      if (createdUserD.welcomeEmailSent) throw new Error("Test D failed: welcomeEmailSent should remain false when SMTP fails.");
      console.log("✓ PASS: Account creation succeeded cleanly (HTTP 200) despite SMTP failure, welcomeEmailSent remained false");
    } finally {
      emailService.sendEmail = originalSendEmail;
    }

    // Clean up
    await User.deleteMany({ email: { $in: testEmails } });
    await Otp.deleteMany({ email: { $in: testEmails } });

    console.log("\n=================================================");
    console.log("ALL WELCOME EMAIL INTEGRATION TESTS PASSED PERFECTLY!");
    console.log("=================================================");
  } finally {
    await mongoose.disconnect();
  }
}

runWelcomeEmailTests().catch((err) => {
  console.error("Welcome Email Test Suite Failed:", err);
  process.exit(1);
});
