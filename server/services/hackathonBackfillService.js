// ---------------------------------------------------------------------------
// server/services/hackathonBackfillService.js
// Safe index synchronization and backfill migration utility for hackathon TTL expiration.
// Computes expiresAt (registrationDeadline + 24h) and ensures MongoDB TTL index is active.
// ---------------------------------------------------------------------------

const Hackathon = require("../models/hackathon");

/**
 * Ensures MongoDB TTL index exists on expiresAt and backfills expiresAt for database hackathons.
 */
async function backfillHackathonExpiration() {
  try {
    // -----------------------------------------------------------------------
    // 1. Verify & Sync MongoDB TTL Index
    // -----------------------------------------------------------------------
    try {
      const existingIndexes = await Hackathon.collection.indexes();
      const expiresAtIndex = existingIndexes.find(
        (idx) => idx.name === "expiresAt_1" || (idx.key && idx.key.expiresAt)
      );

      if (expiresAtIndex && expiresAtIndex.expireAfterSeconds === undefined) {
        console.log("[MongoDB TTL Index] Found non-TTL expiresAt index. Dropping old index to build TTL index...");
        await Hackathon.collection.dropIndex(expiresAtIndex.name);
      }

      await Hackathon.createIndexes();

      const updatedIndexes = await Hackathon.collection.indexes();
      const ttlIndex = updatedIndexes.find((idx) => idx.key && idx.key.expiresAt);

      if (ttlIndex && ttlIndex.expireAfterSeconds === 0) {
        console.log("[MongoDB TTL Index] SUCCESS — Verified active TTL index on 'expiresAt' with expireAfterSeconds: 0.");
      } else {
        console.warn("[MongoDB TTL Index] WARNING — Index found but expireAfterSeconds option may differ:", ttlIndex);
      }
    } catch (indexErr) {
      console.warn("[MongoDB TTL Index Notice] Index sync note:", indexErr.message);
    }

    // -----------------------------------------------------------------------
    // 2. Backfill / Recalculate expiresAt for database records
    // -----------------------------------------------------------------------
    const allHackathons = await Hackathon.find({});
    let updatedCount = 0;
    let expiredCount = 0;
    const now = new Date();

    for (const hackathon of allHackathons) {
      const deadline = hackathon.registrationDeadline || hackathon.registration?.deadline;
      if (deadline && !isNaN(new Date(deadline).getTime())) {
        const expectedExpiresAt = new Date(new Date(deadline).getTime() + 24 * 60 * 60 * 1000);

        if (!hackathon.expiresAt || Math.abs(new Date(hackathon.expiresAt).getTime() - expectedExpiresAt.getTime()) > 1000) {
          hackathon.expiresAt = expectedExpiresAt;
          await hackathon.save();
          updatedCount++;
        }

        if (expectedExpiresAt <= now) {
          expiredCount++;
        }
      }
    }

    console.log(`[Backfill] Processed ${allHackathons.length} hackathons. Updated expiresAt for ${updatedCount} records. Total expired records eligible for TTL purge: ${expiredCount}.`);
  } catch (error) {
    console.error("[Backfill Error] Failed to backfill hackathon expiration dates:", error.message);
  }
}

module.exports = {
  backfillHackathonExpiration,
};
