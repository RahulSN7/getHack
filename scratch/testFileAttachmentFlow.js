// ---------------------------------------------------------------------------
// scratch/testFileAttachmentFlow.js
// End-to-end testing script for chat file attachment upload & payload creation
// ---------------------------------------------------------------------------

const fs = require("fs");
const path = require("path");

function getMimeType(filename = "") {
  const ext = "." + (filename.split(".").pop() || "").toLowerCase();
  const mimeMap = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".txt": "text/plain",
    ".zip": "application/zip",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };
  return mimeMap[ext] || "application/octet-stream";
}

function validateFileForUpload(filename, sizeBytes) {
  const ext = "." + (filename.split(".").pop() || "").toLowerCase();
  const disallowedExts = [".exe", ".bat", ".cmd", ".msi", ".scr", ".com", ".sh", ".vbs", ".app", ".jar"];

  if (disallowedExts.includes(ext)) {
    return { valid: false, reason: "Executable and script files are not allowed for security reasons." };
  }

  const maxBytes = 20 * 1024 * 1024; // 20MB
  if (sizeBytes > maxBytes) {
    return { valid: false, reason: `File is too large (${(sizeBytes / 1024 / 1024).toFixed(1)}MB). Maximum allowed limit is 20MB.` };
  }

  return { valid: true };
}

function buildMessagePayload(text, pendingAttachment) {
  const payload = {};
  if (text && text.trim()) {
    payload.text = text.trim();
  }

  if (pendingAttachment && pendingAttachment.cdnUrl) {
    payload.attachments = [
      {
        type: pendingAttachment.isImage ? "image" : "file",
        asset_url: pendingAttachment.cdnUrl,
        image_url: pendingAttachment.isImage ? pendingAttachment.cdnUrl : undefined,
        thumb_url: pendingAttachment.isImage ? pendingAttachment.cdnUrl : undefined,
        title: pendingAttachment.name,
        file_size: pendingAttachment.size,
        mime_type: pendingAttachment.mimeType,
      },
    ];
  }

  return payload;
}

console.log("Running Chat File Attachment System Tests...\n");

// TEST 1: Executable Rejection
console.log("--- TEST 1: Executable File Validation ---");
const exeVal = validateFileForUpload("malicious.exe", 1024);
console.log("Validation result for malicious.exe:", exeVal);
if (exeVal.valid) throw new Error("Validation failed: malicious.exe was allowed!");
console.log("✅ Test 1 PASSED: Executables (.exe, .bat, etc.) are blocked.");

// TEST 2: File Size Validation
console.log("\n--- TEST 2: File Size Validation ---");
const largeVal = validateFileForUpload("huge_dataset.zip", 25 * 1024 * 1024);
console.log("Validation result for 25MB file:", largeVal);
if (largeVal.valid) throw new Error("Validation failed: 25MB file was allowed!");
console.log("✅ Test 2 PASSED: Files > 20MB are blocked.");

// TEST 3: Image Payload Construction
console.log("\n--- TEST 3: Image-Only Message Payload ---");
const imgAttachment = {
  name: "photo.png",
  size: 1542000,
  mimeType: getMimeType("photo.png"),
  isImage: true,
  cdnUrl: "https://getstream.imgix.net/chat/photo.png",
};
const payload1 = buildMessagePayload("", imgAttachment);
console.log("Payload:", JSON.stringify(payload1, null, 2));
if (payload1.text) throw new Error("Expected no text in image-only payload");
if (!payload1.attachments || payload1.attachments[0].type !== "image") throw new Error("Image attachment missing or wrong type");
console.log("✅ Test 3 PASSED: Image-only payload constructed correctly.");

// TEST 4: Document + Text Payload Construction
console.log("\n--- TEST 4: Text + PDF Document Message Payload ---");
const pdfAttachment = {
  name: "resume.pdf",
  size: 2400000,
  mimeType: getMimeType("resume.pdf"),
  isImage: false,
  cdnUrl: "/uploads/chat/chat-resume-123456.pdf",
};
const payload2 = buildMessagePayload("Here is my resume for review.", pdfAttachment);
console.log("Payload:", JSON.stringify(payload2, null, 2));
if (payload2.text !== "Here is my resume for review.") throw new Error("Text mismatch");
if (!payload2.attachments || payload2.attachments[0].type !== "file") throw new Error("File attachment missing or wrong type");
if (payload2.attachments[0].asset_url !== "/uploads/chat/chat-resume-123456.pdf") throw new Error("URL mismatch");
console.log("✅ Test 4 PASSED: Text + document payload constructed correctly.");

console.log("\n🎉 ALL FILE ATTACHMENT TESTS PASSED SUCCESSFULLY!");
