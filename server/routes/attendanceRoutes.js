// routes/attendanceRoutes.js - Comprehensive attendance management routes with detailed comments

const express = require('express');
const router = express.Router();

// Import all controller functions for attendance management
const {
  checkIn,
  checkOut,
  getActiveGuards,
  autoMarkAbsent,
  markOff,
  getAttendanceHistory,
  getDailyReport,
  getCurrentStatus
} = require('../controllers/attendanceController');

// Import authentication and authorization middleware
const { auth, requireRole } = require('../middlewares/auth');

// ==========================================
// VALIDATION MIDDLEWARE
// ==========================================

/**
 * Validates check-in request data
 * Ensures latitude and longitude are provided for location tracking
 */
const validateCheckIn = (req, res, next) => {
  const { latitude, longitude } = req.body;
  
  // Location data is mandatory for security and geofencing
  if (!latitude || !longitude) {
    return res.status(400).json({
      success: false,
      error: 'Latitude and longitude are required',
      code: 'MISSING_LOCATION'
    });
  }
  
  // Optional: Add additional validation for coordinate ranges
  // Latitude: -90 to 90, Longitude: -180 to 180
  if (latitude < -90 || latitude > 90) {
    return res.status(400).json({
      success: false,
      error: 'Invalid latitude value',
      code: 'INVALID_LATITUDE'
    });
  }
  
  if (longitude < -180 || longitude > 180) {
    return res.status(400).json({
      success: false,
      error: 'Invalid longitude value',
      code: 'INVALID_LONGITUDE'
    });
  }
  
  next(); // Proceed to next middleware/controller
};

/**
 * Validates check-out request data
 * Similar to check-in validation but for check-out process
 */
const validateCheckOut = (req, res, next) => {
  const { latitude, longitude } = req.body;
  
  // Location required for check-out verification
  if (!latitude || !longitude) {
    return res.status(400).json({
      success: false,
      error: 'Latitude and longitude are required',
      code: 'MISSING_LOCATION'
    });
  }
  
  // Validate coordinate ranges
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return res.status(400).json({
      success: false,
      error: 'Invalid coordinates provided',
      code: 'INVALID_COORDINATES'
    });
  }
  
  next();
};

/**
 * Validates admin mark-off request data
 * Ensures required guard_id is provided for marking guard as off-duty
 */
const validateMarkOff = (req, res, next) => {
  const { guard_id } = req.body;
  
  // Guard ID is mandatory for identifying which guard to mark off
  if (!guard_id) {
    return res.status(400).json({
      success: false,
      error: 'Guard ID is required',
      code: 'MISSING_GUARD_ID'
    });
  }
  
  // Optional: Validate guard_id format (if using UUIDs or specific format)
  // if (!isValidId(guard_id)) {
  //   return res.status(400).json({
  //     success: false,
  //     error: 'Invalid guard ID format',
  //     code: 'INVALID_GUARD_ID'
  //   });
  // }
  
  next();
};

/**
 * Validates pagination parameters for history requests
 * Ensures page and limit values are reasonable to prevent performance issues
 */
const validatePagination = (req, res, next) => {
  let { page, limit } = req.query;
  
  // Set defaults if not provided
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;
  
  // Prevent unreasonable pagination values
  if (page < 1) {
    return res.status(400).json({
      success: false,
      error: 'Page number must be greater than 0',
      code: 'INVALID_PAGE'
    });
  }
  
  if (limit < 1 || limit > 100) {
    return res.status(400).json({
      success: false,
      error: 'Limit must be between 1 and 100',
      code: 'INVALID_LIMIT'
    });
  }
  
  // Attach validated values to request
  req.pagination = { page, limit };
  next();
};

/**
 * Custom middleware for getting specific guard history (admin only)
 * Handles the specialized logic for admin viewing any guard's attendance history
 */
