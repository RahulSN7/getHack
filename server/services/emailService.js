// server/services/emailService.js - Brevo Transactional Email Service
// Centralized transactional email abstraction layer using Brevo API.
// Two separate email purposes - DO NOT mix them:
//   sendOtpEmail()     - Sends a 6-digit OTP verification code
//                        Used for: Sign Up OTP request, Sign In OTP request
//   sendWelcomeEmail() - Sends a welcome message on first account creation
//                        Used for: ONLY after a brand-new User document is created

const { BrevoClient } = require("@getbrevo/brevo");

console.log("[EMAIL SERVICE] Module loaded. BREVO_API_KEY configured: " + !!process.env.BREVO_API_KEY);

/**
 * Mask email for safe production logging
 * Example: testuser@gmail.com -> te*****@gmail.com
 */
function maskEmail(emailStr) {
  if (!emailStr || typeof emailStr !== "string") return "unknown";
  const parts = emailStr.trim().toLowerCase().split("@");
  if (parts.length !== 2) return "***";
  const [local, domain] = parts;
  const maskedLocal = local.length <= 2 ? local + "***" : local.slice(0, 2) + "***";
  return `${maskedLocal}@${domain}`;
}

// -------------------------------------------------------------------------------
// INTERNAL: sendEmail - Centralized Brevo Transactional Email Client
// -------------------------------------------------------------------------------
async function sendEmail({ to, subject, html, text }) {
  if (!to || typeof to !== "string" || !to.trim()) {
    throw new Error("Recipient email address 'to' is required.");
  }
  if (!subject || typeof subject !== "string" || !subject.trim()) {
    throw new Error("Email 'subject' is required.");
  }
  if (!html || typeof html !== "string") {
    throw new Error("Email 'html' content is required.");
  }

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const targetEmail = to.trim();
  if (!EMAIL_REGEX.test(targetEmail)) {
    throw new Error("Invalid recipient email address format.");
  }

  const apiKey = process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.trim() : "";
  const senderEmail = process.env.BREVO_SENDER_EMAIL ? process.env.BREVO_SENDER_EMAIL.trim() : "";
  const senderName = process.env.BREVO_SENDER_NAME ? process.env.BREVO_SENDER_NAME.trim() : "getHack";

  // Check for test / mock execution mode in automated integration test suites
  if (process.env.NODE_ENV === "test" || process.env.MOCK_EMAIL === "true" || apiKey === "mock") {
    console.log(`[EMAIL] [MOCK MODE] OTP email accepted for recipient: ${targetEmail}`);
    return { success: true, messageId: "mock-brevo-msg-id", provider: "Brevo-Mock" };
  }

  console.log("[BREVO DEBUG] OTP email send started");
  console.log(`[BREVO DEBUG] BREVO_API_KEY configured: ${!!apiKey}`);
  console.log(`[BREVO DEBUG] BREVO sender configured: ${!!senderEmail}`);

  if (!apiKey) {
    console.error("[BREVO DEBUG] Brevo request FAILED");
    console.error("[BREVO DEBUG] Error message: BREVO_API_KEY missing in environment");
    throw new Error("Brevo API key (BREVO_API_KEY) is not configured in server environment.");
  }
  if (!senderEmail) {
    console.error("[BREVO DEBUG] Brevo request FAILED");
    console.error("[BREVO DEBUG] Error message: BREVO_SENDER_EMAIL missing in environment");
    throw new Error("Brevo sender email (BREVO_SENDER_EMAIL) is not configured in server environment.");
  }

  const safeRecipient = process.env.NODE_ENV === "production" ? maskEmail(targetEmail) : targetEmail;
  console.log(`[BREVO DEBUG] Brevo request started for recipient: ${safeRecipient}`);

  let lastError = null;

  // Method 1: Brevo Node.js SDK (BrevoClient)
  try {
    const brevo = new BrevoClient({ apiKey });
    const payload = {
      subject: subject.trim(),
      htmlContent: html,
      textContent: text || html.replace(/<[^>]*>?/gm, ""),
      sender: { name: senderName, email: senderEmail },
      to: [{ email: targetEmail }],
    };

    const res = await brevo.transactionalEmails.sendTransacEmail(payload);
    const messageId = res?.messageId || res?.body?.messageId || "brevo-delivered";
    console.log("[BREVO DEBUG] Brevo request succeeded");
    console.log(`[BREVO DEBUG] Message ID received: ${messageId}`);
    return { success: true, messageId, provider: "Brevo" };
  } catch (sdkErr) {
    lastError = sdkErr;
    const statusCode = sdkErr.statusCode || sdkErr.status || (sdkErr.response ? (sdkErr.response.statusCode || sdkErr.response.status) : 500);
    const safeMsg = sdkErr.message || "SDK execution error";
    const safeBody = sdkErr.body || sdkErr.response?.body || {};
    const code = sdkErr.code || safeBody.code || "UNKNOWN";

    console.warn("[BREVO DEBUG] Brevo SDK attempt failed");
    console.warn(`[BREVO DEBUG] HTTP status: ${statusCode}`);
    console.warn(`[BREVO DEBUG] Error message: ${safeMsg}`);
    console.warn(`[BREVO DEBUG] Error body: ${JSON.stringify(safeBody)}`);
    console.warn(`[BREVO DEBUG] Error code: ${code}`);
  }

  // Method 2: Direct REST API Fallback (https://api.brevo.com/v3/smtp/email)
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: targetEmail }],
        subject: subject.trim(),
        htmlContent: html,
        textContent: text || html.replace(/<[^>]*>?/gm, ""),
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      const messageId = data.messageId || "brevo-delivered-rest";
      console.log("[BREVO DEBUG] Brevo request succeeded");
      console.log(`[BREVO DEBUG] Message ID received: ${messageId}`);
      return { success: true, messageId, provider: "Brevo-REST" };
    }

    const statusCode = response.status;
    const safeErrorMsg = data.message || data.code || `HTTP ${response.status}`;
    const code = data.code || "REST_ERROR";

    console.error("[BREVO DEBUG] Brevo request FAILED");
    console.error(`[BREVO DEBUG] HTTP status: ${statusCode}`);
    console.error(`[BREVO DEBUG] Error message: ${safeErrorMsg}`);
    console.error(`[BREVO DEBUG] Error body: ${JSON.stringify(data)}`);
    console.error(`[BREVO DEBUG] Error code: ${code}`);

    throw new Error(`Brevo API delivery rejected (Status ${statusCode}): ${safeErrorMsg}`);
  } catch (restErr) {
    const finalMsg = restErr.message || (lastError ? lastError.message : "Brevo API connection failed");
    console.error(`[BREVO DEBUG] Final dispatch error: ${finalMsg}`);
    throw new Error(`Failed to send email via Brevo: ${finalMsg}`);
  }
}

