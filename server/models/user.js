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
userSchema.methods.toSafeUser = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    profile: this.profile || {},
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);