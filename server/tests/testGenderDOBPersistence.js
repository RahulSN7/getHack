// ---------------------------------------------------------------------------
// testGenderDOBPersistence.js — Verify Gender and Date of Birth Persistence in User.toSafeUser()
// ---------------------------------------------------------------------------

const User = require("../models/User");

console.log("==============================================");
console.log("Testing Gender & DOB Persistence in toSafeUser()");
console.log("==============================================");

const dummyUser = new User({
  name: "Test Participant",
  email: "test.participant@example.com",
  password: "Password123!",
  role: "participant",
  profile: {
    avatar: "/uploads/test.jpg",
    gender: "Male",
    dateOfBirth: "2002-05-14",
    location: "Rajasthan",
    role: "Full Stack Developer",
    bio: "Test bio text for participant.",
    skills: ["React", "Node.js"],
    availability: "Available",
  },
});

const safeUser = dummyUser.toSafeUser();

console.log("Output safeUser.profile:", safeUser.profile);

if (safeUser.profile.gender === "Male") {
  console.log("✓ PASSED: Gender is correctly included in toSafeUser()");
} else {
  console.error("❌ FAILED: Gender is missing or incorrect in toSafeUser():", safeUser.profile.gender);
  process.exit(1);
}

if (safeUser.profile.dateOfBirth === "2002-05-14") {
  console.log("✓ PASSED: Date of Birth is correctly included in toSafeUser()");
} else {
  console.error("❌ FAILED: Date of Birth is missing or incorrect in toSafeUser():", safeUser.profile.dateOfBirth);
  process.exit(1);
}

console.log("==============================================");
console.log("All Gender & DOB persistence checks passed!");
console.log("==============================================");
