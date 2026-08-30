// ---------------------------------------------------------------------------
// server/controllers/authController.js — Email OTP Authentication Controller
// Handles OTP generation, email dispatching, OTP verification, getMe, and logout.
// ---------------------------------------------------------------------------

const dns = require("dns").promises;
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/user");
const Otp = require("../models/otp");
const { sendOtpEmail } = require("../services/emailService");
const { upsertStreamUser } = require("../services/streamService");

// Configure public DNS resolvers for consistent MX domain resolution
try {
  dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
} catch (dnsErr) {
  console.warn("Unable to set custom DNS servers:", dnsErr.message);
}

const JWT_SECRET = process.env.JWT_SECRET || "gethack_super_secret_jwt_key_2026";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// Generate JWT token for user
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "7d" });
};

/**
 * Robust Email Format Validator
 * Enforces strict structure: local-part@domain.tld
 * Rejects consecutive dots, missing TLD, empty local/domain, multiple @ symbols.
 */
function isValidEmailFormat(emailStr) {
  if (!emailStr || typeof emailStr !== "string") return false;
  const trimmed = emailStr.trim().toLowerCase();

  // Basic length constraints
  if (trimmed.length < 6 || trimmed.length > 254) return false;

  // Disallow consecutive dots
  if (trimmed.includes("..")) return false;

  // Must contain exactly one @ symbol
  const parts = trimmed.split("@");
  if (parts.length !== 2) return false;

  const [local, domain] = parts;

  // Check local part
  if (!local || local.startsWith(".") || local.endsWith(".")) return false;
  const localRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
  if (!localRegex.test(local)) return false;

  // Check domain part
  if (!domain || domain.startsWith(".") || domain.endsWith(".")) return false;
  if (!domain.includes(".")) return false;

  const domainParts = domain.split(".");
  if (domainParts.some((label) => !label || label.length === 0 || label.startsWith("-") || label.endsWith("-"))) {
    return false;
  }

  // TLD must be at least 2 alpha characters long (e.g. com, org, in)
  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) return false;

  return true;
}

/**
 * Backend Email Domain DNS Validator
 * Resolves MX / A records for the domain to verify mail delivery capabilities.
 * Filters out parked domains, squatter hosts, and unresolvable domains generically.
 */
async function validateEmailDomain(domainName) {
  if (!domainName || typeof domainName !== "string") return false;
  const d = domainName.trim().toLowerCase();

  if (!d || d.length < 4 || !d.includes(".")) return false;

  try {
    // 3.5s timeout wrapper for MX lookup
    const mxPromise = dns.resolveMx(d);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("DNS_TIMEOUT")), 3500)
    );

    const mxRecords = await Promise.race([mxPromise, timeoutPromise]);

    if (Array.isArray(mxRecords) && mxRecords.length > 0) {
      // Filter out empty, Null MX (RFC 7505), loopback, or invalid exchange hosts
      const validExchanges = mxRecords
        .map((m) => (m && m.exchange ? m.exchange.toLowerCase().trim() : ""))
        .filter((ex) => ex && ex !== "." && ex !== "0.0.0.0" && ex !== "localhost");

      if (validExchanges.length === 0) {
        return false;
      }

      // Detect known domain parking / squatter MX hosts that do not deliver email
      const isParked = validExchanges.some(
        (ex) =>
          ex.includes("yaxmail") ||
          ex.includes("parkingcrew") ||
          ex.includes("sedoparking") ||
          ex.includes("bodis") ||
          ex.includes("hugedomains") ||
          ex.includes("above.com")
      );

      if (isParked) {
        return false;
      }

      return true;
    }
  } catch (err) {
    if (err.message === "DNS_TIMEOUT") {
      // Fail-open on timeout to avoid blocking legitimate users during network slowdowns
      return true;
    }

    // Fallback: Check A or AAAA records if MX lookup was empty or failed
    try {
      const aPromise = dns.resolve4(d);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("DNS_TIMEOUT")), 2000)
      );
      const aRecords = await Promise.race([aPromise, timeoutPromise]);
      if (Array.isArray(aRecords) && aRecords.length > 0) {
        return true;
      }
    } catch {
      return false; // Domain has neither MX nor A DNS records
    }
  }

  return false;
}

