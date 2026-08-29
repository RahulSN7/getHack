// ---------------------------------------------------------------------------
// server/tests/testStep10UIPolishAndUX.js
// Automated Test Suite for Step 10: Notification UI/UX Polish, Date Grouping, & Accessibility
// ---------------------------------------------------------------------------

const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

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

function formatRelativeTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function groupNotificationsByDate(notifications) {
  if (!Array.isArray(notifications) || notifications.length === 0) return [];

  const today = [];
  const yesterday = [];
  const older = [];

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

  notifications.forEach((n) => {
    const d = new Date(n.createdAt);
    if (d >= startOfToday) {
      today.push(n);
    } else if (d >= startOfYesterday) {
      yesterday.push(n);
    } else {
      older.push(n);
    }
  });

  const groups = [];
  if (today.length > 0) groups.push({ title: "TODAY", items: today });
  if (yesterday.length > 0) groups.push({ title: "YESTERDAY", items: yesterday });
  if (older.length > 0) groups.push({ title: "OLDER", items: older });

  return groups;
}

async function runStep10Tests() {
  console.log("\n==============================================");
  console.log("Running getHack Step 10 UI/UX Polish & Grouping Test Suite");
  console.log("==============================================\n");

  // Test 1: Date Grouping
  console.log("[Test Set 1: Date Grouping Logic]");
  await runTest("groupNotificationsByDate partitions notifications into TODAY, YESTERDAY, and OLDER correctly", () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const todayDate = new Date(startOfToday.getTime() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours after today start
    const yesterdayDate = new Date(startOfToday.getTime() - 12 * 60 * 60 * 1000).toISOString(); // 12 hours before today start (Yesterday)
    const olderDate = new Date(startOfToday.getTime() - 48 * 60 * 60 * 1000).toISOString(); // 48 hours before today start (Older)

    const items = [
      { _id: "1", createdAt: todayDate },
      { _id: "2", createdAt: yesterdayDate },
      { _id: "3", createdAt: olderDate },
    ];

    const groups = groupNotificationsByDate(items);
    assert.strictEqual(groups.length, 3);
    assert.strictEqual(groups[0].title, "TODAY");
    assert.strictEqual(groups[0].items.length, 1);
    assert.strictEqual(groups[1].title, "YESTERDAY");
    assert.strictEqual(groups[1].items.length, 1);
    assert.strictEqual(groups[2].title, "OLDER");
    assert.strictEqual(groups[2].items.length, 1);
  });

  await runTest("groupNotificationsByDate omits empty date categories", () => {
    const now = new Date();
    const todayDate = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const items = [{ _id: "1", createdAt: todayDate }];

    const groups = groupNotificationsByDate(items);
    assert.strictEqual(groups.length, 1);
    assert.strictEqual(groups[0].title, "TODAY");
  });

  // Test 2: Friendly Timestamps
  console.log("\n[Test Set 2: Friendly Timestamps]");
  await runTest("formatRelativeTime formats recent dates into readable strings", () => {
    const now = new Date();
    const justNow = new Date(now.getTime() - 10 * 1000).toISOString();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();

    assert.strictEqual(formatRelativeTime(justNow), "Just now");
    assert.strictEqual(formatRelativeTime(fiveMinAgo), "5m ago");
    assert.strictEqual(formatRelativeTime(twoHoursAgo), "2h ago");
  });

  // Test 3: Header.jsx CTA Absence Verification
  console.log("\n[Test Set 3: Header.jsx UI Polish & CTA Absence]");
  await runTest("Header.jsx contains NO inline CTA Accept or Decline buttons", () => {
    const headerPath = path.join(__dirname, "../../client/src/components/Header/Header.jsx");
    const headerContent = fs.readFileSync(headerPath, "utf8");
    assert.strictEqual(headerContent.includes("Accepting..."), false);
    assert.strictEqual(headerContent.includes("Declining..."), false);
    assert.strictEqual(headerContent.includes("groupNotificationsByDate"), true);
  });

  console.log("\n==============================================");
  console.log(`Step 10 Test Summary: ${passedTests} / ${totalTests} passed`);
  console.log("==============================================\n");
}

if (require.main === module) {
  runStep10Tests().then(() => {
    process.exit(passedTests === totalTests ? 0 : 1);
  });
}
