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

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "getHack API is running",
    dbState: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// MongoDB connection
if (process.env.MONGO_URI) {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected successfully to getHack DB"))
    .catch((err) => console.error("MongoDB connection error:", err.message || err));
} else {
  console.warn("MONGO_URI is not set in environment variables");
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
