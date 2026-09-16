require("dotenv").config({ path: "./server/.env" });
const { sendOtpEmail, sendWelcomeEmail } = require("../services/emailService");

async function testOtpDiagnostic() {
  console.log("=== Testing OTP Email Diagnostic (Brevo) ===");
  console.log("Environment check:");
  console.log("BREVO_API_KEY configured:", !!process.env.BREVO_API_KEY);
  console.log("BREVO_SENDER_EMAIL configured:", process.env.BREVO_SENDER_EMAIL || "(not set)");
  console.log("BREVO_SENDER_NAME configured:", process.env.BREVO_SENDER_NAME || "getHack (default)");

  try {
    const res = await sendOtpEmail("otptest999@gmail.com", "654321");
    console.log("OTP Email SUCCESS:", res);
  } catch (err) {
    console.error("OTP Email FAILED:", err);
  }
}

testOtpDiagnostic();
