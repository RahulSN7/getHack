const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const dns = require("dns");
require("dotenv").config();

// Configure public DNS fallback to reliably resolve MongoDB Atlas mongodb+srv:// SRV records on Windows networks
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (err) {
  console.warn("Could not set custom DNS fallback servers:", err.message);
}

const authRoutes = require("./routes/authRoutes");
const hackathonRoutes = require("./routes/hackathonRoutes");
const userRoutes = require("./routes/userRoutes");
const networkRoutes = require("./routes/networkRoutes");
const { initHackathonSyncJob, runSyncTask } = require("./jobs/hackathonSyncJob");

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

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/hackathons", hackathonRoutes);
app.use("/api/users", userRoutes);
app.use("/api/network", networkRoutes);

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

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/getHack";

mongoose
  .connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => {
    console.log("MongoDB connected successfully to getHack DB");
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
