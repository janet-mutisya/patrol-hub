// routes/shiftRoutes.js
const express = require('express');
const router = express.Router();
const shiftController = require('../controllers/shiftController');
const { auth, requireRole, fallbackToGuard } = require('../middlewares/auth');

// 🔒 All routes require authentication
router.use(auth);

// 📌 PUBLIC ROUTES (Guards can access)
// GET /api/shifts - Get all shifts (guards can view to know available shifts)
router.get('/', 
  fallbackToGuard,
  shiftController.getAllShifts
);

// GET /api/shifts/current - Get currently active shift
router.get('/current', 
  fallbackToGuard,
  shiftController.getCurrentShift
);

// GET /api/shifts/:id - Get single shift by ID (guards can view shift details)
router.get('/:id',
  fallbackToGuard,
  shiftController.getShiftById
);

// 📌 ADMIN-ONLY ROUTES
// POST /api/shifts - Create new shift
router.post('/',
  requireRole(['admin']),
  shiftController.createShift
);

// PUT /api/shifts/:id - Update shift
router.put('/:id',
  requireRole(['admin']),
  shiftController.updateShift
);

// DELETE /api/shifts/:id - Delete shift
router.delete('/:id',
  requireRole(['admin']),
  shiftController.deleteShift
);

// POST /api/shifts/setup-defaults - Create default shifts
router.post('/setup-defaults',
  requireRole(['admin']),
  shiftController.setupDefaultShifts
);

// GET /api/shifts/:id/stats - Get shift statistics (admin can view detailed stats)
router.get('/:id/stats',
  requireRole(['admin']),
  shiftController.getShiftStats
);

// POST /api/shifts/:id/toggle - Toggle shift active status
router.post('/:id/toggle',
  requireRole(['admin']),
  shiftController.toggleShiftStatus
);

// 📌 Error handling middleware for this route group
router.use((error, req, res, next) => {
  console.error('Shift routes error:', error);
  
  if (error.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.errors.map(err => ({
        field: err.path,
        message: err.message
      }))
    });
  }

  if (error.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry',
      field: error.errors[0]?.path
    });
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

module.exports = router;