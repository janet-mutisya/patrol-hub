// server/routes/checkpointRoutes.js
const express = require("express");
const {
  createCheckpoint,
  getAllCheckpoints,
  getActiveCheckpoints,
  getCheckpointById,
  updateCheckpoint,
  deleteCheckpoint,
  toggleCheckpointStatus,
  getCheckpointStats,
  bulkUpdateCheckpoints,
  getNearbyCheckpoints,
  assignCheckpoint,
  unassignCheckpoint,
  getGuardCheckpoints,
  checkpointValidation,
  updateCheckpointValidation,
  queryValidation,
  getAssignedCheckpoint // Add this new function
} = require("../controllers/checkpointController");

const { auth, requireRole } = require("../middlewares/auth");
const router = express.Router();

// Routes accessible by both guards and admins
router.get(
  "/",
  auth,
  requireRole(["guard", "admin"]),
  queryValidation,
  getAllCheckpoints
);

router.get(
  "/active",
  auth,
  requireRole(["guard", "admin"]),
  getActiveCheckpoints
);

router.get(
  "/nearby",
  auth,
  requireRole(["guard", "admin"]),
  getNearbyCheckpoints
);

// NEW ROUTE: Get checkpoint assigned to a specific guard
router.get(
  "/assigned/:guardId",
  auth,
  requireRole(["guard", "admin"]),
  getAssignedCheckpoint
);

router.get(
  "/:id",
  auth,
  requireRole(["admin"]),
  getCheckpointById
);

// Admin and Manager only routes (checkpoint management)
router.post(
  "/",
  auth,
  requireRole(["admin"]),
  checkpointValidation,
  createCheckpoint
);

router.put(
  "/:id",
  auth,
  requireRole(["admin"]),
  updateCheckpointValidation,
  updateCheckpoint
);

router.patch(
  "/:id/status",
  auth,
  requireRole(["admin"]),
  toggleCheckpointStatus
);

router.get(
  "/:id/stats",
  auth,
  requireRole(["admin"]),
  getCheckpointStats
);

// Admin only routes (full management)
router.delete(
  "/:id",
  auth,
  requireRole(["admin"]),
  deleteCheckpoint
);

router.patch(
  "/bulk",
  auth,
  requireRole(["admin"]),
  bulkUpdateCheckpoints
);

// Assign/unassign checkpoints (admin actions)
router.post(
  "/assign", 
  auth,
  requireRole(["admin"]),
  assignCheckpoint
);

router.post(
  "/unassign", 
  auth,
  requireRole(["admin"]),
  unassignCheckpoint
);

// Get checkpoints assigned to a guard
router.get(
  "/guard/:guardId", 
  auth,
  requireRole(["guard", "admin"]),
  getGuardCheckpoints
);

module.exports = router;