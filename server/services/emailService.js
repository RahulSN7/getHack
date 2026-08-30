// ---------------------------------------------------------------------------
// server/services/emailService.js — Gmail SMTP Transactional Email Service
// Configured with Nodemailer & Gmail App Password from environment variables.
// ---------------------------------------------------------------------------

const nodemailer = require("nodemailer");

console.log(`[EMAIL SERVICE] Email service module loaded. Configured User: ${process.env.EMAIL_USER || "(EMAIL_USER not set)"}`);

/**
 * Sends an email using Nodemailer and Gmail SMTP
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML content
 * @param {string} [options.text] - Plain text content fallback
 */
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

  const user = process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : "";
  const rawPass = process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD;
  const pass = rawPass ? rawPass.replace(/\s+/g, "") : "";

  if (!user || (!pass && !rawPass)) {
    throw new Error("Gmail credentials (EMAIL_USER and EMAIL_APP_PASSWORD) are not configured in .env file.");
  }

  const from = process.env.EMAIL_FROM || `getHack <${user}>`;

  const mailOptions = {
    from,
    to: targetEmail,
    subject: subject.trim(),
    html,
    text: text || html.replace(/<[^>]*>?/gm, ""),
  };

  // Configurations to try
  const configs = [
    {
      name: "Gmail SMTP Port 587 (STARTTLS)",
      options: {
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: { user, pass },
      },
    },
    {
      name: "Gmail SMTP Port 465 (SSL/TLS)",
      options: {
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user, pass },
      },
    },
    {
      name: "Nodemailer Gmail Service (Stripped Password)",
      options: {
        service: "gmail",
        auth: { user, pass },
      },
    },
    {
      name: "Nodemailer Gmail Service (Raw Password)",
      options: {
        service: "gmail",
        auth: { user, pass: rawPass },
      },
    },
  ];

  let lastError = null;

  for (const config of configs) {
    try {
      const transporter = nodemailer.createTransport(config.options);
      const info = await transporter.sendMail(mailOptions);
      console.log(`[GMAIL SERVICE SUCCESS] Email sent to ${targetEmail} via ${config.name} | Message ID: ${info.messageId}`);
      return { success: true, messageId: info.messageId, method: config.name };
    } catch (err) {
      lastError = err;
      console.warn(`[GMAIL SERVICE ATTEMPT FAILED] Method '${config.name}' failed:`, err.message);
    }
  }

  // Safe error logging without exposing credentials
  console.error("[GMAIL SERVICE ALL ATTEMPTS FAILED] Last Error:", lastError?.message);
  throw new Error(`Failed to send email via Gmail SMTP: ${lastError?.message || "Invalid credentials or network timeout"}`);
}

/**
 * Helper to send OTP verification emails
 */
async function sendOtpEmail(email, otp) {
  const subject = "Your getHack verification code";
  const text = `Hi,\n\nUse the following verification code to continue with getHack:\n\n${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this code, you can safely ignore this email.\n\n— getHack Team`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #111827; font-size: 20px; font-weight: 700; margin-top: 0;">Hi,</h2>
      <p style="color: #4b5563; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
        Use the following verification code to continue with <strong>getHack</strong>:
      </p>
      <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 20px;">
        <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #4f46e5;">${otp}</span>
      </div>
      <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin-bottom: 12px;">
        This code expires in 10 minutes.
      </p>
      <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin-bottom: 24px;">
        If you did not request this code, you can safely ignore this email.
      </p>
      <p style="color: #111827; font-size: 14px; font-weight: 600; margin: 0;">— getHack Team</p>
    </div>
  `;
  return await sendEmail({ to: email, subject, html, text });
}

module.exports = {
  sendEmail,
  sendOtpEmail,
};
