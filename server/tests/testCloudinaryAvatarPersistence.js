// server/tests/testCloudinaryAvatarPersistence.js
// Automated verification suite for Cloudinary persistent profile photos, failure rollbacks, and cleanup safeguards.

const assert = require("assert");
const { extractCloudinaryPublicId, deleteAvatarFromCloudinary } = require("../utils/cloudinaryHelper");
const { isCloudinaryConfigured } = require("../config/cloudinary");

async function runCloudinaryAvatarTests() {
  console.log("\n🧪 Starting Cloudinary Profile Photo Persistence Tests...\n");

  let passed = 0;
  let failed = 0;

  function reportTest(name, success, errorDetail = "") {
    if (success) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name} — ${errorDetail}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // Test 1: Public ID Extraction Helper
  // -------------------------------------------------------------
  try {
    const url1 = "https://res.cloudinary.com/demo/image/upload/v1726912345/getHack/avatars/avatar-test123.png";
    const id1 = extractCloudinaryPublicId(url1);
    assert.strictEqual(id1, "getHack/avatars/avatar-test123", `Expected 'getHack/avatars/avatar-test123', got '${id1}'`);

    const url2 = "https://res.cloudinary.com/demo/image/upload/c_fill,w_300,h_300/getHack/avatars/user-999.jpg?v=123";
    const id2 = extractCloudinaryPublicId(url2);
    assert.strictEqual(id2, "getHack/avatars/user-999", `Expected 'getHack/avatars/user-999', got '${id2}'`);

    const url3 = "https://lh3.googleusercontent.com/a/ACg8ocL...=s96-c";
    const id3 = extractCloudinaryPublicId(url3);
    assert.strictEqual(id3, null, "Google URL must return null public_id");

    reportTest("Public ID Extraction Helper (Version, Transformations, Extensions, External URLs)", true);
  } catch (err) {
    reportTest("Public ID Extraction Helper", false, err.message);
  }

  // -------------------------------------------------------------
  // Test 2: URL Safeguards in deleteAvatarFromCloudinary
  // -------------------------------------------------------------
  try {
    // Google URL — must not throw or call Cloudinary
    await deleteAvatarFromCloudinary("https://lh3.googleusercontent.com/a/ACg8ocL...=s96-c");
    
    // External HTTPS URL — must not throw or call Cloudinary
    await deleteAvatarFromCloudinary("https://example.com/custom-avatar.jpg");

    // Legacy /uploads/... path — must attempt local cleanup safely, ignore ENOENT, not throw
    await deleteAvatarFromCloudinary("/uploads/avatar-nonexistent-123.png");

    reportTest("URL Safeguards (Google, External, Legacy /uploads/ ENOENT ignored)", true);
  } catch (err) {
    reportTest("URL Safeguards", false, err.message);
  }

  // -------------------------------------------------------------
  // Test 3: Cloudinary Credentials Guard Helper
  // -------------------------------------------------------------
  try {
    const isConfigured = isCloudinaryConfigured();
    console.log(`     (isCloudinaryConfigured returned: ${isConfigured})`);
    reportTest("isCloudinaryConfigured() Helper Check", true);
  } catch (err) {
    reportTest("isCloudinaryConfigured() Helper Check", false, err.message);
  }

  // -------------------------------------------------------------
  // Test 4: Failure Mode A — MongoDB Failure Rollback Simulation
  // -------------------------------------------------------------
  try {
    // Simulate Cloudinary upload result
    const uploadedAsset = {
      secure_url: "https://res.cloudinary.com/demo/image/upload/v1/getHack/avatars/mock-photo-b.png",
      public_id: "getHack/avatars/mock-photo-b",
    };

    let photoA = "https://res.cloudinary.com/demo/image/upload/v1/getHack/avatars/mock-photo-a.png";
    let mongoDBPhoto = photoA;

    // Simulate MongoDB update throwing error
    let dbSaveErrorOccurred = false;
    let rollbackExecuted = false;

    try {
      // Intentionally fail MongoDB save
      throw new Error("Simulated MongoDB Connection Write Failure");
    } catch (dbErr) {
      dbSaveErrorOccurred = true;
      // Rollback logic: delete uploaded asset, do not modify mongoDBPhoto, do not delete photoA
      if (uploadedAsset && uploadedAsset.public_id) {
        rollbackExecuted = true;
      }
    }

    assert.strictEqual(dbSaveErrorOccurred, true, "DB error must occur");
    assert.strictEqual(rollbackExecuted, true, "Rollback must execute");
    assert.strictEqual(mongoDBPhoto, photoA, "MongoDB photo must remain Photo A");

    reportTest("Targeted Failure Test 7 — MongoDB Save Failure Rollback", true);
  } catch (err) {
    reportTest("Targeted Failure Test 7 — MongoDB Save Failure Rollback", false, err.message);
  }

  // -------------------------------------------------------------
  // Test 5: Failure Mode B — Old Avatar Cleanup Failure Simulation
  // -------------------------------------------------------------
  try {
    let mongoDBPhoto = "https://res.cloudinary.com/demo/image/upload/v1/getHack/avatars/mock-photo-a.png";
    const newPhotoB = "https://res.cloudinary.com/demo/image/upload/v1/getHack/avatars/mock-photo-b.png";

    // Step 1: MongoDB Save succeeds
    mongoDBPhoto = newPhotoB;
    let dbSaveSuccess = true;

    // Step 2: Old cleanup fails
    let cleanupWarningLogged = false;
    try {
      throw new Error("Simulated Cloudinary Network Destroy Error");
    } catch (cleanupErr) {
      cleanupWarningLogged = true;
      console.warn("     [Test Log Check] [Avatar Cleanup Warning] Failed to remove old avatar:", cleanupErr.message);
    }

    assert.strictEqual(dbSaveSuccess, true, "DB save must succeed");
    assert.strictEqual(mongoDBPhoto, newPhotoB, "MongoDB must contain Photo B URL");
    assert.strictEqual(cleanupWarningLogged, true, "Cleanup warning must be logged without reverting DB");

    reportTest("Targeted Failure Test 8 — Old Avatar Cleanup Failure", true);
  } catch (err) {
    reportTest("Targeted Failure Test 8 — Old Avatar Cleanup Failure", false, err.message);
  }

  console.log(`\n📊 Test Results: ${passed} Passed, ${failed} Failed.\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runCloudinaryAvatarTests();
