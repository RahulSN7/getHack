// ---------------------------------------------------------------------------
// scratch/testDateSeparator.js
// Verification of Date Separator Grouping Logic & Formatters
// ---------------------------------------------------------------------------

function formatDateSeparator(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const msgDate = new Date(d);
  msgDate.setHours(0, 0, 0, 0);

  if (msgDate.getTime() === today.getTime()) {
    return "Today";
  }
  if (msgDate.getTime() === yesterday.getTime()) {
    return "Yesterday";
  }

  const currentYear = today.getFullYear();
  const msgYear = msgDate.getFullYear();

  if (msgYear === currentYear) {
    return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  }
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

function groupMessages(messages) {
  const grouped = [];
  let lastDateKey = "";
  messages.forEach((msg) => {
    if (!msg.created_at) {
      grouped.push({ type: "message", data: msg });
      return;
    }

    const d = new Date(msg.created_at);
    if (isNaN(d.getTime())) {
      grouped.push({ type: "message", data: msg });
      return;
    }

    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    if (dateKey !== lastDateKey) {
      grouped.push({ type: "separator", date: msg.created_at, label: formatDateSeparator(msg.created_at), dateKey });
      lastDateKey = dateKey;
    }
    grouped.push({ type: "message", data: msg });
  });

  return grouped;
}

// ---------------------------------------------------------------------------
// Test Scenarios
// ---------------------------------------------------------------------------
console.log("Running Date Separator Unit Tests...\n");

const now = new Date();
const todayMorning = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
const todayNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);

const yesterday = new Date(now);
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayEvening = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 21, 0, 0);

const threeDaysAgo = new Date(now);
threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

// Test 1: Messages yesterday evening (21:00) and today morning (09:00)
console.log("--- TEST 1: Yesterday Evening + Today Morning ---");
const test1Messages = [
  { text: "msg yesterday evening", created_at: yesterdayEvening.toISOString() },
  { text: "msg today morning", created_at: todayMorning.toISOString() },
  { text: "msg today noon", created_at: todayNoon.toISOString() },
];

const res1 = groupMessages(test1Messages);
const separators1 = res1.filter((item) => item.type === "separator");

console.log("Separators rendered:", separators1.map((s) => ({ label: s.label, dateKey: s.dateKey })));

if (separators1.length !== 2) throw new Error(`Expected 2 separators, got ${separators1.length}`);
if (separators1[0].label !== "Yesterday") throw new Error(`Expected 'Yesterday', got ${separators1[0].label}`);
if (separators1[1].label !== "Today") throw new Error(`Expected 'Today', got ${separators1[1].label}`);

console.log("✅ Test 1 PASSED: Exactly 1 'Yesterday' and 1 'Today' separator produced.");

// Test 2: Multiple messages today
console.log("\n--- TEST 2: Multiple Messages Today ---");
const test2Messages = [
  { text: "msg 1 today", created_at: todayMorning.toISOString() },
  { text: "msg 2 today", created_at: todayNoon.toISOString() },
  { text: "msg 3 today", created_at: now.toISOString() },
];

const res2 = groupMessages(test2Messages);
const separators2 = res2.filter((item) => item.type === "separator");
const todaySeparators = separators2.filter((s) => s.label === "Today");

console.log("Separators rendered:", separators2.map((s) => s.label));

if (todaySeparators.length !== 1) throw new Error(`Expected 1 'Today' separator, got ${todaySeparators.length}`);

console.log("✅ Test 2 PASSED: Exactly 1 'Today' separator produced for multiple messages today.");

// Test 3: Messages across 3 dates
console.log("\n--- TEST 3: Messages Across 3 Dates ---");
const test3Messages = [
  { text: "old msg", created_at: threeDaysAgo.toISOString() },
  { text: "yesterday msg", created_at: yesterdayEvening.toISOString() },
  { text: "today msg", created_at: todayMorning.toISOString() },
];

const res3 = groupMessages(test3Messages);
const separators3 = res3.filter((item) => item.type === "separator");

console.log("Separators rendered:", separators3.map((s) => s.label));

if (separators3.length !== 3) throw new Error(`Expected 3 separators, got ${separators3.length}`);

const labels = separators3.map((s) => s.label);
const uniqueLabels = new Set(labels);
if (uniqueLabels.size !== labels.length) throw new Error(`Duplicate labels found in: ${labels.join(", ")}`);

console.log("✅ Test 3 PASSED: Exactly one unique separator per calendar date produced.");

console.log("\n🎉 ALL DATE SEPARATOR TESTS PASSED SUCCESSFULLY!");
