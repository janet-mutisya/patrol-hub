// server.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();

// --- Middleware ---
app.use(helmet());

// ✅ Allow multiple origins (5173 for Vite, 3000 for CRA, plus env FRONTEND_URL)
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later",
  },
});

app.use(generalLimiter);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// --- ROUTES ---
console.log("📂 Loading route modules...\n");

const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);
console.log("✅ Auth routes mounted on /api/auth");

const checkpointRoutes = require("./routes/checkpointRoutes");
app.use("/api/checkpoints", checkpointRoutes);
console.log("✅ Checkpoint routes mounted on /api/checkpoints");

const patrolLogRoutes = require("./routes/patrolLogRoutes");
app.use("/api/patrol-logs", patrolLogRoutes);
console.log("✅ Patrol log routes mounted on /api/patrol-logs");

const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);
console.log("✅ User routes mounted on /api/users");

const reportRoutes = require("./routes/reportRoutes");
app.use("/api/reports", reportRoutes);
console.log("✅ Report routes mounted on /api/reports");

console.log("\n✨ All routes loaded successfully!\n");

// --- Health Check ---
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// --- 404 Handler ---
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
    method: req.method,
  });
});

// --- Global Error Handler ---
app.use((error, req, res, next) => {
  console.error("Global error:", error);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// --- Start Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Security System Server running on http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`📊 Available endpoints:`);
  console.log(`   GET  /api/health         - Health check`);
  console.log(`   POST /api/auth/*         - Authentication routes`);
  console.log(`   *    /api/checkpoints/*  - Checkpoint routes`);
  console.log(`   *    /api/patrol-logs/*  - Patrol log routes`);
  console.log(`   *    /api/users/*        - User routes`);
  console.log(`   *    /api/reports/*      - Report routes`);
});

module.exports = app;