// -------------------------------------------------------------------------------
// OTP EMAIL
// Purpose: sends a 6-digit verification code to the user email address via Brevo.
// Called by: sendOtp controller - for BOTH Sign Up OTP and Sign In OTP requests.
// MUST NOT contain welcome-email content. MUST NOT be swapped with sendWelcomeEmail.
// -------------------------------------------------------------------------------
async function sendOtpEmail(email, otp) {
  console.log("[BREVO DEBUG] OTP email send started");
  const subject = "Verify your getHack account";
  const text =
    "Hi,\n\n" +
    "Your getHack verification code is:\n\n" +
    otp + "\n\n" +
    "This code expires in 10 minutes.\n\n" +
    "If you did not request this code, you can safely ignore this email.\n\n" +
    "- getHack Team";

  const html =
    '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:28px 24px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff">' +
      '<div style="margin-bottom:20px">' +
        '<h1 style="color:#4f46e5;font-size:22px;font-weight:800;margin:0;letter-spacing:-0.5px">getHack</h1>' +
      '</div>' +
      '<h2 style="color:#111827;font-size:18px;font-weight:700;margin-top:0;margin-bottom:12px">Verify your getHack account</h2>' +
      '<p style="color:#4b5563;font-size:14px;line-height:1.5;margin-bottom:20px">Your getHack verification code is:</p>' +
      '<div style="background:#f3f4f6;border-radius:8px;padding:18px;text-align:center;margin-bottom:20px">' +
        '<span style="font-size:32px;font-weight:800;letter-spacing:6px;color:#4f46e5">' + otp + '</span>' +
      '</div>' +
      '<p style="color:#6b7280;font-size:13px;line-height:1.5;margin-bottom:8px">This code expires in 10 minutes.</p>' +
      '<p style="color:#6b7280;font-size:13px;line-height:1.5;margin-bottom:24px">If you did not request this code, you can safely ignore this email.</p>' +
      '<p style="color:#111827;font-size:14px;font-weight:600;margin:0">- getHack Team</p>' +
    '</div>';

  return await module.exports.sendEmail({ to: email, subject, html, text });
}