// ── 1. SEND OTP ──
const sendOtp = async (req, res) => {
  try {
    const { email } = req.body || {};

    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ message: "Please enter your email address." });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Format Validation
    if (!isValidEmailFormat(normalizedEmail)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    // 2. Domain DNS/MX Validation
    const domain = normalizedEmail.split("@")[1];
    const isDomainValid = await validateEmailDomain(domain);
    if (!isDomainValid) {
      return res.status(400).json({
        message: "We couldn't verify this email address. Please check your email and try again.",
      });
    }

    // Database Connection Guard
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        message: "Database connection is establishing. Please try again in a few seconds.",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });

    // Rate Limiting Cooldown Check (30 seconds between resends)
    const existingOtp = await Otp.findOne({ email: normalizedEmail });
    if (existingOtp && existingOtp.lastSentAt) {
      const elapsedSeconds = (Date.now() - new Date(existingOtp.lastSentAt).getTime()) / 1000;
      if (elapsedSeconds < 30) {
        const waitTime = Math.ceil(30 - elapsedSeconds);
        return res.status(429).json({
          message: `Please wait ${waitTime} seconds before requesting another code.`,
          cooldownSeconds: waitTime,
        });
      }
    }

    // Generate secure 6-digit numeric OTP
    const rawOtp = crypto.randomInt(100000, 999999).toString();

    // Hash OTP before database storage
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(rawOtp, salt);

    // Set 10-minute expiry time
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Save/Update OTP record in database
    await Otp.findOneAndUpdate(
      { email: normalizedEmail },
      {
        email: normalizedEmail,
        otpHash,
        expiresAt,
        attempts: 0,
        lastSentAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // Dispatch OTP email
    try {
      await sendOtpEmail(normalizedEmail, rawOtp);
    } catch (emailErr) {
      console.error("sendOtpEmail failure:", emailErr.message);
      return res.status(400).json({
        message: "We couldn't send a verification code to this email. Please check the email address and try again.",
      });
    }

    return res.status(200).json({
      message: "Verification code sent to your email.",
      email: normalizedEmail,
      isExistingUser: !!existingUser,
    });
  } catch (error) {
    console.error("sendOtp error:", error);
    return res.status(500).json({
      message: "We couldn't send a verification code to this email. Please check the email address and try again.",
    });
  }
};

// ── 2. VERIFY OTP ──
const verifyOtp = async (req, res) => {
  try {
    const { email, otp, name, role } = req.body || {};

    if (!email || !otp) {
      return res.status(400).json({ message: "Please provide both email and verification code." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanOtp = String(otp).trim();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({ message: "Verification code must be 6 digits." });
    }

    // Retrieve active OTP record
    const otpDoc = await Otp.findOne({ email: normalizedEmail });

    if (!otpDoc || otpDoc.expiresAt < new Date()) {
      if (otpDoc) {
        await Otp.deleteOne({ email: normalizedEmail });
      }
      return res.status(400).json({
        message: "This verification code has expired. Please request a new code.",
      });
    }

    // Check maximum allowed attempts (5 limit)
    if (otpDoc.attempts >= 5) {
      await Otp.deleteOne({ email: normalizedEmail });
      return res.status(400).json({
        message: "Too many attempts. Please request a new verification code.",
      });
    }

    // Compare OTP hash
    const isMatch = await bcrypt.compare(cleanOtp, otpDoc.otpHash);

    if (!isMatch) {
      otpDoc.attempts += 1;
      await otpDoc.save();

      if (otpDoc.attempts >= 5) {
        await Otp.deleteOne({ email: normalizedEmail });
        return res.status(400).json({
          message: "Too many attempts. Please request a new verification code.",
        });
      }

      return res.status(400).json({
        message: "Incorrect verification code. Please try again.",
      });
    }

    // OTP Verification Successful -> Invalidate & Delete OTP record
    await Otp.deleteOne({ email: normalizedEmail });

    // Find or create user
    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      // Update email verification status for existing user
      if (!user.emailVerified) {
        user.emailVerified = true;
        await user.save();
      }
    } else {
      // Normalize role string for new user signup
      const normalizedRole = typeof role === "string" ? role.toLowerCase().trim() : "participant";
      const validRole = normalizedRole === "organizer" ? "organizer" : "participant";

      const userName = name && typeof name === "string" && name.trim() ? name.trim() : "Developer";

      user = await User.create({
        name: userName,
        email: normalizedEmail,
        role: validRole,
        emailVerified: true,
        profile: {},
      });
    }

    // Generate JWT token & set session cookie
    const token = generateToken(user._id);
    res.cookie("token", token, COOKIE_OPTIONS);

    // Synchronize authenticated user with Stream Chat server-side
    upsertStreamUser(user).catch((e) =>
      console.warn("Background Stream Chat sync warning:", e.message)
    );

    return res.status(200).json({
      message: "Authenticated successfully",
      user: user.toSafeUser(),
      token,
    });
  } catch (error) {
    console.error("verifyOtp error:", error);
    if (error.code === 11000) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }
    return res.status(500).json({ message: "An unexpected error occurred during OTP verification." });
  }
};

// ── 3. GET CURRENT USER (ME) ──
const getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthenticated." });
    }

    return res.status(200).json({
      user: req.user.toSafeUser(),
    });
  } catch (error) {
    console.error("GetMe controller error:", error);
    return res.status(500).json({ message: "Server error fetching user profile." });
  }
};

// ── 4. LOGOUT ──
const logout = async (req, res) => {
  try {
    res.clearCookie("token", COOKIE_OPTIONS);
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout controller error:", error);
    return res.status(500).json({ message: "Server error during logout." });
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  getMe,
  logout,
};
