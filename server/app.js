const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const dns = require("dns");
require("dotenv").config();

// Configure public DNS fallback to reliably resolve MongoDB Atlas mongodb+srv:// SRV records on Windows networks
try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder("ipv4first");
  }
  dns.setServers(["1.1.1.1", "8.8.8.8", "8.8.4.4"]);
} catch (err) {
  console.warn("Could not set custom DNS fallback servers:", err.message);
}

const path = require("path");
const authRoutes = require("./routes/authRoutes");
const hackathonRoutes = require("./routes/hackathonRoutes");
const userRoutes = require("./routes/userRoutes");
const networkRoutes = require("./routes/networkRoutes");
const teamRoutes = require("./routes/teamRoutes");
const chatRoutes = require("./routes/chatRoutes");
const { initHackathonSyncJob, runSyncTask } = require("./jobs/hackathonSyncJob");
const { syncAllUsersToStream } = require("./services/streamService");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: true, // Allow requesting origin in dev proxy
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static profile uploads
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/hackathons", hackathonRoutes);
// User profile & discovery routes
app.use("/api/users", userRoutes);
app.use("/api/network", networkRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/chat", chatRoutes);

// Admin sync endpoint alias
app.post("/api/admin/hackathons/sync", (req, res) => {
  runSyncTask();
  res.json({
    success: true,
    message: "Multi-platform hackathon synchronization started.",
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "getHack API is running",
    dbState: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// MongoDB connection & buffering options
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/getHack";

mongoose.set("bufferTimeoutMS", 5000);

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB connection disconnected. Retrying...");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection event error:", err.message);
});

mongoose
  .connect(MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    tlsAllowInvalidCertificates: true,
  })
  .then(() => {
    console.log("MongoDB connected successfully to getHack DB");
    // Synchronize all existing MongoDB users into Stream Chat
    syncAllUsersToStream();
    // Initialize multi-platform hackathon synchronization background scheduler
    initHackathonSyncJob();
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message || err);
    console.warn("Server running without active MongoDB connection. Background sync scheduler will remain paused until database is connected.");
  });

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
