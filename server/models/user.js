// ---------------------------------------------------------------------------
// server/models/user.js — Mongoose User Model for getHack
// Strict single-role schema: participant OR organizer
// ---------------------------------------------------------------------------

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
    },

    role: {
      type: String,
      enum: {
        values: ["participant", "organizer"],
        message: "Role must be either 'participant' or 'organizer'",
      },
      required: [true, "Role is required"],
    },

    profile: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving if modified
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to return safe user object without password
const { isProfileComplete } = require("../utils/profileValidation");

userSchema.methods.toSafeUser = function () {
  const p = this.profile || {};
  const complete = isProfileComplete(this);
  const rawAvailability = typeof p.availability === "string" ? p.availability : "";
  const safeAvailability = !complete && rawAvailability === "Available" ? "" : rawAvailability;

  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    profile: {
      avatar: typeof p.avatar === "string" ? p.avatar : "",
      gender: typeof p.gender === "string" ? p.gender : "",
      dateOfBirth: typeof p.dateOfBirth === "string" ? p.dateOfBirth : p.dateOfBirth instanceof Date ? p.dateOfBirth.toISOString() : "",
      role: typeof p.role === "string" ? p.role : "Participant",
      bio: typeof p.bio === "string" ? p.bio : "",
      availability: safeAvailability,
      skills: Array.isArray(p.skills) ? p.skills : [],
      education: typeof p.education === "object" && p.education !== null ? p.education : {},
      college: typeof p.college === "string" ? p.college : p.education?.college || "",
      degree: typeof p.degree === "string" ? p.degree : p.education?.degree || "",
      experienceLevel: typeof p.experienceLevel === "string" ? p.experienceLevel : "Intermediate",
      experienceDetails: typeof p.experienceDetails === "string" ? p.experienceDetails : "",
      interests: Array.isArray(p.interests) ? p.interests : [],
      github: typeof p.github === "string" ? p.github : "",
      linkedin: typeof p.linkedin === "string" ? p.linkedin : "",
      portfolio: typeof p.portfolio === "string" ? p.portfolio : "",
      location: typeof p.location === "string" ? p.location : "",
      handle: typeof p.handle === "string" && p.handle ? p.handle : `GH-${this._id.toString().slice(-6).toUpperCase()}`,
    },
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);