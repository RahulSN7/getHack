// server/config/cloudinary.js — Cloudinary SDK Configuration & Guard
// Initializes Cloudinary instance securely from environment variables

const cloudinary = require("cloudinary").v2;

// Configure Cloudinary using environment variables
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "";
const apiKey = process.env.CLOUDINARY_API_KEY || "";
const apiSecret = process.env.CLOUDINARY_API_SECRET || "";
const cloudinaryUrl = process.env.CLOUDINARY_URL || "";

if (cloudinaryUrl) {
  cloudinary.config({
    cloudinary_url: cloudinaryUrl,
    secure: true,
  });
} else if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

/**
 * Checks if Cloudinary credentials are fully configured.
 * @returns {boolean} True if all required credentials are present
 */
function isCloudinaryConfigured() {
  if (process.env.CLOUDINARY_URL && process.env.CLOUDINARY_URL.trim()) {
    return true;
  }
  const name = (process.env.CLOUDINARY_CLOUD_NAME || "").trim();
  const key = (process.env.CLOUDINARY_API_KEY || "").trim();
  const secret = (process.env.CLOUDINARY_API_SECRET || "").trim();

  return Boolean(name && key && secret);
}

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
};
