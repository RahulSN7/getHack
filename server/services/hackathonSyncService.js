// ---------------------------------------------------------------------------
// server/services/hackathonSyncService.js
// Orchestrates multi-platform hackathon synchronization
// ---------------------------------------------------------------------------

const devpostAdapter = require("../adapters/devpostAdapter");
const devfolioAdapter = require("../adapters/devfolioAdapter");
const mlhAdapter = require("../adapters/mlhAdapter");
const unstopAdapter = require("../adapters/unstopAdapter");
const doraHacksAdapter = require("../adapters/doraHacksAdapter");
const kaggleAdapter = require("../adapters/kaggleAdapter");
const hack2SkillAdapter = require("../adapters/hack2SkillAdapter");

const normalizer = require("./hackathonNormalizer");
const validator = require("./hackathonValidator");
const deduplicator = require("./hackathonDeduplicator");

const ADAPTERS = [
  devpostAdapter,
  devfolioAdapter,
  mlhAdapter,
  unstopAdapter,
  doraHacksAdapter,
  kaggleAdapter,
  hack2SkillAdapter,
];

/**
 * Execute full multi-platform synchronization
 * @returns {Promise<Object>} Detailed summary report
 */
async function syncAllHackathons() {
  console.log(`\n==============================================`);
  console.log(`[Hackathon Sync] Started at ${new Date().toISOString()}`);
  console.log(`==============================================\n`);

  const summary = {
    timestamp: new Date().toISOString(),
    platforms: {},
    totalFetched: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
  };

  // Run all platform adapters concurrently
  const adapterPromises = ADAPTERS.map(async (adapter) => {
    const platformName = adapter.platform;
    summary.platforms[platformName] = {
      status: "pending",
      fetched: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      error: null,
    };

    try {
      const items = await adapter.fetchHackathons();
      const count = items.length;
      summary.platforms[platformName].status = "success";
      summary.platforms[platformName].fetched = count;
      summary.totalFetched += count;
      console.log(`[${platformName.padEnd(12)}] SUCCESS — ${count} fetched`);

      // Process fetched items
      for (const item of items) {
        const normalized = normalizer.normalize(item);
        const valResult = validator.validate(normalized);

        if (!valResult.isValid) {
          summary.platforms[platformName].skipped++;
          summary.skipped++;
          continue;
        }

        const dedupResult = await deduplicator.processHackathon(normalized);

        if (dedupResult.result === "inserted") {
          summary.platforms[platformName].inserted++;
          summary.inserted++;
        } else if (dedupResult.result === "updated") {
          summary.platforms[platformName].updated++;
          summary.updated++;
        } else {
          summary.platforms[platformName].skipped++;
          summary.skipped++;
        }
      }
    } catch (error) {
      summary.platforms[platformName].status = "failure";
      summary.platforms[platformName].error = error.message;
      console.error(`[${platformName.padEnd(12)}] ERROR   — ${error.message}`);
    }
  });

  await Promise.allSettled(adapterPromises);

  console.log(`\n----------------------------------------------`);
  console.log(`Total fetched: ${summary.totalFetched}`);
  console.log(`Inserted:      ${summary.inserted}`);
  console.log(`Updated:       ${summary.updated}`);
  console.log(`Skipped:       ${summary.skipped}`);
  console.log(`[Hackathon Sync] Completed at ${new Date().toISOString()}`);
  console.log(`==============================================\n`);

  return summary;
}

module.exports = {
  syncAllHackathons,
};
