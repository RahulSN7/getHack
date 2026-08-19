// ---------------------------------------------------------------------------
// server/jobs/hackathonSyncJob.js
// Background Job Scheduler for multi-platform hackathon synchronization
// Initial interval: Every 6 hours
// ---------------------------------------------------------------------------

const mongoose = require("mongoose");
const { syncAllHackathons } = require("../services/hackathonSyncService");

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
let jobTimer = null;
let isSyncRunning = false;

/**
 * Trigger sync process safely without concurrent overlapping executions
 */
async function runSyncTask() {
  if (isSyncRunning) {
    console.log("[Hackathon Sync Job] Sync already in progress, skipping duplicate trigger.");
    return;
  }

  // Guard: Ensure database is connected before running queries
  if (mongoose.connection.readyState !== 1) {
    console.warn("[Hackathon Sync Job] Skipped sync: MongoDB connection is not active.");
    return;
  }

  isSyncRunning = true;
  try {
    await syncAllHackathons();
  } catch (error) {
    console.error("[Hackathon Sync Job] Unhandled error during sync:", error.message);
  } finally {
    isSyncRunning = false;
  }
}

/**
 * Start periodic 6-hour sync schedule and execute immediate non-blocking initial sync
 */
function initHackathonSyncJob() {
  if (mongoose.connection.readyState !== 1) {
    console.warn("[Hackathon Sync Job] Skipping sync scheduler initialization: MongoDB is not connected.");
    return;
  }

  console.log("[Hackathon Sync Job] Initializing periodic 6-hour sync scheduler...");

  // Run initial sync after a short 5-second delay to allow server startup
  setTimeout(() => {
    runSyncTask();
  }, 5000);

  // Schedule recurring sync every 6 hours
  jobTimer = setInterval(() => {
    runSyncTask();
  }, SIX_HOURS_MS);
}

function stopHackathonSyncJob() {
  if (jobTimer) {
    clearInterval(jobTimer);
    jobTimer = null;
    console.log("[Hackathon Sync Job] Scheduler stopped.");
  }
}

module.exports = {
  initHackathonSyncJob,
  stopHackathonSyncJob,
  runSyncTask,
};
