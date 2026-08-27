// ---------------------------------------------------------------------------
// server/middleware/uploadMiddleware.js — Multer Configuration for Uploads
// Provides 'upload' for user profile photos (5MB max) and 'chatUpload' for chat files (20MB max)
// ---------------------------------------------------------------------------

const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Profile Uploads Directory & Multer Instance
const uploadsDir = path.join(__dirname, "../public/uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Please select a PNG, JPG, JPEG, or WEBP image."));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});

// Chat Uploads Directory & Multer Instance
const chatUploadsDir = path.join(__dirname, "../public/uploads/chat");
if (!fs.existsSync(chatUploadsDir)) {
  fs.mkdirSync(chatUploadsDir, { recursive: true });
}

const chatStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, chatUploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBaseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    cb(null, `chat-${safeBaseName}-${uniqueSuffix}${ext}`);
  },
});

const chatFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const disallowedExts = [".exe", ".bat", ".cmd", ".msi", ".scr", ".com", ".sh", ".vbs", ".app", ".jar"];

  if (disallowedExts.includes(ext)) {
    return cb(new Error("Executable and script files are not allowed for security reasons."));
  }

  cb(null, true);
};

const chatUpload = multer({
  storage: chatStorage,
  fileFilter: chatFileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max
  },
});

module.exports = upload;
module.exports.upload = upload;
module.exports.chatUpload = chatUpload;
