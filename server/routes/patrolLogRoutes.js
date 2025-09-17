const express = require('express');
const router = express.Router();
const { auth, requireRole, fallbackToGuard } = require('../middlewares/auth');
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
} = require('../controllers/patrollogController');

// ================================
// MAIN CRUD OPERATIONS FIRST
// ================================

// Admin can get all patrol logs - MUST BE FIRST
router.get('/',
  auth,
  requireRole(['admin']),
  getAllPatrolLogs
);

// Guards can create their own patrol logs
router.post('/',
  auth,
  fallbackToGuard,
  requireRole(['guard', 'admin']),
  createPatrolLog
);

// ================================
// SPECIFIC ROUTES (before parameterized routes)
// ================================

// Admin can get patrol statistics
router.get('/stats',
  auth,
  requireRole(['admin']),
  getPatrolStats
);

// Admin can get overdue patrols
router.get('/overdue',
  auth,
  requireRole(['admin']),
  getOverduePatrols
);

// Guards get their own patrol logs
router.get('/my-logs',
  auth,
  fallbackToGuard,
  requireRole(['guard']),
  (req, res, next) => {
    req.params.guardId = req.user.id;
    next();
  },
  getPatrolLogsByGuard
);

// Admin can bulk create patrol logs
router.post('/bulk',
  auth,
  requireRole(['admin']),
  bulkCreatePatrolLogs
);

// ================================
// EXPORT ROUTES (Admin only)
// ================================

// Export logs as CSV
router.get('/export/csv',
  auth,
  requireRole(['admin']),
  (req, res, next) => {
    req.query.exportType = 'csv';
    next();
  },
  getAllPatrolLogs
);

// Export logs as PDF
router.get('/export/pdf',
  auth,
  requireRole(['admin']),
  (req, res, next) => {
    req.query.exportType = 'pdf';
    next();
  },
  getAllPatrolLogs
);

// ================================
// RESOURCE-SPECIFIC ROUTES
// ================================

// Admin can get logs by any guard
router.get('/guard/:guardId',
  auth,
  requireRole(['admin']),
  getPatrolLogsByGuard
);

// Get patrol logs by checkpoint (Guard & Admin)
router.get('/checkpoint/:checkpointId',
  auth,
  requireRole(['guard', 'admin']),
  getPatrolLogsByCheckpoint
);

// ================================
// PARAMETERIZED ROUTES LAST
// ================================

// Guards can view a single patrol log
router.get('/:id',
  auth,
  fallbackToGuard,
  requireRole(['guard', 'admin']),
  getPatrolLogById
);

// Guards can update their own logs
router.put('/:id',
  auth,
  fallbackToGuard,
  requireRole(['guard', 'admin']),
  updatePatrolLog
);

// Mark patrol as completed (Guards)
router.patch('/:id/complete',
  auth,
  fallbackToGuard,
  requireRole(['guard', 'admin']),
  markPatrolCompleted
);

// Start patrol (Guards)
router.patch('/:id/start',
  auth,
  fallbackToGuard,
  requireRole(['guard', 'admin']),
  startPatrolServer
);

// End patrol (Guards)
router.patch('/:id/end',
  auth,
  fallbackToGuard,
  requireRole(['guard', 'admin']),
  endPatrolServer
);

// Admin can delete patrol log
router.delete('/:id',
  auth,
  requireRole(['admin']),
  deletePatrolLog
);

module.exports = router;