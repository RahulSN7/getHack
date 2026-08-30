// ---------------------------------------------------------------------------
// server/models/hackathon.js — Mongoose Hackathon Model for getHack
// Supports both user-created hackathons and aggregated platform hackathons.
// ---------------------------------------------------------------------------

const mongoose = require("mongoose");

const hackathonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Hackathon title is required"],
      trim: true,
    },

    slug: {
      type: String,
      trim: true,
      index: true,
    },

    shortDescription: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    // Organizer details (supports both internal User ref & external text/logo)
    organizerName: {
      type: String,
      trim: true,
      default: "Organizer",
    },

    organizer: {
      name: { type: String, default: "" },
      logo: { type: String, default: "" },
      website: { type: String, default: "" },
      ref: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true,
      },
    },

    // Originating Platform Information
    source: {
      platform: {
        type: String,
        enum: ["mlh", "devpost", "devfolio", "dorahacks", "unstop", "kaggle", "hack2skill", "gethack"],
        default: "gethack",
        index: true,
      },
      externalId: {
        type: String,
        default: "",
        index: true,
      },
      externalUrl: {
        type: String,
        default: "",
      },
    },

    // Registration information
    registration: {
      url: { type: String, default: "" },
      startDate: { type: Date },
      deadline: { type: Date },
    },

    // Legacy date fields kept at top-level for backward compatibility
    registrationOpens: { type: Date },
    registrationDeadline: { type: Date },
    startDate: { type: Date },
    endDate: { type: Date },

    // Event Information
    event: {
      startDate: { type: Date },
      endDate: { type: Date },
      mode: {
        type: String,
        enum: ["Online", "Offline", "Hybrid"],
        default: "Online",
      },
      timezone: { type: String, default: "UTC" },
      venue: { type: String, default: "" },
      address: { type: String, default: "" },
      latitude: { type: Number },
      longitude: { type: Number },
    },

    // Legacy format field
    format: {
      type: String,
      enum: ["Online", "Offline", "Hybrid"],
      default: "Online",
    },

    // Location object (legacy & extended)
    location: {
      venue: { type: String, default: "" },
      city: { type: String, default: "" },
      country: { type: String, default: "" },
      address: { type: String, default: "" },
    },

    registrationUrl: {
      type: String,
      trim: true,
      default: "",
    },

    eligibility: {
      type: String,
      default: "Open to all",
    },

    teamSize: {
      min: { type: Number, default: 1 },
      max: { type: Number, default: 4 },
    },

    // Legacy team size fields
    minTeamSize: { type: Number, default: 1 },
    maxTeamSize: { type: Number, default: 4 },

    registrationFee: {
      amount: { type: Number, default: 0 },
      currency: { type: String, default: "USD" },
    },

    fee: { type: String, default: "Free" },

    prizePool: {
      amount: { type: Number, default: 0 },
      currency: { type: String, default: "USD" },
      description: { type: String, default: "" },
    },

    prizes: { type: String, default: "" },

    themes: {
      type: [String],
      default: [],
    },

    skills: {
      type: [String],
      default: [],
    },

    requirements: {
      type: [String],
      default: [],
    },

    submission: {
      deadline: { type: Date },
      platform: { type: String, default: "" },
      url: { type: String, default: "" },
    },

    judging: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    sponsors: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    image: {
      type: String,
      default: "",
    },

    participants: {
      type: Number,
      default: 0,
    },

    rules: {
      type: String,
      default: "",
    },

    contact: {
      type: String,
      default: "",
    },

    hostedOn: {
      type: String,
      trim: true,
      default: "",
    },

    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },

    // Expiration date for 24-hour automatic retention & MongoDB TTL deletion
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast deduplication lookup by platform + external ID
hackathonSchema.index({ "source.platform": 1, "source.externalId": 1 });
hackathonSchema.index({ title: 1, startDate: 1 });

// MongoDB TTL Index: automatically delete document 24 hours after registration deadline
hackathonSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Helper pre-save hook to ensure legacy and nested fields stay in sync
hackathonSchema.pre("save", function () {
  if (this.isModified("registrationDeadline") || !this.registration?.deadline) {
    if (this.registrationDeadline) {
      if (!this.registration) this.registration = {};
      this.registration.deadline = this.registrationDeadline;
    }
  } else if (this.registration?.deadline) {
    this.registrationDeadline = this.registration.deadline;
  }

  if (this.isModified("registrationOpens") || !this.registration?.startDate) {
    if (this.registrationOpens) {
      if (!this.registration) this.registration = {};
      this.registration.startDate = this.registrationOpens;
    }
  } else if (this.registration?.startDate) {
    this.registrationOpens = this.registration.startDate;
  }

  if (this.isModified("startDate") || !this.event?.startDate) {
    if (this.startDate) {
      if (!this.event) this.event = {};
      this.event.startDate = this.startDate;
    }
  } else if (this.event?.startDate) {
    this.startDate = this.event.startDate;
  }

  if (this.isModified("endDate") || !this.event?.endDate) {
    if (this.endDate) {
      if (!this.event) this.event = {};
      this.event.endDate = this.endDate;
    }
  } else if (this.event?.endDate) {
    this.endDate = this.event.endDate;
  }

  if (this.isModified("format") || !this.event?.mode) {
    if (this.format) {
      if (!this.event) this.event = {};
      this.event.mode = this.format;
    }
  } else if (this.event?.mode) {
    this.format = this.event.mode;
  }

  if (this.isModified("registrationUrl") || !this.registration?.url) {
    if (this.registrationUrl) {
      if (!this.registration) this.registration = {};
      this.registration.url = this.registrationUrl;
    }
  } else if (this.registration?.url) {
    this.registrationUrl = this.registration.url;
  }

  if (this.teamSize) {
    if (this.teamSize.min !== undefined) this.minTeamSize = this.teamSize.min;
    if (this.teamSize.max !== undefined) this.maxTeamSize = this.teamSize.max;
  }

  // Calculate expiresAt = registrationDeadline + 24 hours
  const deadline = this.registrationDeadline || this.registration?.deadline;
  if (deadline && !isNaN(new Date(deadline).getTime())) {
    this.expiresAt = new Date(new Date(deadline).getTime() + 24 * 60 * 60 * 1000);
  }
});


// Dynamic Virtual Property: status
hackathonSchema.virtual("status").get(function () {
  const now = new Date();
  const regStart = this.registration?.startDate || this.registrationOpens;
  const regDeadline = this.registration?.deadline || this.registrationDeadline;
  const eventStart = this.event?.startDate || this.startDate;
  const eventEnd = this.event?.endDate || this.endDate;

  if (regStart && now < new Date(regStart)) {
    return "upcoming";
  }

  if (regDeadline && now <= new Date(regDeadline)) {
    return "registration-open";
  }

  if (eventStart && eventEnd && now >= new Date(eventStart) && now <= new Date(eventEnd)) {
    return "live";
  }

  if (regDeadline && now > new Date(regDeadline) && eventStart && now < new Date(eventStart)) {
    return "registration-closed";
  }

  if (eventEnd && now > new Date(eventEnd)) {
    return "completed";
  }

  if (regDeadline && now > new Date(regDeadline)) {
    return "registration-closed";
  }

  return "registration-open";
});

// Configure JSON transform to include virtuals and convert _id to id
hackathonSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Hackathon", hackathonSchema);
