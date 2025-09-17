// routes/attendanceRoutes.js - Enhanced version with new endpoints

const express = require('express');
const router = express.Router();

// Import controller functions
const {
  checkIn,
  checkOut,
  getAllCheckins,
  getActiveGuards,
  autoMarkAbsent,
  markOff,
  getAttendanceHistory,
  getDailyReport,
  getCurrentStatus
} = require('../controllers/attendanceController');

// Import middleware
const { auth, requireRole } = require('../middlewares/auth');

// ==========================================
// VALIDATION MIDDLEWARE
// ==========================================

const validateCheckIn = (req, res, next) => {
  const { latitude, longitude } = req.body;
  
  if (!latitude || !longitude) {
    return res.status(400).json({
      success: false,
      error: 'Latitude and longitude are required',
      code: 'MISSING_LOCATION'
    });
  }
  
  if (latitude < -90 || latitude > 90) {
    return res.status(400).json({
      success: false,
      error: 'Invalid latitude value. Must be between -90 and 90',
      code: 'INVALID_LATITUDE'
    });
  }
  
  if (longitude < -180 || longitude > 180) {
    return res.status(400).json({
      success: false,
      error: 'Invalid longitude value. Must be between -180 and 180',
      code: 'INVALID_LONGITUDE'
    });
  }
  
  next();
};

const validateCheckOut = (req, res, next) => {
  const { latitude, longitude } = req.body;
  
  if (!latitude || !longitude) {
    return res.status(400).json({
      success: false,
      error: 'Latitude and longitude are required',
      code: 'MISSING_LOCATION'
    });
  }
  
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return res.status(400).json({
      success: false,
      error: 'Invalid coordinates provided',
      code: 'INVALID_COORDINATES'
    });
  }
  
  next();
};

const validateMarkOff = (req, res, next) => {
  const { guard_id } = req.body;
  
  if (!guard_id) {
    return res.status(400).json({
      success: false,
      error: 'Guard ID is required',
      code: 'MISSING_GUARD_ID'
    });
  }
  
  next();
};

const validatePagination = (req, res, next) => {
  let { page, limit } = req.query;
  
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;
  
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
  
  req.pagination = { page, limit };
  next();
};

const validateDateQuery = (req, res, next) => {
  const { date } = req.query;
  
  if (date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        error: 'Date must be in YYYY-MM-DD format',
        code: 'INVALID_DATE_FORMAT'
      });
    }
    
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date provided',
        code: 'INVALID_DATE'
      });
    }
  }
  
  next();
};

/**
 * Get attendance history for specific guard (admin only) - Fixed version
 */
