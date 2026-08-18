// ---------------------------------------------------------------------------
// server/models/hackathon.js — Mongoose Hackathon Model for getHack
// ---------------------------------------------------------------------------

const mongoose = require("mongoose");

const hackathonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Hackathon title is required"],
      trim: true,
    },

    shortDescription: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },

    organizerName: {
      type: String,
      required: [true, "Organizer name is required"],
      trim: true,
    },

    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Organizer reference is required"],
      index: true,
    },

    registrationOpens: {
      type: Date,
    },

    registrationDeadline: {
      type: Date,
      required: [true, "Registration deadline is required"],
    },

    startDate: {
      type: Date,
      required: [true, "Hackathon start date is required"],
    },

    endDate: {
      type: Date,
      required: [true, "Hackathon end date is required"],
    },

    format: {
      type: String,
      enum: {
        values: ["Online", "Offline", "Hybrid"],
        message: "Format must be Online, Offline, or Hybrid",
      },
      required: [true, "Event format is required"],
      default: "Online",
    },

    location: {
      venue: { type: String, default: "" },
      city: { type: String, default: "" },
      country: { type: String, default: "" },
    },

    registrationUrl: {
      type: String,
      required: [true, "External registration link is required"],
      trim: true,
    },

    skills: {
      type: [String],
      default: [],
    },

    themes: {
      type: [String],
      default: [],
    },

    eligibility: {
      type: String,
      default: "",
    },

    minTeamSize: {
      type: Number,
      default: 1,
      min: 1,
    },

    maxTeamSize: {
      type: Number,
      default: 4,
      min: 1,
    },

    prizes: {
      type: String,
      default: "",
    },

    rules: {
      type: String,
      default: "",
    },

    contact: {
      type: String,
      default: "",
    },

    fee: {
      type: String,
      default: "Free",
    },
  },
  {
    timestamps: true,
  }
);

// Virtual property to calculate active registration status
hackathonSchema.virtual("status").get(function () {
  const now = new Date();
  if (this.registrationOpens && now < new Date(this.registrationOpens)) {
    return "Upcoming";
  }
  if (now > new Date(this.registrationDeadline)) {
    if (now > new Date(this.endDate)) {
      return "Completed";
    }
    if (now >= new Date(this.startDate) && now <= new Date(this.endDate)) {
      return "Ongoing";
    }
    return "Registration Closed";
  }
  return "Registration Open";
});

// Configure JSON transform to include virtuals and convert _id to id
hackathonSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Hackathon", hackathonSchema);
