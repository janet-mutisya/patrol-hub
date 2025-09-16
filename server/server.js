const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(helmet());
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "http://localhost:5000",
  "http://localhost:5173",
  "http://localhost:5174",
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

// --- Rate limiters ---
// Relaxed limiter for general API
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "development" ? 1000 : 500, // higher in dev
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general limiter only to API routes
app.use("/api", generalLimiter);

// --- Body Parsers ---
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// --- ROUTES ---
console.log("Loading route modules...\n");

// Authentication routes (login/signup have their own limiter inside authRoutes.js)
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);
console.log("Auth routes mounted on /api/auth");

// User management routes
const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);
console.log("User routes mounted on /api/users");

// Checkpoint routes
const checkpointRoutes = require("./routes/checkpointRoutes");
app.use("/api/checkpoints", checkpointRoutes);
console.log("Checkpoint routes mounted on /api/checkpoints");

// Patrol log routes
const patrolLogRoutes = require("./routes/patrolLogRoutes");
app.use("/api/patrol-logs", patrolLogRoutes);
console.log("Patrol log routes mounted on /api/patrol-logs");

// Report routes
const reportRoutes = require("./routes/reportRoutes");
app.use("/api/reports", reportRoutes);
console.log("Report routes mounted on /api/reports");

// NEW: Shift management routes
const shiftRoutes = require("./routes/shiftRoutes");
app.use("/api/shifts", shiftRoutes);
console.log("Shift routes mounted on /api/shifts");

// NEW: Attendance management routes
const attendanceRoutes = require("./routes/attendanceRoutes");
app.use("/api/attendance", attendanceRoutes);
console.log("Attendance routes mounted on /api/attendance");

console.log("\n✨ All routes loaded successfully!\n");

// --- Health Check ---
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    routes: {
      auth: "/api/auth",
      users: "/api/users",
      checkpoints: "/api/checkpoints",
      patrolLogs: "/api/patrol-logs",
      reports: "/api/reports",
      shifts: "/api/shifts",
      attendance: "/api/attendance",
    },
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
    error:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
  });
});

// --- DATABASE CONNECTION ---
const db = require("./models");

db.sequelize
  .authenticate()
  .then(() => {
    console.log("Database connection established successfully");
    console.log(
      "Models loaded:",
      Object.keys(db).filter(
        (key) =>
          key !== "sequelize" && key !== "Sequelize" && key !== "helpers"
      )
    );
    console.log(
      "Note: Database sync is disabled. Tables structure should already exist."
    );
  })
  .catch((err) => {
    console.error("Database connection error:", err);
    console.log(
      "Warning: Database connection failed but server will continue running"
    );
  });

// --- Start Server ---
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Available endpoints:`);
  console.log(`   GET  /api/health          - Health check`);
  console.log(`   POST /api/auth/*          - Authentication routes`);
  console.log(`   *    /api/users/*         - User management routes`);
  console.log(`   *    /api/checkpoints/*   - Checkpoint routes`);
  console.log(`   *    /api/patrol-logs/*   - Patrol log routes`);
  console.log(`   *    /api/reports/*       - Report routes`);
  console.log(`   *    /api/shifts/*        - Shift management routes`);
  console.log(`   *    /api/attendance/*    - Attendance tracking routes`);
});

module.exports = app;