const getGuardHistory = async (req, res) => {
  try {
    // Extract guard ID from URL parameter
    const guardId = req.params.guard_id;
    const { page = 1, limit = 10, startDate, endDate } = req.query;
    
    console.log(`Admin ${req.user.email} requesting history for guard ${guardId}`);

    // Import models here to avoid circular dependency issues
    const { User, Attendance, PatrolLog } = require('../models');
    const { Op } = require('sequelize');

    // Verify the requested guard exists
    const guard = await User.findByPk(guardId);
    if (!guard) {
      return res.status(404).json({
        success: false,
        error: 'Guard not found',
        code: 'GUARD_NOT_FOUND'
      });
    }

    // Build database query filter
    const whereClause = { guard_id: guardId };
    
    // Add optional date range filtering
    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date[Op.gte] = startDate;
      if (endDate) whereClause.date[Op.lte] = endDate;
    }

    // Fetch attendance records with pagination and guard info
    const { count, rows: attendanceRecords } = await Attendance.findAndCountAll({
      where: whereClause,
      order: [['checkInTime', 'DESC']], // Most recent first
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      include: [{
        model: User,
        as: 'guard',
        attributes: ['name', 'badgeNumber']
      }]
    });

    // Get related patrol logs for checkpoint information
    const attendanceIds = attendanceRecords.map(a => a.id);
    const patrolLogs = await PatrolLog.findAll({
      where: {
        attendance_id: { [Op.in]: attendanceIds }
      }
    });

    // Create lookup map for efficient patrol log retrieval
    const patrolLogMap = {};
    patrolLogs.forEach(log => {
      patrolLogMap[log.attendance_id] = log;
    });

    // Format attendance data with checkpoint information
    const formattedHistory = attendanceRecords.map(attendance => {
      const patrolLog = patrolLogMap[attendance.id];
      let checkpointInfo = null;
      
      // Include checkpoint details if patrol log exists
      if (patrolLog) {
        checkpointInfo = {
          id: patrolLog.checkpoint_id,
          name: `Checkpoint ${patrolLog.checkpoint_id}`,
          location: `Location ${patrolLog.checkpoint_id}`
        };
      }

      return {
        id: attendance.id,
        guard_name: attendance.guard?.name || guard.name,
        badge_number: attendance.guard?.badgeNumber || guard.badgeNumber || 'N/A',
        shift_name: attendance.shift + ' Shift',
        date: attendance.date,
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        status: attendance.status,
        late_minutes: 0, // TODO: Calculate based on shift start time
        total_hours: attendance.total_hours,
        checkpoint: checkpointInfo,
        notes: attendance.notes
      };
    });

    // Return formatted history with guard context and pagination info
    res.status(200).json({
      success: true,
      data: formattedHistory,
      guard_info: {
        id: guard.id,
        name: guard.name,
        badge_number: guard.badgeNumber,
        email: guard.email
      },
      count,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
        total: count
      }
    });

  } catch (error) {
    console.error('Get guard history error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      details: error.message
    });
  }
};

// ==========================================
// PUBLIC/TEST ROUTES
// ==========================================

/**
 * Test route to verify attendance API is working
 * Returns system status and available endpoints
 * Useful for health checks and API documentation
 */
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Attendance routes are working!',
    timestamp: new Date(),
    version: '1.0.0',
    routes: {
      guard_routes: [
        'GET /status - Get current attendance status',
        'GET /history - Get attendance history with pagination',
        'POST /check-in - Check in with location (lat/lng required)',
        'POST /check-out - Check out with location (lat/lng required)'
      ],
      admin_routes: [
        'GET /active-guards - Get currently active guards',
        'POST /mark-absent - Auto mark absent guards for current shift',
        'POST /mark-off - Mark specific guard as off-duty',
        'GET /daily-report - Get comprehensive daily attendance report',
        'GET /guard/:guard_id/history - Get attendance history for specific guard'
      ]
    }
  });
});

/**
 * Health check endpoint
 * Simple endpoint to verify service is running
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// ==========================================
// GUARD ROUTES (Available to guards and admins)
// ==========================================

/**
 * Get current user's attendance status
 * Shows if guard is checked in, current shift, hours worked, etc.
 * Used by mobile app to display current status on dashboard
 */
