const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const { auth, requireRole } = require("../middlewares/auth");

// All routes require login
router.use(auth);

// Admin-only reports
router.get("/checkpoints", requireRole(["admin"]), reportController.getCheckpointReport);
router.get("/range", requireRole(["admin"]), reportController.getRangeCheckpointReport);
router.get("/missed", requireRole(["admin"]), reportController.getMissedVisitsReport);
router.get("/guards", requireRole(["admin"]), reportController.getGuardReport);
router.get("/summary", requireRole(["admin"]), reportController.getSummaryReport);
router.get("/export/csv", requireRole(["admin"]), reportController.exportReportsCSV);
router.get("/export/pdf", requireRole(["admin"]), reportController.exportReportsPDF);
// Guards can only see their own report
router.get("/guards/:id", requireRole(["admin", "guard"]), async (req, res, next) => {
  if (req.user.role === "guard" && req.user.id.toString() !== req.params.id) {
    return res.status(403).json({ error: "Forbidden: guards can only view their own reports" });
  }
  next();
}, reportController.getGuardDetailReport);

module.exports = router;
