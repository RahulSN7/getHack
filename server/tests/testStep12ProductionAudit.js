// ---------------------------------------------------------------------------
// server/tests/testStep12ProductionAudit.js
// Automated Test Suite for Step 12: Security, Performance & Production Audit
// ---------------------------------------------------------------------------

const assert = require("node:assert");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const Notification = require("../models/notification");
const {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
} = require("../controllers/notificationController");

let totalTests = 0;
let passedTests = 0;

async function runTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ PASSED: ${name}`);
  } catch (err) {
    console.error(`  ✗ FAILED: ${name}`);
    console.error(`    ${err.message}`);
  }
}

function mockRes() {
  const res = {};
  res.statusCode = 200;
  res.data = null;
  res.status = function (code) {
    this.statusCode = code;
    return this;
  };
  res.json = function (obj) {
    this.data = obj;
    return this;
  };
  return res;
}

async function runProductionAuditTests() {
  console.log("\n==============================================");
  console.log("Running getHack Step 12 Security & Production Readiness Audit");
  console.log("==============================================\n");

  // 1. Unauthenticated Request Security
  console.log("[Audit 1: Unauthenticated API Access Protection]");

  await runTest("getNotifications rejects unauthenticated request with 401", async () => {
    const res = mockRes();
    await getNotifications({ query: {} }, res);
    assert.strictEqual(res.statusCode, 401);
  });

  await runTest("getUnreadNotificationCount rejects unauthenticated request with 401", async () => {
    const res = mockRes();
    await getUnreadNotificationCount({}, res);
    assert.strictEqual(res.statusCode, 401);
  });

  await runTest("markNotificationAsRead rejects unauthenticated request with 401", async () => {
    const res = mockRes();
    await markNotificationAsRead({ params: { notificationId: "123" } }, res);
    assert.strictEqual(res.statusCode, 401);
  });

  await runTest("markAllNotificationsAsRead rejects unauthenticated request with 401", async () => {
    const res = mockRes();
    await markAllNotificationsAsRead({}, res);
    assert.strictEqual(res.statusCode, 401);
  });

  await runTest("deleteNotification rejects unauthenticated request with 401", async () => {
    const res = mockRes();
    await deleteNotification({ params: { notificationId: "123" } }, res);
    assert.strictEqual(res.statusCode, 401);
  });

  await runTest("clearAllNotifications rejects unauthenticated request with 401", async () => {
    const res = mockRes();
    await clearAllNotifications({}, res);
    assert.strictEqual(res.statusCode, 401);
  });

  // 2. ObjectId Input Safety Validation
  console.log("\n[Audit 2: Invalid ObjectId Input Safety]");

  await runTest("markNotificationAsRead returns 400 Bad Request for malformed ObjectId string", async () => {
    const res = mockRes();
    await markNotificationAsRead({ user: { _id: "507f1f77bcf86cd799439011" }, params: { notificationId: "not-an-object-id" } }, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.message, "Invalid notification ID provided.");
  });

  await runTest("deleteNotification returns 400 Bad Request for malformed ObjectId string", async () => {
    const res = mockRes();
    await deleteNotification({ user: { _id: "507f1f77bcf86cd799439011" }, params: { notificationId: "not-an-object-id" } }, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.message, "Invalid notification ID provided.");
  });

  // 3. MongoDB Indexes Audit
  console.log("\n[Audit 3: MongoDB Indexes & Query Safety]");

  await runTest("Notification schema defines compound performance indexes for queries", () => {
    const indexes = Notification.schema.indexes();
    const hasRecipientCreatedIndex = indexes.some(idx => idx[0].recipient === 1 && idx[0].createdAt === -1);
    const hasRecipientUnreadIndex = indexes.some(idx => idx[0].recipient === 1 && idx[0].isRead === 1 && idx[0].createdAt === -1);

    assert.strictEqual(hasRecipientCreatedIndex, true);
    assert.strictEqual(hasRecipientUnreadIndex, true);
  });

  // 4. Code Base Hardening & Cleanliness
  console.log("\n[Audit 4: Code Cleanliness & CTA Absence]");

  await runTest("Header.jsx contains ZERO hardcoded mock notifications or CTA buttons", () => {
    const headerPath = path.join(__dirname, "../../client/src/components/Header/Header.jsx");
    const headerContent = fs.readFileSync(headerPath, "utf8");
    assert.strictEqual(headerContent.includes("Accepting..."), false);
    assert.strictEqual(headerContent.includes("Declining..."), false);
    assert.strictEqual(headerContent.includes("const notifications = ["), false);
  });

  console.log("\n==============================================");
  console.log(`Step 12 Audit Summary: ${passedTests} / ${totalTests} passed`);
  console.log("==============================================\n");
}

if (require.main === module) {
  runProductionAuditTests().then(() => {
    process.exit(passedTests === totalTests ? 0 : 1);
  });
}