const getGuardHistory = async (req, res) => {
  try {
    const guardId = req.params.guard_id;
    const { page = 1, limit = 10, startDate, endDate } = req.query;
    
    console.log(`Admin ${req.user.email} requesting history for guard ${guardId}`);

    const { User, Attendance, Shift, Checkpoint } = require('../models');
    const { Op } = require('sequelize');

    // Verify guard exists
    const guard = await User.findByPk(guardId);
    if (!guard) {
      return res.status(404).json({
        success: false,
        error: 'Guard not found',
        code: 'GUARD_NOT_FOUND'
      });
    }

    // Build query
    const whereClause = { guard_id: guardId };
    
    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date[Op.gte] = startDate;
      if (endDate) whereClause.date[Op.lte] = endDate;
    }

    // Get attendance records
    const { count, rows: attendanceRecords } = await Attendance.findAndCountAll({
      where: whereClause,
      order: [['checkInTime', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      include: [
        { model: Shift, as: 'shift', attributes: ['id', 'name', 'start_time', 'end_time'] },
        { model: Checkpoint, as: 'checkpoint', attributes: ['id', 'name', 'location'] }
      ]
    });

    // Format the response using the guard we already fetched
    const formattedHistory = attendanceRecords.map(att => ({
      id: att.id,
      guard_name: guard.name,
      badge_number: guard.badgeNumber || 'N/A',
      shift: att.shift ? {
        id: att.shift.id,
        name: att.shift.name,
        start_time: att.shift.start_time,
        end_time: att.shift.end_time
      } : null,
      date: att.date,
      checkInTime: att.checkInTime,
      checkOutTime: att.checkOutTime,
      status: att.status,
      late_minutes: att.late_minutes,
      total_hours: att.total_hours,
      checkpoint: att.checkpoint ? {
        id: att.checkpoint.id,
        name: att.checkpoint.name,
        location: att.checkpoint.location
      } : null,
      notes: att.notes,
      location: {
        checkin: {
          latitude: att.check_in_lat,
          longitude: att.check_in_lng
        },
        checkout: att.check_out_lat ? {
          latitude: att.check_out_lat,
          longitude: att.check_out_lng
        } : null
      }
    }));

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

// Add this route to your attendanceRoutes.js for debugging
router.get('/debug-stats',
  auth,
  requireRole(['admin']),
  async (req, res) => {
    try {
      console.log('Debug stats route hit');
      
      // Test basic response
      res.json({
        success: true,
        message: 'Debug route working',
        user: req.user ? { id: req.user.id, email: req.user.email } : 'No user',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Debug stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Debug failed',
        details: error.message
      });
    }
  }
);

// Simplified stats route with better error handling
router.get('/stats-simple',
  auth,
  requireRole(['admin']),
  async (req, res) => {
    try {
      console.log('Simple stats route hit by user:', req.user?.email);
      
      // Try importing models
      let User, Attendance, Op;
      try {
        const models = require('../models');
        User = models.User;
        Attendance = models.Attendance;
        Op = require('sequelize').Op;
        console.log('Models imported successfully');
      } catch (importError) {
        console.error('Model import error:', importError);
        return res.status(500).json({
          success: false,
          error: 'Failed to import models',
          details: importError.message
        });
      }

      // Try basic queries one by one
      console.log('Testing User model...');
      const totalGuards = await User.count({ where: { role: 'guard' } });
      console.log('Total guards:', totalGuards);

      console.log('Testing Attendance model...');
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      
      const todayCheckins = await Attendance.count({
        where: { 
          checkInTime: { 
            [Op.between]: [todayStart, todayEnd] 
          } 
        }
      });
      console.log('Today checkins:', todayCheckins);

      res.json({
        success: true,
        stats: {
          total_guards: totalGuards || 0,
          active_guards: totalGuards || 0,
          checked_in_today: todayCheckins || 0,
          currently_on_duty: 0,
          attendance_rate: 0,
          duty_rate: 0
        },
        debug: {
          user_role: req.user?.role,
          models_available: !!User && !!Attendance,
          date_range: { todayStart, todayEnd }
        }
      });

    } catch (error) {
      console.error('Simple stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Simple stats failed',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

// ==========================================
// PUBLIC/TEST ROUTES FIRST
// ==========================================

router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Enhanced Attendance routes are working!',
    timestamp: new Date(),
    version: '2.0.0',
    features: ['Reverse Geocoding', 'Location-based Check-ins', 'Enhanced Admin Views'],
    routes: {
      guard_routes: [
        'GET /status - Get current attendance status with location info',
        'GET /history - Get attendance history with location details',
        'POST /check-in - Check in with location (lat/lng required, gets place name)',
        'POST /check-out - Check out with location (lat/lng required, gets place name)'
      ],
      admin_routes: [
        'GET /active-guards - Get currently active guards with locations',
        'GET /checkins - Get all guard check-ins with location details (NEW)',
        'POST /mark-absent - Auto mark absent guards for current shift',
        'POST /mark-off - Mark specific guard as off-duty',
        'GET /daily-report - Get comprehensive daily attendance report',
        'GET /guard/:guard_id/history - Get attendance history for specific guard'
      ]
    }
  });
});

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime(),
    version: '2.0.0'
  });
});

// ==========================================
// SYSTEM STATS ROUTE - MOVED TO TOP
// ==========================================

/**
 * Get system statistics
 */
router.get('/stats',
  auth,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const { User, Attendance } = require('../models');
      const { Op } = require('sequelize');
      
      const today = new Date();
      const dateString = today.toISOString().split('T')[0];
      const startOfDay = new Date(`${dateString}T00:00:00Z`);
      const endOfDay = new Date(`${dateString}T23:59:59Z`);

      // Run queries in parallel for performance
      const [totalGuards, totalActiveUsers, todayCheckins, activeGuards] = await Promise.all([
        User.count({ where: { role: 'guard' } }),
        User.count({ where: { role: 'guard', status: 'active' } }),
        Attendance.count({
          where: { checkInTime: { [Op.between]: [startOfDay, endOfDay] } }
        }),
        Attendance.count({
          where: {
            checkInTime: { [Op.between]: [startOfDay, endOfDay] },
            checkOutTime: null
          }
        })
      ]);

      res.json({
        success: true,
        date: dateString,
        stats: {
          total_guards: totalGuards,
          active_guards: totalActiveUsers,
          checked_in_today: todayCheckins,
          currently_on_duty: activeGuards,
          attendance_rate: totalActiveUsers > 0
            ? Math.round((todayCheckins / totalActiveUsers) * 100)
            : 0,
          duty_rate: totalActiveUsers > 0
            ? Math.round((activeGuards / totalActiveUsers) * 100)
            : 0
        },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Stats route error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch system stats',
        details: error.message
      });
    }
  }
);

// ==========================================
// OTHER SPECIFIC ROUTES (before parameterized)
// ==========================================

/**
 * Get current guard attendance status
 */
router.get('/status', 
  auth,
  getCurrentStatus
);

/**
 * Get guard's own attendance history with pagination
 */
router.get('/history', 
  auth,
  validatePagination,
  getAttendanceHistory
);

/**
 * Get all guard check-ins with location details (NEW MAIN ENDPOINT)
 * Query params: ?page=1&limit=50&date=YYYY-MM-DD&guard_id=123
 */
