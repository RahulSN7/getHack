
// server/controllers/authController.js — Email OTP Authentication Controller
// Handles OTP generation, email dispatching, OTP verification, getMe, and logout.


const dns = require("dns").promises;
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/user");
const Otp = require("../models/otp");
const { sendOtpEmail, sendWelcomeEmail } = require("../services/emailService");
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

// Sends one-time Welcome Email on new account creation.
// Guarded by user.welcomeEmailSent flag to prevent duplicates.
const triggerWelcomeEmail = async (user) => {
  if (!user || !user.email) return;

  const userEmail = user.email.toLowerCase().trim();
  const maskedEmail = userEmail.replace(/(?<=^.{2}).*(?=@)/, "***");

  if (user.welcomeEmailSent) {
    console.log(`[AUTH] Welcome email already sent for ${maskedEmail} — skipping.`);
    return;
  }

  console.log(`[AUTH] Sending welcome email to ${maskedEmail}`);

  try {
    const result = await sendWelcomeEmail(userEmail, user.name);
    if (result && result.success) {
      console.log(`[AUTH] Welcome email sent successfully to ${maskedEmail} | Message ID: ${result.messageId}`);
      user.welcomeEmailSent = true;
      user.markModified("welcomeEmailSent");
      await user.save();
    } else {
      console.warn(`[AUTH] Welcome email returned unsuccessful status for ${maskedEmail}`);
    }
  } catch (err) {
    // Log but do not throw — welcome email failure must not block authentication
    console.error(`[AUTH] Welcome email failed for ${maskedEmail}: ${err.message || "Unknown error"}`);
  }
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

    // Determine if this is a signup request (has role, isSignup flag, intent, or purpose)
    const { isSignup, intent, purpose, role } = req.body || {};
    const isSignupRequest = Boolean(isSignup || intent === "signup" || purpose === "signup" || role);

    if (isSignupRequest) {
      console.log("[OTP TRACE] SIGNUP OTP endpoint reached");
    } else {
      console.log("[OTP TRACE] SIGNIN OTP endpoint reached");
    }

    console.log(`[AUTH] OTP requested — flow: ${isSignupRequest ? "signup" : "login"}, email domain: ${normalizedEmail.split("@")[1] || "unknown"}`);

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

    // 3. Existing-user check — enforce signup/login intent
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser && isSignupRequest) {
      return res.status(409).json({
        message: "An account with this email already exists. Please Sign In instead.",
        isExistingUser: true,
      });
    }

    if (!existingUser && !isSignupRequest) {
      return res.status(404).json({
        message: "No account found with this email. Please Sign Up first.",
        isExistingUser: false,
      });
    }

    // 4. Server-Side Rate Limiting Checks (60s minimum cooldown, max 5 requests per hour)
    const existingOtp = await Otp.findOne({ email: normalizedEmail });
    let newRequestCount = 1;
    let newWindowStartedAt = new Date();

    if (existingOtp) {
      // 4a. Cooldown check: minimum 60 seconds between requests for the same email
      if (existingOtp.lastSentAt) {
        const elapsedSeconds = (Date.now() - new Date(existingOtp.lastSentAt).getTime()) / 1000;
        if (elapsedSeconds < 60) {
          const waitTime = Math.ceil(60 - elapsedSeconds);
          return res.status(429).json({
            message: `Please wait ${waitTime} seconds before requesting another code.`,
            cooldownSeconds: waitTime,
          });
        }
      }

      // 4b. Hourly window check: maximum 5 requests per email within 1 hour
      const windowAgeMs = Date.now() - new Date(existingOtp.windowStartedAt || existingOtp.createdAt || Date.now()).getTime();
      const ONE_HOUR_MS = 60 * 60 * 1000;

      if (windowAgeMs > ONE_HOUR_MS) {
        // Reset hourly counter
        newRequestCount = 1;
        newWindowStartedAt = new Date();
      } else {
        if ((existingOtp.requestCount || 1) >= 5) {
          return res.status(429).json({
            message: "Maximum OTP request limit reached for this hour. Please try again later.",
          });
        }
        newRequestCount = (existingOtp.requestCount || 1) + 1;
        newWindowStartedAt = existingOtp.windowStartedAt || new Date();
      }
    }

    // 5. Generate secure 6-digit numeric OTP
    const rawOtp = crypto.randomInt(100000, 999999).toString();
    console.log("[OTP TRACE] OTP generated");

    // 6. Hash OTP before database storage (invalidates any prior active code)
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(rawOtp, salt);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.findOneAndUpdate(
      { email: normalizedEmail },
      {
        email: normalizedEmail,
        otpHash,
        expiresAt,
        attempts: 0,
        lastSentAt: new Date(),
        requestCount: newRequestCount,
        windowStartedAt: newWindowStartedAt,
      },
      { upsert: true, new: true }
    );
    console.log("[OTP TRACE] OTP stored");

    // 7. Dispatch OTP email — this is the ONLY email sent during OTP request
    console.log("[OTP TRACE] About to send OTP email");
    try {
      await sendOtpEmail(normalizedEmail, rawOtp);
      console.log("[AUTH] OTP email sent successfully");
    } catch (emailErr) {
      console.error("[AUTH] OTP email failed:", emailErr.message);
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
    console.error("[AUTH] sendOtp error:", error);
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

    if (!isValidEmailFormat(normalizedEmail)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    const isSignupRequest = Boolean(
      req.body?.isSignup ||
      req.body?.intent === "signup" ||
      req.body?.purpose === "signup" ||
      req.body?.role
    );

    // Re-confirm existing user state at verify time
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser && isSignupRequest) {
      return res.status(409).json({
        message: "An account with this email already exists. Please Sign In instead.",
        isExistingUser: true,
      });
    }

    if (!existingUser && !isSignupRequest) {
      return res.status(404).json({
        message: "No account found with this email. Please Sign Up first.",
        isExistingUser: false,
      });
    }

    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({ message: "Verification code must be 6 digits." });
    }

    // Retrieve active OTP record
    const otpDoc = await Otp.findOne({ email: normalizedEmail });

    if (!otpDoc || otpDoc.expiresAt < new Date()) {
      if (otpDoc) await Otp.deleteOne({ email: normalizedEmail });
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

    // Compare OTP hash (allow 123456 dev bypass in non-production)
    const isMatch =
      (process.env.NODE_ENV !== "production" && cleanOtp === "123456") ||
      (await bcrypt.compare(cleanOtp, otpDoc.otpHash));

    if (!isMatch) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      if (otpDoc.attempts >= 5) {
        await Otp.deleteOne({ email: normalizedEmail });
        return res.status(400).json({ message: "Too many attempts. Please request a new verification code." });
      }
      return res.status(400).json({ message: "Incorrect verification code. Please try again." });
    }

    // OTP is valid — delete it
    await Otp.deleteOne({ email: normalizedEmail });
    console.log(`[AUTH] OTP verified for ${isSignupRequest ? "signup" : "login"} flow`);

    // Find or create user
    let user = existingUser || (await User.findOne({ email: normalizedEmail }));

    if (user) {
      // Existing user logging in — just update emailVerified if needed, no welcome email
      if (!user.emailVerified) {
        user.emailVerified = true;
        await user.save();
      }
      console.log(`[AUTH] Existing user authenticated via OTP`);
    } else {
      // New user — create account then send welcome email
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

      console.log(`[AUTH] New user created via OTP signup`);
      // Welcome email is sent ONLY here — after new account creation
      await triggerWelcomeEmail(user);
    }

    // Generate JWT token & set session cookie
    const token = generateToken(user._id);
    res.cookie("token", token, COOKIE_OPTIONS);

    // Synchronize authenticated user with Stream Chat server-side
    upsertStreamUser(user).catch((e) =>
      console.warn("[AUTH] Background Stream Chat sync warning:", e.message)
    );

    return res.status(200).json({
      message: "Authenticated successfully",
      user: user.toSafeUser(),
      token,
    });
  } catch (error) {
    console.error("[AUTH] verifyOtp error:", error);
    if (error.code === 11000) {
      return res.status(409).json({ message: "An account with this email already exists. Please Sign In instead." });
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

const { OAuth2Client } = require("google-auth-library");

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/auth/google/callback";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const oauth2Client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL);

// ── 5. GOOGLE AUTHENTICATION (POST /api/auth/google) ──
const googleAuth = async (req, res) => {
  try {
    const { credential, code, role } = req.body || {};

    if (!credential && !code) {
      return res.status(400).json({ message: "Google authentication token or authorization code is required." });
    }

    let payload = null;

    if (credential) {
      if (!process.env.GOOGLE_CLIENT_ID) {
        return res.status(400).json({
          message: "Google OAuth is not configured on the backend. Please add GOOGLE_CLIENT_ID to server/.env",
        });
      }

      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } else if (code) {
      const { tokens } = await oauth2Client.getToken(code);
      const ticket = await oauth2Client.verifyIdToken({
        idToken: tokens.id_token,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    }

    if (!payload || !payload.email) {
      return res.status(400).json({ message: "Failed to verify Google account credentials." });
    }

    const email = payload.email.toLowerCase().trim();
    const googleId = payload.sub;
    const name = payload.name || "Google User";
    const picture = payload.picture || "";

    // Find existing user by googleId or email
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (user) {
      // Existing Google user — update fields if needed, no welcome email
      let modified = false;
      if (!user.googleId) { user.googleId = googleId; modified = true; }
      if (!user.emailVerified) { user.emailVerified = true; modified = true; }
      if (picture && (!user.profile || !user.profile.avatar)) {
        user.profile = { ...(user.profile || {}), avatar: picture };
        user.markModified("profile");
        modified = true;
      }
      if (modified) await user.save();
      console.log(`[AUTH] Existing user authenticated via Google OAuth`);
    } else {
      // New user via Google — create account then send welcome email
      const normalizedRole = typeof role === "string" ? role.toLowerCase().trim() : "participant";
      const validRole = normalizedRole === "organizer" ? "organizer" : "participant";

      user = await User.create({
        name,
        email,
        googleId,
        role: validRole,
        emailVerified: true,
        profile: {
          avatar: picture,
          role: validRole === "organizer" ? "Organizer" : "Participant",
        },
      });

      console.log(`[AUTH] New user created via Google OAuth`);
      // Welcome email is sent ONLY here — after new account creation
      await triggerWelcomeEmail(user);
    }

    // Generate JWT token & set session cookie
    const token = generateToken(user._id);
    res.cookie("token", token, COOKIE_OPTIONS);

    // Synchronize authenticated user with Stream Chat server-side
    upsertStreamUser(user).catch((e) =>
      console.warn("Background Stream Chat sync warning:", e.message)
    );

    return res.status(200).json({
      message: "Authenticated successfully with Google",
      user: user.toSafeUser(),
      token,
    });
  } catch (error) {
    console.error("googleAuth error:", error);
    return res.status(500).json({
      message: error.message || "Failed to complete Google authentication.",
    });
  }
};

// ── 6. GOOGLE OAUTH REDIRECT (GET /api/auth/google) ──
const googleRedirect = (req, res) => {
  if (!GOOGLE_CLIENT_ID) {
    return res.redirect(`${CLIENT_URL}/login?error=Google OAuth is not configured in backend .env`);
  }

  const role = req.query.role || "participant";
  const state = Buffer.from(JSON.stringify({ role })).toString("base64");

  const authorizeUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["openid", "email", "profile"],
    prompt: "select_account",
    state,
  });

  return res.redirect(authorizeUrl);
};

// ── 7. GOOGLE OAUTH CALLBACK (GET /api/auth/google/callback) ──
const googleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.redirect(`${CLIENT_URL}/login?error=Google authentication was cancelled.`);
    }

    let signupRole = "participant";
    if (state) {
      try {
        const decoded = JSON.parse(Buffer.from(state, "base64").toString());
        if (decoded && decoded.role) {
          signupRole = decoded.role.toLowerCase() === "organizer" ? "organizer" : "participant";
        }
      } catch (stateErr) {
        console.warn("OAuth state decode warning:", stateErr.message);
      }
    }

    const { tokens } = await oauth2Client.getToken(code);
    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      return res.redirect(`${CLIENT_URL}/login?error=Failed to verify Google account details.`);
    }

    const email = payload.email.toLowerCase().trim();
    const googleId = payload.sub;
    const name = payload.name || "Google User";
    const picture = payload.picture || "";

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (user) {
      // Existing user via Google callback — no welcome email
      let modified = false;
      if (!user.googleId) { user.googleId = googleId; modified = true; }
      if (!user.emailVerified) { user.emailVerified = true; modified = true; }
      if (picture && (!user.profile || !user.profile.avatar)) {
        user.profile = { ...(user.profile || {}), avatar: picture };
        user.markModified("profile");
        modified = true;
      }
      if (modified) await user.save();
      console.log(`[AUTH] Existing user authenticated via Google OAuth callback`);
    } else {
      // New user via Google callback — create account then send welcome email
      user = await User.create({
        name,
        email,
        googleId,
        role: signupRole,
        emailVerified: true,
        profile: {
          avatar: picture,
          role: signupRole === "organizer" ? "Organizer" : "Participant",
        },
      });

      console.log(`[AUTH] New user created via Google OAuth callback`);
      // Welcome email is sent ONLY here — after new account creation
      await triggerWelcomeEmail(user);
    }

    const token = generateToken(user._id);
    res.cookie("token", token, COOKIE_OPTIONS);

    upsertStreamUser(user).catch((e) =>
      console.warn("Background Stream Chat sync warning:", e.message)
    );

    return res.redirect(`${CLIENT_URL}/`);
  } catch (error) {
    console.error("googleCallback error:", error);
    return res.redirect(`${CLIENT_URL}/login?error=Google authentication failed.`);
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  getMe,
  logout,
  googleAuth,
  googleRedirect,
  googleCallback,
};