router.get('/status', 
  auth, // Verify user is authenticated
  getCurrentStatus
);

/**
 * Get current user's attendance history
 * Paginated list of all attendance records for logged-in guard
 * Supports date filtering via query parameters
 */
router.get('/history', 
  auth, // Verify user is authenticated
  validatePagination, // Ensure valid pagination parameters
  getAttendanceHistory
);

/**
 * Guard check-in endpoint
 * Creates new attendance record with location validation
 * Optionally assigns guard to checkpoint if checkpoint_id provided
 */
router.post('/check-in', 
  auth, // Verify user is authenticated
  validateCheckIn, // Validate location data
  checkIn
);

/**
 * Guard check-out endpoint
 * Updates attendance record with check-out time and calculates total hours
 * Requires location validation for security
 */
router.post('/check-out', 
  auth, // Verify user is authenticated
  validateCheckOut, // Validate location data
  checkOut
);

// ==========================================
// ADMIN-ONLY ROUTES
// ==========================================

/**
 * Get all currently active guards
 * Returns guards who have checked in but not checked out today
 * Used for monitoring current workforce and shift management
 */
router.get('/active-guards', 
  auth, // Verify user is authenticated
  requireRole(['admin']), // Verify user has admin role
  getActiveGuards
);

/**
 * Auto mark guards as absent
 * Creates absent attendance records for guards who haven't checked in
 * Typically used at shift start to identify no-shows
 */
router.post('/mark-absent', 
  auth, // Verify user is authenticated
  requireRole(['admin']), // Verify user has admin role
  autoMarkAbsent
);

/**
 * Manually mark a specific guard as off-duty
 * Used for scheduled days off, sick leave, or other approved absences
 * Requires guard_id in request body
 */
router.post('/mark-off', 
  auth, // Verify user is authenticated
  requireRole(['admin']), // Verify user has admin role
  validateMarkOff, // Validate required guard_id
  markOff
);

/**
 * Get comprehensive daily attendance report
 * Shows attendance statistics broken down by shift and status
 * Supports date parameter to generate reports for specific dates
 */
router.get('/daily-report', 
  auth, // Verify user is authenticated
  requireRole(['admin']), // Verify user has admin role
  getDailyReport
);

/**
 * Get attendance history for any specific guard (admin view)
 * Allows admins to view detailed attendance history for any guard
 * Different from /history which only shows current user's records
 */
router.get('/guard/:guard_id/history', 
  auth, // Verify user is authenticated
  requireRole(['admin']), // Verify user has admin role
  validatePagination, // Ensure valid pagination
  getGuardHistory // Custom middleware for guard-specific history
);

// ==========================================
// LEGACY/ALTERNATIVE ROUTES
// (For backwards compatibility)
// ==========================================

/**
 * Alternative endpoint for active guards
 * Maintains backwards compatibility with existing mobile apps
 */
router.get('/active', 
  auth,
  requireRole(['admin']),
  getActiveGuards
);

/**
 * Alternative endpoint for daily report
 * Maintains backwards compatibility with existing admin dashboards
 */
router.get('/report/daily', 
  auth,
  requireRole(['admin']),
  getDailyReport
);

// ==========================================
// BULK OPERATIONS (Future enhancement endpoints)
// ==========================================

/**
 * Bulk check-in multiple guards (future feature)
 * Could be used for emergency situations or group deployments
 */
// router.post('/bulk-check-in',
//   auth,
//   requireRole(['admin']),
//   (req, res) => {
//     res.status(501).json({
//       success: false,
//       message: 'Bulk check-in feature not implemented yet',
//       code: 'NOT_IMPLEMENTED'
//     });
//   }
// );

/**
 * Export attendance data (future feature)
 * Could generate CSV/Excel reports for payroll or compliance
 */
// router.get('/export',
//   auth,
//   requireRole(['admin']),
//   (req, res) => {
//     res.status(501).json({
//       success: false,
//       message: 'Export feature not implemented yet',
//       code: 'NOT_IMPLEMENTED'
//     });
//   }
// );

// Export router for use in main app
module.exports = router;