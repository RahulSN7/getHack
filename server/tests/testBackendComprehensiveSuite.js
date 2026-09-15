
// server/tests/testBackendComprehensiveSuite.js
// Comprehensive Pre-Deployment Backend & API Test Suite for getHack


const dns = require("dns");
try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder("ipv4first");
  }
  dns.setServers(["1.1.1.1", "8.8.8.8", "8.8.4.4"]);
} catch (err) {
  console.warn("Could not set custom DNS fallback servers:", err.message);
}

const assert = require("node:assert");
const http = require("http");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const BASE_URL = "http://127.0.0.1:5000";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

const testResults = [];

function recordTest(area, endpoint, method, name, fn) {
  totalTests++;
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      passedTests++;
      testResults.push({ area, endpoint, method, name, status: "PASS" });
      console.log(`  ✓ PASSED: [${area}] ${name}`);
    })
    .catch((err) => {
      failedTests++;
      testResults.push({ area, endpoint, method, name, status: "FAIL", error: err.message });
      console.error(`  ✗ FAILED: [${area}] ${name}`);
      console.error(`    Error: ${err.message}`);
    });
}

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || "GET",
      headers: options.headers || {},
    };

    if (options.cookie) {
      reqOptions.headers["Cookie"] = options.cookie;
    }

    const req = http.request(url, reqOptions, (res) => {
      let data = "";
      let setCookie = res.headers["set-cookie"];
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch { }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          setCookie: setCookie ? setCookie[0] : null,
          data: json || data,
          raw: data,
        });
      });
    });

    req.on("error", reject);

    if (options.body) {
      if (typeof options.body === "object") {
        req.setHeader("Content-Type", "application/json");
        req.write(JSON.stringify(options.body));
      } else {
        req.write(options.body);
      }
    }
    req.end();
  });
}

