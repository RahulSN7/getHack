// server/tests/testBrevoEmail.js
// Standalone development diagnostic script for Brevo Transactional Email Integration

require("dotenv").config({ path: "./server/.env" });
const { sendOtpEmail, sendWelcomeEmail } = require("../services/emailService");

async function testBrevoEmail() {
  console.log("=================================================");
  console.log("Testing Brevo Transactional Email Integration");
  console.log("=================================================");

  console.log("\n[ENV CHECK]");
  console.log("BREVO_API_KEY configured:", !!process.env.BREVO_API_KEY);
  console.log("BREVO_SENDER_EMAIL configured:", process.env.BREVO_SENDER_EMAIL || "(not set)");
  console.log("BREVO_SENDER_NAME configured:", process.env.BREVO_SENDER_NAME || "getHack (default)");

  if (!process.env.BREVO_API_KEY || !process.env.BREVO_SENDER_EMAIL) {
    console.log("\n⚠️  BREVO_API_KEY or BREVO_SENDER_EMAIL is missing in server/.env.");
    console.log("Please add valid credentials to server/.env to send real emails.");
    console.log("Testing error-handling behavior when keys are missing...");

    try {
      await sendOtpEmail("testrecipient@example.com", "123456");
      console.error("❌ ERROR: sendOtpEmail should have thrown a configuration error!");
    } catch (err) {
      console.log("✓ Correctly rejected with safe error:", err.message);
    }
    return;
  }

  const recipient = process.argv[2] || process.env.BREVO_SENDER_EMAIL || "testrecipient@example.com";
  console.log(`\nAttempting to send test OTP email to: ${recipient}`);

  try {
    const res = await sendOtpEmail(recipient, "987654");
    console.log("✓ OTP Email SUCCESS:", res);
  } catch (err) {
    console.error("❌ OTP Email FAILED:", err.message);
  }

  console.log(`\nAttempting to send test Welcome email to: ${recipient}`);
  try {
    const res2 = await sendWelcomeEmail(recipient, "Test User");
    console.log("✓ Welcome Email SUCCESS:", res2);
  } catch (err) {
    console.error("❌ Welcome Email FAILED:", err.message);
  }
}

testBrevoEmail();
