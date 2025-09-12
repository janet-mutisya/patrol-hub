const express = require('express');
const router = express.Router();
const { auth, requireRole, fallbackToGuard } = require('../middlewares/auth');
const {
  getCheckpointReport,
  getGuardReport,
  getSummaryReport,
  getMissedVisitsReport,
  getGuardDetailReport,
  exportReportsCSV,
  exportReportsPDF,
} = require('../controllers/reportController');

// ================================
// GUARD DASHBOARD ROUTES
// ================================
router.get('/my-performance', 
  auth, 
  requireRole(['guard']), 
  (req, res, next) => {
    req.params.id = req.user.id;
    next();
  },
  getGuardDetailReport
);

router.get('/summary', 
  auth, 
  fallbackToGuard,
  requireRole(['guard', 'admin']), 
  getSummaryReport
);

router.get('/missed-visits', 
  auth, 
  fallbackToGuard,
  requireRole(['guard', 'admin']), 
  getMissedVisitsReport
);

// ================================
// ADMIN DASHBOARD ROUTES
// ================================
router.get('/checkpoints', auth, requireRole(['admin']), getCheckpointReport);
router.get('/guards', auth, requireRole(['admin']), getGuardReport);
router.get('/guards/:id', auth, requireRole(['admin']), getGuardDetailReport);

// ================================
// EXPORT ROUTES (Admin only)
// ================================
router.get('/export/csv', auth, requireRole(['admin']), exportReportsCSV);
router.get('/export/pdf', auth, requireRole(['admin']), exportReportsPDF);

module.exports = router;