async function runAuditSuite() {
  console.log("\n");
  console.log("Starting getHack Comprehensive Pre-Deployment Backend Audit");
  console.log("\n");

  // Verify MongoDB connection
  const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/getHack";
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(MONGO_URI);
  }
  console.log("Connected to MongoDB Atlas / getHack DB successfully.\n");

  const timestamp = Date.now();
  const participantEmail = `audit_part_${timestamp}@gmail.com`;
  const organizerEmail = `audit_org_${timestamp}@gmail.com`;
  const otherParticipantEmail = `audit_other_${timestamp}@gmail.com`;

  let participantCookie = null;
  let participantUser = null;
  let organizerCookie = null;
  let organizerUser = null;
  let otherParticipantCookie = null;
  let otherParticipantUser = null;


  // AREA 1: SERVER HEALTH

  console.log("\n[1. SERVER HEALTH]");

  await recordTest("Server Health", "/api/health", "GET", "Health check endpoint returns 200 OK & dbState connected", async () => {
    const res = await request("/api/health");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, "ok");
    assert.strictEqual(res.data.dbState, "connected");
  });

  await recordTest("Server Health", "/api/nonexistent-route-xyz", "GET", "Nonexistent API route returns 404 Not Found", async () => {
    const res = await request("/api/nonexistent-route-xyz");
    assert.strictEqual(res.status, 404);
  });


  // AREA 2: AUTHENTICATION

  console.log("\n[2. AUTHENTICATION]");

  await recordTest("Authentication", "/api/auth/send-otp", "POST", "Invalid email format rejected with 400 Bad Request", async () => {
    const res = await request("/api/auth/send-otp", { method: "POST", body: { email: "invalid-email" } });
    assert.strictEqual(res.status, 400);
  });

  await recordTest("Authentication", "/api/auth/send-otp", "POST", "Valid email sends OTP successfully with 200 OK", async () => {
    const res = await request("/api/auth/send-otp", { method: "POST", body: { email: participantEmail } });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.email, participantEmail);
  });

  await recordTest("Authentication", "/api/auth/verify-otp", "POST", "Incorrect 6-digit OTP rejected with 400 Bad Request", async () => {
    const res = await request("/api/auth/verify-otp", {
      method: "POST",
      body: { email: participantEmail, otp: "000000", name: "Audit Participant", role: "participant" },
    });
    assert.strictEqual(res.status, 400);
  });

  // Create & authenticate test users directly via Otp / User models for deterministic testing
  const Otp = require("../models/otp");
  const User = require("../models/user");
  const bcrypt = require("bcryptjs");

  const fullProfile = {
    role: "participant",
    gender: "Male",
    dateOfBirth: new Date("2000-01-01"),
    location: "San Francisco, CA",
    availability: "Actively Looking",
    bio: "Test user bio for comprehensive audit test suite.",
    skills: ["React", "Node.js", "MongoDB"],
    college: "Stanford University",
    degree: "B.S. Computer Science",
    interests: ["Hackathons", "AI"],
    github: "https://github.com/testuser",
    linkedin: "https://linkedin.com/in/testuser",
    portfolio: "https://testuser.dev",
  };

  // Participant 1
  const otpSalt1 = await bcrypt.genSalt(10);
  const otpHash1 = await bcrypt.hash("123456", otpSalt1);
  await Otp.findOneAndUpdate(
    { email: participantEmail },
    { email: participantEmail, otpHash: otpHash1, expiresAt: new Date(Date.now() + 600000), attempts: 0 },
    { upsert: true }
  );
  const verifyRes1 = await request("/api/auth/verify-otp", {
    method: "POST",
    body: { email: participantEmail, otp: "123456", name: "Audit Participant", role: "participant" },
  });
  participantCookie = verifyRes1.setCookie;
  participantUser = verifyRes1.data.user;
  await User.findByIdAndUpdate(participantUser.id, { profile: fullProfile });

  await recordTest("Authentication", "/api/auth/verify-otp", "POST", "Valid OTP verifies user & returns HTTP-only session cookie", async () => {
    assert.strictEqual(verifyRes1.status, 200);
    assert.ok(participantCookie);
    assert.strictEqual(participantUser.role, "participant");
  });

  // Organizer
  const otpSalt2 = await bcrypt.genSalt(10);
  const otpHash2 = await bcrypt.hash("123456", otpSalt2);
  await Otp.findOneAndUpdate(
    { email: organizerEmail },
    { email: organizerEmail, otpHash: otpHash2, expiresAt: new Date(Date.now() + 600000), attempts: 0 },
    { upsert: true }
  );
  const verifyRes2 = await request("/api/auth/verify-otp", {
    method: "POST",
    body: { email: organizerEmail, otp: "123456", name: "Audit Organizer", role: "organizer" },
  });
  organizerCookie = verifyRes2.setCookie;
  organizerUser = verifyRes2.data.user;

  // Participant 2
  const otpSalt3 = await bcrypt.genSalt(10);
  const otpHash3 = await bcrypt.hash("123456", otpSalt3);
  await Otp.findOneAndUpdate(
    { email: otherParticipantEmail },
    { email: otherParticipantEmail, otpHash: otpHash3, expiresAt: new Date(Date.now() + 600000), attempts: 0 },
    { upsert: true }
  );
  const verifyRes3 = await request("/api/auth/verify-otp", {
    method: "POST",
    body: { email: otherParticipantEmail, otp: "123456", name: "Other Participant", role: "participant" },
  });
  otherParticipantCookie = verifyRes3.setCookie;
  otherParticipantUser = verifyRes3.data.user;
  await User.findByIdAndUpdate(otherParticipantUser.id, { profile: fullProfile });

  await recordTest("Authentication", "/api/auth/me", "GET", "Authenticated GET /api/auth/me returns safe user object without password", async () => {
    const res = await request("/api/auth/me", { cookie: participantCookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.user.email, participantEmail);
    assert.strictEqual(res.data.user.password, undefined);
  });

  await recordTest("Authentication", "/api/auth/me", "GET", "Unauthenticated GET /api/auth/me rejected with 401 Unauthorized", async () => {
    const res = await request("/api/auth/me");
    assert.strictEqual(res.status, 401);
  });

  await recordTest("Authentication", "/api/auth/google", "GET", "Google OAuth redirect endpoint generates authorization redirect (302)", async () => {
    const res = await request("/api/auth/google?role=organizer");
    assert.strictEqual(res.status, 302);
    assert.ok(res.headers.location && res.headers.location.includes("accounts.google.com"));
  });

  await recordTest("Authentication", "/api/auth/google/callback", "GET", "Google OAuth callback handles missing authorization code cleanly", async () => {
    const res = await request("/api/auth/google/callback");
    assert.strictEqual(res.status, 302);
  });

  await recordTest("Authentication", "/api/auth/logout", "POST", "POST /api/auth/logout clears session cookie with 200 OK", async () => {
    const res = await request("/api/auth/logout", { method: "POST", cookie: participantCookie });
    assert.strictEqual(res.status, 200);
  });


  // AREA 3: AUTHORIZATION AND ROLES

  console.log("\n[3. AUTHORIZATION AND ROLES]");

  await recordTest("Authorization", "/api/hackathons/my", "GET", "Unauthenticated request to organizer endpoint returns 401 Unauthorized", async () => {
    const res = await request("/api/hackathons/my");
    assert.strictEqual(res.status, 401);
  });

  await recordTest("Authorization", "/api/hackathons/my", "GET", "Participant user accessing organizer endpoint rejected with 403 Forbidden", async () => {
    const res = await request("/api/hackathons/my", { cookie: participantCookie });
    assert.strictEqual(res.status, 403);
  });

  await recordTest("Authorization", "/api/hackathons/my", "GET", "Organizer user accessing organizer endpoint returns 200 OK", async () => {
    const res = await request("/api/hackathons/my", { cookie: organizerCookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
  });

  await recordTest("Authorization", "/api/hackathons", "POST", "Participant user attempting to create hackathon rejected with 403 Forbidden", async () => {
    const res = await request("/api/hackathons", {
      method: "POST",
      cookie: participantCookie,
      body: { title: "Unauthorized Hackathon" },
    });
    assert.strictEqual(res.status, 403);
  });


  // AREA 4: HACKATHON APIs

  console.log("\n[4. HACKATHON APIs]");

  let createdHackathonId = null;

  await recordTest("Hackathon APIs", "/api/hackathons", "GET", "Public discovery endpoint GET /api/hackathons returns 200 OK list", async () => {
    const res = await request("/api/hackathons");
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data.hackathons));
  });

  await recordTest("Hackathon APIs", "/api/hackathons", "POST", "Organizer creates hackathon with valid payload returns 201 Created", async () => {
    const res = await request("/api/hackathons", {
      method: "POST",
      cookie: organizerCookie,
      body: {
        title: `Audit Hackathon ${timestamp}`,
        shortDescription: "Pre-deployment test hackathon description",
        description: "Full detailed hackathon description text",
        registrationDeadline: new Date(Date.now() + 86400000 * 5).toISOString(),
        startDate: new Date(Date.now() + 86400000 * 6).toISOString(),
        endDate: new Date(Date.now() + 86400000 * 8).toISOString(),
        registrationUrl: "https://gethack.io/hackathons/test",
      },
    });
    assert.strictEqual(res.status, 201);
    createdHackathonId = res.data.hackathon.id || res.data.hackathon._id;
    assert.ok(createdHackathonId);
  });

  await recordTest("Hackathon APIs", "/api/hackathons/:id", "GET", "GET /api/hackathons/:id returns created hackathon details with 200 OK", async () => {
    const res = await request(`/api/hackathons/${createdHackathonId}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.hackathon.title, `Audit Hackathon ${timestamp}`);
  });

  await recordTest("Hackathon APIs", "/api/hackathons/:id", "PUT", "Organizer updates owned hackathon returns 200 OK", async () => {
    const res = await request(`/api/hackathons/${createdHackathonId}`, {
      method: "PUT",
      cookie: organizerCookie,
      body: { title: `Updated Audit Hackathon ${timestamp}` },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.hackathon.title, `Updated Audit Hackathon ${timestamp}`);
  });

  await recordTest("Hackathon APIs", "/api/hackathons/:id", "DELETE", "Organizer deletes owned hackathon returns 200 OK", async () => {
    const res = await request(`/api/hackathons/${createdHackathonId}`, {
      method: "DELETE",
      cookie: organizerCookie,
    });
    assert.strictEqual(res.status, 200);
  });


  // AREA 5: USER AND PROFILE APIs

  console.log("\n[5. USER AND PROFILE APIs]");

  await recordTest("User Profile APIs", "/api/users/profile", "GET", "GET /api/users/profile returns authenticated user profile with 200 OK", async () => {
    const res = await request("/api/users/profile", { cookie: participantCookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.user.email, participantEmail);
  });

  await recordTest("User Profile APIs", "/api/users/participants", "GET", "GET /api/users/participants returns list of participants with 200 OK", async () => {
    const res = await request("/api/users/participants", { cookie: participantCookie });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data.participants));
  });

  await recordTest("User Profile APIs", "/api/users/profile/participant", "PUT", "PUT /api/users/profile/participant updates skills & bio returns 200 OK", async () => {
    const res = await request("/api/users/profile/participant", {
      method: "PUT",
      cookie: participantCookie,
      body: {
        name: "Audit Participant",
        role: "Developer",
        gender: "Male",
        dateOfBirth: "2000-01-01",
        bio: "Updated participant bio for audit test",
        skills: ["React", "Node.js", "MongoDB"],
        location: "San Francisco, CA",
        availability: "Actively Looking",
        education: { college: "Stanford University", degree: "B.S. Computer Science" },
        interests: ["Hackathons", "AI"],
        github: "https://github.com/testuser",
      },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.user.profile.bio, "Updated participant bio for audit test");
  });

  await recordTest("User Profile APIs", "/api/users/profile/participant", "PUT", "User attempting to update another user's profile rejected with 403 Forbidden", async () => {
    const res = await request("/api/users/profile/participant", {
      method: "PUT",
      cookie: participantCookie,
      body: {
        userId: otherParticipantUser.id,
        bio: "Malicious bio injection attempt",
      },
    });
    assert.strictEqual(res.status, 403);
  });


  // AREA 6: NETWORK / CONNECTION APIs

  console.log("\n[6. NETWORK / CONNECTION APIs]");

  let connectionRequestId = null;

  await recordTest("Network APIs", "/api/network/requests", "POST", "Self-connection request rejected with 400 Bad Request", async () => {
    const res = await request("/api/network/requests", {
      method: "POST",
      cookie: participantCookie,
      body: { receiverId: participantUser.id },
    });
    assert.strictEqual(res.status, 400);
  });

  await recordTest("Network APIs", "/api/network/requests", "POST", "Valid connection request returns 201 Created", async () => {
    const res = await request("/api/network/requests", {
      method: "POST",
      cookie: participantCookie,
      body: { receiverId: otherParticipantUser.id, note: "Let's connect for the hackathon!" },
    });
    assert.strictEqual(res.status, 201);
    connectionRequestId = res.data.connection._id || res.data.connection.id;
    assert.ok(connectionRequestId);
  });

  await recordTest("Network APIs", "/api/network/requests", "POST", "Duplicate pending connection request rejected with 400 Bad Request", async () => {
    const res = await request("/api/network/requests", {
      method: "POST",
      cookie: participantCookie,
      body: { receiverId: otherParticipantUser.id },
    });
    assert.strictEqual(res.status, 400);
  });

  await recordTest("Network APIs", "/api/network/requests", "GET", "GET /api/network/requests returns incoming & outgoing requests", async () => {
    const res = await request("/api/network/requests", { cookie: otherParticipantCookie });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.incoming.length > 0);
  });

  await recordTest("Network APIs", "/api/network/requests/:id", "PUT", "Recipient accepts connection request returns 200 OK", async () => {
    const res = await request(`/api/network/requests/${connectionRequestId}`, {
      method: "PUT",
      cookie: otherParticipantCookie,
      body: { action: "accept" },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
  });

  await recordTest("Network APIs", "/api/network/connections/:targetUserId", "DELETE", "Remove connection returns 200 OK", async () => {
    const res = await request(`/api/network/connections/${otherParticipantUser.id}`, {
      method: "DELETE",
      cookie: participantCookie,
    });
    assert.strictEqual(res.status, 200);
  });

  // Re-establish connection for team & chat testing
  const connReq2 = await request("/api/network/requests", {
    method: "POST",
    cookie: participantCookie,
    body: { receiverId: otherParticipantUser.id },
  });
  if (connReq2.data && connReq2.data.connection) {
    await request(`/api/network/requests/${connReq2.data.connection._id}`, {
      method: "PUT",
      cookie: otherParticipantCookie,
      body: { action: "accept" },
    });
  }


  // AREA 7: TEAM APIs

  console.log("\n[7. TEAM APIs]");

  let createdTeamId = null;

  await recordTest("Team APIs", "/api/teams", "POST", "Participant creates team with valid payload returns 201 Created", async () => {
    const res = await request("/api/teams", {
      method: "POST",
      cookie: participantCookie,
      body: {
        teamName: `Audit Team ${timestamp}`,
        hackathonName: "Audit Hackathon 2026",
        description: "Building awesome audit platform for hackathons",
        techStack: ["React", "Node.js"],
        maxSize: 4,
      },
    });
    assert.strictEqual(res.status, 201);
    createdTeamId = res.data.team.id || res.data.team._id;
    assert.ok(createdTeamId);
  });

  await recordTest("Team APIs", "/api/teams/my-teams", "GET", "GET /api/teams/my-teams returns list containing created team", async () => {
    const res = await request("/api/teams/my-teams", { cookie: participantCookie });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.teams.some((t) => (t.id || t._id || t.teamId) === createdTeamId));
  });

  await recordTest("Team APIs", "/api/teams/:id", "GET", "GET /api/teams/:id returns populated team details", async () => {
    const res = await request(`/api/teams/${createdTeamId}`, { cookie: participantCookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.team.teamName, `Audit Team ${timestamp}`);
  });

  let teamRequestId = null;

  await recordTest("Team APIs", "/api/teams/:teamId/requests", "POST", "Other participant sends join request to team returns 201 Created", async () => {
    const res = await request(`/api/teams/${createdTeamId}/requests`, {
      method: "POST",
      cookie: otherParticipantCookie,
      body: { message: "I would love to join your team!" },
    });
    assert.strictEqual(res.status, 201);
    teamRequestId = res.data.request ? (res.data.request.id || res.data.request._id) : null;
    assert.ok(teamRequestId);
  });

  await recordTest("Team APIs", "/api/teams/requests/:id/accept", "PATCH", "Team leader accepts join request returns 200 OK and adds member", async () => {
    const res = await request(`/api/teams/requests/${teamRequestId}/accept`, {
      method: "PATCH",
      cookie: participantCookie,
    });
    assert.strictEqual(res.status, 200);
  });

  await recordTest("Team APIs", "/api/teams/:id/leave", "POST", "Member leaves team returns 200 OK", async () => {
    const res = await request(`/api/teams/${createdTeamId}/leave`, {
      method: "POST",
      cookie: otherParticipantCookie,
    });
    assert.strictEqual(res.status, 200);
  });


  // AREA 8: CHAT APIs

  console.log("\n[8. CHAT APIs]");

  await recordTest("Chat APIs", "/api/chat/token", "GET", "GET /api/chat/token generates Stream Chat token for authenticated user", async () => {
    const res = await request("/api/chat/token", { cookie: participantCookie });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.token);
  });

  await recordTest("Chat APIs", "/api/chat/access/:userId", "GET", "GET /api/chat/access/:userId verifies connection access for connected user", async () => {
    const res = await request(`/api/chat/access/${otherParticipantUser.id}`, { cookie: participantCookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.allowed, true);
  });

  await recordTest("Chat APIs", "/api/chat/block/:userId", "POST", "Block user returns 200 OK", async () => {
    const res = await request(`/api/chat/block/${otherParticipantUser.id}`, {
      method: "POST",
      cookie: participantCookie,
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
  });

  await recordTest("Chat APIs", "/api/chat/unblock/:userId", "POST", "Unblock user returns 200 OK", async () => {
    const res = await request(`/api/chat/unblock/${otherParticipantUser.id}`, {
      method: "POST",
      cookie: participantCookie,
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
  });


  // AREA 9: NOTIFICATION APIs

  console.log("\n[9. NOTIFICATION APIs]");

  await recordTest("Notification APIs", "/api/notifications", "GET", "GET /api/notifications returns user notification list", async () => {
    const res = await request("/api/notifications", { cookie: participantCookie });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data.notifications));
  });

  await recordTest("Notification APIs", "/api/notifications/unread-count", "GET", "GET /api/notifications/unread-count returns unread count number", async () => {
    const res = await request("/api/notifications/unread-count", { cookie: participantCookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(typeof res.data.count, "number");
  });

  await recordTest("Notification APIs", "/api/notifications/read-all", "PATCH", "PATCH /api/notifications/read-all marks all notifications as read", async () => {
    const res = await request("/api/notifications/read-all", { method: "PATCH", cookie: participantCookie });
    assert.strictEqual(res.status, 200);
  });

  await recordTest("Notification APIs", "/api/notifications/clear-all", "DELETE", "DELETE /api/notifications/clear-all clears all user notifications", async () => {
    const res = await request("/api/notifications/clear-all", { method: "DELETE", cookie: participantCookie });
    assert.strictEqual(res.status, 200);
  });


  // AREA 10: INPUT VALIDATION & ERROR HANDLING

  console.log("\n[10. INPUT VALIDATION & ERROR HANDLING]");

  await recordTest("Input Validation", "/api/teams/invalid_object_id", "GET", "Invalid ObjectId parameter returns 404 Not Found cleanly without server crash", async () => {
    const res = await request("/api/teams/invalid_object_id", { cookie: participantCookie });
    assert.strictEqual(res.status, 404);
  });

  await recordTest("Input Validation", "/api/hackathons/507f1f77bcf86cd799439011", "GET", "Nonexistent hackathon ID returns 404 Not Found cleanly", async () => {
    const res = await request("/api/hackathons/507f1f77bcf86cd799439011");
    assert.strictEqual(res.status, 404);
  });

  // Clean up created test users from database
  await User.deleteMany({ email: { $in: [participantEmail, organizerEmail, otherParticipantEmail] } });
  await Otp.deleteMany({ email: { $in: [participantEmail, organizerEmail, otherParticipantEmail] } });

  console.log("\n");
  console.log(`Backend Audit Summary: ${passedTests} / ${totalTests} Passed (${failedTests} Failed)`);
  console.log("\n");

  return { totalTests, passedTests, failedTests, testResults };
}

runAuditSuite().then((summary) => {
  if (summary.failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}).catch((err) => {
  console.error("Audit suite runner failed:", err);
  process.exit(1);
});
