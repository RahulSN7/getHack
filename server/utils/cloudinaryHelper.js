// server/utils/cloudinaryHelper.js — Cloudinary Upload & Deletion Utilities
// Handles memory buffer stream uploads and safe avatar deletions across all URL types

const { Readable } = require("stream");
const path = require("path");
const fs = require("fs");
const { cloudinary } = require("../config/cloudinary");

/**
 * Uploads a file buffer directly to Cloudinary without writing to local disk.
 * @param {Buffer} fileBuffer - Image buffer from Multer memoryStorage
 * @param {string} folder - Destination Cloudinary folder (default: 'getHack/avatars')
 * @returns {Promise<{secure_url: string, public_id: string}>} Cloudinary upload result
 */
function uploadAvatarToCloudinary(fileBuffer, folder = "getHack/avatars") {
  return new Promise((resolve, reject) => {
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
      return reject(new Error("Invalid image buffer provided for Cloudinary upload."));
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        if (!result || !result.secure_url) {
          return reject(new Error("Cloudinary upload did not return a valid secure URL."));
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );

    // Stream buffer into Cloudinary uploadStream
    const bufferStream = Readable.from(fileBuffer);
    bufferStream.pipe(uploadStream);
  });
}

/**
 * Extracts the Cloudinary public_id from a full Cloudinary URL.
 * Handles version numbers (v1234567), folder paths, and file extensions.
 * @param {string} url - Full Cloudinary secure URL
 * @returns {string|null} Extracted public_id or null if not extractable
 */
function extractCloudinaryPublicId(url) {
  if (!url || typeof url !== "string") return null;

  const uploadIndex = url.indexOf("/upload/");
  if (uploadIndex === -1) return null;

  let pathAfterUpload = url.substring(uploadIndex + "/upload/".length);

  // Remove query string if present
  if (pathAfterUpload.includes("?")) {
    pathAfterUpload = pathAfterUpload.split("?")[0];
  }

  const parts = pathAfterUpload.split("/").filter(Boolean);
  const filteredParts = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    // Skip version segment e.g. v1726912345
    if (i === 0 && /^v\d+$/i.test(part)) {
      continue;
    }
    // Skip transformation segments e.g. c_scale,w_500
    if (part.includes(",") || /^c_|w_|h_|f_|q_/.test(part)) {
      continue;
    }
    filteredParts.push(part);
  }

  if (filteredParts.length === 0) return null;

  let publicIdWithExt = filteredParts.join("/");
  const lastDotIndex = publicIdWithExt.lastIndexOf(".");
  if (lastDotIndex !== -1) {
    return publicIdWithExt.substring(0, lastDotIndex);
  }
  return publicIdWithExt;
}

/**
 * Safely deletes an old avatar based on its URL type.
 * - Cloudinary URLs: Extracts public_id and destroys asset on Cloudinary.
 * - Google URLs (lh3.googleusercontent.com): Skipped completely.
 * - External HTTPS URLs: Skipped completely.
 * - Legacy /uploads/... paths: Attempts local file cleanup if present, ignores ENOENT.
 *
 * @param {string} avatarUrl - URL or relative path of the old avatar to remove
 * @returns {Promise<void>}
 */
async function deleteAvatarFromCloudinary(avatarUrl) {
  if (!avatarUrl || typeof avatarUrl !== "string") return;

  const url = avatarUrl.trim();
  if (!url) return;

  // RULE 2: Google Avatar URLs — Skip completely
  if (url.includes("googleusercontent.com") || url.includes("lh3.google")) {
    return;
  }

  const isCloudinary = url.includes("res.cloudinary.com") || url.includes("cloudinary.com");

  // RULE 1: Cloudinary URLs — Extract public_id and destroy asset
  if (isCloudinary) {
    try {
      const publicId = extractCloudinaryPublicId(url);
      if (publicId && (publicId.startsWith("getHack/") || publicId.includes("avatar"))) {
        console.log(`[Cloudinary Cleanup] Deleting old asset with public_id: ${publicId}`);
        await cloudinary.uploader.destroy(publicId);
      }
    } catch (err) {
      console.warn("[Avatar Cleanup Warning] Failed to remove old Cloudinary avatar:", err.message);
    }
    return;
  }

  // RULE 3: Arbitrary external HTTPS URLs — Skip completely
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return;
  }

  // RULE 4: Legacy /uploads/... paths — Attempt local file cleanup safely
  if (url.startsWith("/uploads/") || url.startsWith("uploads/")) {
    try {
      const cleanPath = url.startsWith("/") ? url.slice(1) : url;
      const filename = path.basename(cleanPath);
      const filePath = path.join(__dirname, "../public/uploads", filename);

      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
          if (err && err.code !== "ENOENT") {
            console.warn("[Avatar Cleanup Warning] Failed to remove old legacy local file:", err.message);
          }
        });
      }
    } catch (err) {
      console.warn("[Avatar Cleanup Warning] Local file cleanup error:", err.message);
    }
  }
}

module.exports = {
  uploadAvatarToCloudinary,
  deleteAvatarFromCloudinary,
  extractCloudinaryPublicId,
};
