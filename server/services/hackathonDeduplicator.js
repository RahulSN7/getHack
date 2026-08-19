// ---------------------------------------------------------------------------
// server/services/hackathonDeduplicator.js
// Handles MongoDB duplicate checking and upserting for aggregated hackathons
// ---------------------------------------------------------------------------

const mongoose = require("mongoose");
const Hackathon = require("../models/hackathon");

/**
 * Upsert normalized hackathon into MongoDB
 * @param {Object} normalizedHackathon Normalized hackathon payload
 * @returns {Promise<Object>} { result: 'inserted' | 'updated' | 'skipped', doc: Object }
 */
async function processHackathon(normalizedHackathon) {
  if (mongoose.connection.readyState !== 1) {
    return { result: "skipped", error: "Database not connected" };
  }

  const { platform, externalId } = normalizedHackathon.source;

  try {
    // 1. Primary Identity Check: source.platform + source.externalId
    let existing = await Hackathon.findOne({
      "source.platform": platform,
      "source.externalId": externalId,
    });

    // 2. Secondary Fuzzy Identity Check: title + startDate if externalId match failed
    if (!existing && normalizedHackathon.title) {
      const cleanTitle = normalizedHackathon.title.trim();
      const start = normalizedHackathon.event?.startDate || normalizedHackathon.startDate;
      
      if (start) {
        const startWindowBegin = new Date(start.getTime() - 86400000);
        const startWindowEnd = new Date(start.getTime() + 86400000);

        existing = await Hackathon.findOne({
          title: { $regex: new RegExp(`^${escapeRegExp(cleanTitle)}$`, "i") },
          startDate: { $gte: startWindowBegin, $lte: startWindowEnd },
        });
      }
    }

    if (existing) {
      // Update existing record without clearing user-generated internal data (like organizer ref)
      existing.title = normalizedHackathon.title;
      existing.shortDescription = normalizedHackathon.shortDescription || existing.shortDescription;
      existing.description = normalizedHackathon.description || existing.description;
      existing.organizerName = normalizedHackathon.organizerName || existing.organizerName;
      if (normalizedHackathon.organizer?.logo) {
        existing.organizer.logo = normalizedHackathon.organizer.logo;
      }

      existing.registration = normalizedHackathon.registration;
      existing.registrationOpens = normalizedHackathon.registrationOpens;
      existing.registrationDeadline = normalizedHackathon.registrationDeadline;
      existing.startDate = normalizedHackathon.startDate;
      existing.endDate = normalizedHackathon.endDate;
      existing.event = normalizedHackathon.event;
      existing.format = normalizedHackathon.format;
      existing.location = normalizedHackathon.location;
      existing.registrationUrl = normalizedHackathon.registrationUrl;
      existing.eligibility = normalizedHackathon.eligibility;
      existing.teamSize = normalizedHackathon.teamSize;
      existing.prizePool = normalizedHackathon.prizePool;
      existing.prizes = normalizedHackathon.prizes;

      if (normalizedHackathon.themes?.length > 0) existing.themes = normalizedHackathon.themes;
      if (normalizedHackathon.skills?.length > 0) existing.skills = normalizedHackathon.skills;
      if (normalizedHackathon.image) existing.image = normalizedHackathon.image;

      existing.lastSyncedAt = new Date();

      await existing.save();
      return { result: "updated", doc: existing };
    }

    // 3. Insert New Record
    const newDoc = new Hackathon(normalizedHackathon);
    await newDoc.save();
    return { result: "inserted", doc: newDoc };

  } catch (error) {
    console.error(`[Deduplicator Error] Failed processing ${normalizedHackathon.title}:`, error.message);
    return { result: "skipped", error: error.message };
  }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  processHackathon,
};