// -------------------------------------------------------------------------------
// WELCOME EMAIL
// Purpose: welcomes a brand-new user after their account is first created.
// Called by: verifyOtp controller (only inside the new-user branch after User.create)
//            googleAuth / googleCallback (only inside the new-user branch after User.create)
// MUST NOT be called during OTP generation or Sign In.
// -------------------------------------------------------------------------------
async function sendWelcomeEmail(email, name) {
  console.log("[BREVO DEBUG] Welcome email send started");
  const firstName = (name || "").trim().split(" ")[0] || "there";
  const subject = "Welcome to getHack! 🚀";
  const text =
    "Hi " + firstName + ",\n\n" +
    "Welcome to getHack!\n\n" +
    "Your account has been successfully created.\n\n" +
    "With getHack, you can:\n" +
    "- Discover hackathons and opportunities\n" +
    "- Find developers and teammates\n" +
    "- Build your network\n" +
    "- Collaborate with your team\n\n" +
    "We are excited to have you here!\n\n" +
    "Best regards,\n" +
    "The getHack Team";

  const html =
    '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;border:1px solid #e5e7eb;border-radius:16px;background:#ffffff">' +
      '<div style="margin-bottom:24px">' +
        '<h1 style="color:#4f46e5;font-size:24px;font-weight:800;margin:0;letter-spacing:-0.5px">getHack</h1>' +
      '</div>' +
      '<h2 style="color:#111827;font-size:20px;font-weight:700;margin-top:0;margin-bottom:16px">Hi ' + firstName + ',</h2>' +
      '<p style="color:#374151;font-size:14px;line-height:1.6;margin-bottom:16px">Welcome to getHack!</p>' +
      '<p style="color:#374151;font-size:14px;line-height:1.6;margin-bottom:20px">Your account has been successfully created. getHack helps developers discover hackathons, connect with teammates, and collaborate.</p>' +
      '<div style="background:#f9fafb;border-left:4px solid #4f46e5;border-radius:4px;padding:16px;margin-bottom:24px">' +
        '<p style="color:#111827;font-size:14px;font-weight:600;margin-top:0;margin-bottom:8px">With getHack, you can:</p>' +
        '<ul style="color:#4b5563;font-size:13px;line-height:1.6;margin:0;padding-left:20px">' +
          '<li style="margin-bottom:4px">Discover hackathons and opportunities</li>' +
          '<li style="margin-bottom:4px">Find developers and teammates</li>' +
          '<li style="margin-bottom:4px">Build your network</li>' +
          '<li>Collaborate with your team</li>' +
        '</ul>' +
      '</div>' +
      '<p style="color:#374151;font-size:14px;line-height:1.6;margin-bottom:24px">We are excited to have you here!</p>' +
      '<p style="color:#111827;font-size:14px;font-weight:600;margin:0">Best regards,</p>' +
      '<p style="color:#4f46e5;font-size:14px;font-weight:700;margin-top:4px;margin-bottom:0">The getHack Team</p>' +
    '</div>';

  return await module.exports.sendEmail({ to: email, subject, html, text });
}

module.exports = { sendEmail, sendOtpEmail, sendWelcomeEmail };
