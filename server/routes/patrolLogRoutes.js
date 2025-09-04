const express = require("express");
const router = express.Router();
const { auth, requireRole } = require("../middlewares/auth");
const {
  createPatrolLog,
  getAllPatrolLogs,
  getPatrolLogById,
  updatePatrolLog,
  deletePatrolLog,
  getPatrolStats,
  bulkCreatePatrolLogs,
  getPatrolLogsByGuard,
  getPatrolLogsByCheckpoint,
  markPatrolCompleted,
  getOverduePatrols,
  startPatrolServer,
  endPatrolServer,
} = require("../controllers/patrollogController");

// ------------------------
// CRUD Routes
// ------------------------
router.post("/", auth, requireRole(["admin"]), createPatrolLog);
router.get("/", auth, getAllPatrolLogs);
router.get("/:id", auth, getPatrolLogById);
router.put("/:id", auth, requireRole(["admin"]), updatePatrolLog);
router.delete("/:id", auth, requireRole(["admin"]), deletePatrolLog);

// ------------------------
// Stats and bulk
// ------------------------
router.get("/stats/overview", auth, getPatrolStats);
router.post("/bulk", auth, requireRole(["admin"]), bulkCreatePatrolLogs);

// ------------------------
// Guard / Checkpoint specific
// ------------------------
router.get("/guard/:guardId", auth, getPatrolLogsByGuard);
router.get("/checkpoint/:checkpointId", auth, getPatrolLogsByCheckpoint);

// ------------------------
// Patrol actions
// ------------------------
router.patch("/:id/complete", auth, requireRole(["guard", "admin"]), markPatrolCompleted);
router.post("/:id/start", auth, requireRole(["guard"]), startPatrolServer);
router.post("/:id/end", auth, requireRole(["guard"]), endPatrolServer);

// ------------------------
// Overdue patrols
// ------------------------
router.get("/status/overdue", auth, requireRole(["admin"]), getOverduePatrols);

// ------------------------
// Export routes
// ------------------------
router.get("/export/csv", auth, requireRole(["admin", "guard"]), (req, res) => {
  req.query.exportType = "csv";
  getAllPatrolLogs(req, res);
});

router.get("/export/pdf", auth, requireRole(["admin", "guard"]), (req, res) => {
  req.query.exportType = "pdf";
  getAllPatrolLogs(req, res);
});

module.exports = router;