router.get('/checkins', 
  auth,
  requireRole(['admin']),
  validatePagination,
  validateDateQuery,
  getAllCheckins
);

/**
 * Get currently active guards with location info
 */
router.get('/active-guards', 
  auth,
  requireRole(['admin']),
  getActiveGuards
);

/**
 * Alternative endpoint for active guards
 */
router.get('/active', 
  auth,
  requireRole(['admin']),
  getActiveGuards
);

/**
 * Get comprehensive daily attendance report
 * Query params: ?date=YYYY-MM-DD (defaults to today)
 */
router.get('/daily-report', 
  auth,
  requireRole(['admin']),
  validateDateQuery,
  getDailyReport
);

/**
 * Alternative endpoint for daily report
 */
router.get('/report/daily', 
  auth,
  requireRole(['admin']),
  validateDateQuery,
  getDailyReport
);

/**
 * Export attendance report (CSV/Excel)
 * Query params: ?date=YYYY-MM-DD&format=csv|xlsx
 */
router.get('/export',
  auth,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const { Attendance, User } = require('../models');
      const { date = new Date().toISOString().split('T')[0], format = 'csv' } = req.query;

      const records = await Attendance.findAll({
        where: { date },
        include: [
          { model: User, as: 'guard', attributes: ['name', 'email', 'badgeNumber'] }
        ],
        order: [['checkInTime', 'ASC']]
      });

      // Convert to rows
      const rows = records.map(r => ({
        guard: r.guard?.name || 'Unknown',
        badge: r.guard?.badgeNumber || 'N/A',
        date: r.date,
        checkIn: r.checkInTime,
        checkOut: r.checkOutTime,
        status: r.status,
        totalHours: r.total_hours
      }));

      if (format === 'xlsx') {
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Attendance');

        sheet.columns = [
          { header: 'Guard', key: 'guard' },
          { header: 'Badge', key: 'badge' },
          { header: 'Date', key: 'date' },
          { header: 'Check In', key: 'checkIn' },
          { header: 'Check Out', key: 'checkOut' },
          { header: 'Status', key: 'status' },
          { header: 'Total Hours', key: 'totalHours' }
        ];

        sheet.addRows(rows);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=attendance-${date}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
      } else {
        // Default CSV
        const { Parser } = require('json2csv');
        const parser = new Parser();
        const csv = parser.parse(rows);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=attendance-${date}.csv`);
        res.send(csv);
      }
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({
        success: false,
        error: 'Export failed',
        details: error.message
      });
    }
  }
);

/**
 * Test reverse geocoding functionality
 */
router.get('/test-geocoding', 
  auth,
  requireRole(['admin']),
  async (req, res) => {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'lat and lng query parameters are required',
        example: '/api/attendance/test-geocoding?lat=-1.2921&lng=36.8219'
      });
    }

    try {
      const axios = require('axios');
      
      const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: {
          format: 'json',
          lat: parseFloat(lat),
          lon: parseFloat(lng),
          zoom: 18,
          addressdetails: 1
        },
        headers: {
          'User-Agent': 'SecurityGuardApp/1.0'
        },
        timeout: 10000
      });

      res.json({
        success: true,
        coordinates: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
        geocoding_result: response.data,
        formatted: {
          place_name: response.data.display_name || `${lat}, ${lng}`,
          address: response.data.address || {}
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Geocoding test failed',
        details: error.message
      });
    }
  }
);

// ==========================================
// POST ROUTES
// ==========================================

/**
 * Guard check-in with automatic location detection and reverse geocoding
 * Body: { latitude: number, longitude: number, checkpoint_id?: number }
 */
router.post('/check-in', 
  auth,
  validateCheckIn,
  checkIn
);

/**
 * Alternative check-in endpoint (same functionality)
 */
router.post('/checkin', 
  auth,
  validateCheckIn,
  checkIn
);

/**
 * Guard check-out with location
 * Body: { latitude: number, longitude: number }
 */
router.post('/check-out', 
  auth,
  validateCheckOut,
  checkOut
);

/**
 * Alternative check-out endpoint (same functionality)
 */
router.post('/checkout', 
  auth,
  validateCheckOut,
  checkOut
);

/**
 * Auto-mark absent guards for current shift
 */
router.post('/mark-absent', 
  auth,
  requireRole(['admin']),
  autoMarkAbsent
);

/**
 * Manually mark a specific guard as off-duty
 * Body: { guard_id: number, reason?: string }
 */
router.post('/mark-off', 
  auth,
  requireRole(['admin']),
  validateMarkOff,
  markOff
);

// ==========================================
// PARAMETERIZED ROUTES LAST
// ==========================================

/**
 * Get attendance history for any specific guard (admin view)
 * Path params: guard_id
 * Query params: ?page=1&limit=10&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
router.get('/guard/:guard_id/history', 
  auth,
  requireRole(['admin']),
  validatePagination,
  getGuardHistory
);

module.exports = router;