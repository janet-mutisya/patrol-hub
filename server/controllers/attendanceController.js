 // controllers/attendanceController.js - Enhanced version with real DB integration and detailed comments

// Import required models and Sequelize operators
const { User, Attendance, PatrolLog, Checkpoint } = require('../models');
const { Op } = require('sequelize');

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Distance in meters
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in meters
};

/**
 * Check if a location is within a geofence radius
 * @param {number} userLat - User's latitude
 * @param {number} userLng - User's longitude
 * @param {number} checkpointLat - Checkpoint's latitude
 * @param {number} checkpointLng - Checkpoint's longitude
 * @param {number} radius - Geofence radius in meters
 * @returns {boolean} True if within geofence, false otherwise
 */
const isWithinGeofence = (userLat, userLng, checkpointLat, checkpointLng, radius) => {
  const distance = calculateDistance(userLat, userLng, checkpointLat, checkpointLng);
  return distance <= radius;
};

/**
 * Get today's date in YYYY-MM-DD format
 * Used for date comparisons and record filtering
 * @returns {string} Today's date in ISO format (YYYY-MM-DD)
 */
const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Determine current shift based on time of day
 * Day: 6:00 AM - 2:00 PM (6-14)
 * Evening: 2:00 PM - 10:00 PM (14-22)
 * Night: 10:00 PM - 6:00 AM (22-6)
 * @returns {string} Current shift name ('Day', 'Evening', or 'Night')
 */
const getCurrentShift = () => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 14) return 'Day';
  if (hour >= 14 && hour < 22) return 'Evening';
  return 'Night';
};

/**
 * Get start and end timestamps for today
 * Used for database queries to filter records by current date
 * @returns {Object} Object with startOfDay and endOfDay Date objects
 */
const getTodayDateRange = () => {
  const today = new Date();
  // Start of day: 00:00:00.000
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  // End of day: 23:59:59.999 (actually start of next day)
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  return { startOfDay, endOfDay };
};

/**
 * Calculate total hours and minutes between check-in and check-out times
 * @param {Date} checkInTime - When guard checked in
 * @param {Date} checkOutTime - When guard checked out
 * @returns {Object} Object with totalHours (decimal) and totalMinutes (integer)
 */
const calculateHours = (checkInTime, checkOutTime) => {
  // Calculate difference in milliseconds
  const diffMs = new Date(checkOutTime) - new Date(checkInTime);
  
  // Convert to minutes (divide by 1000ms * 60s)
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  
  // Convert to hours with 2 decimal places (divide by 60 minutes)
  const totalHours = parseFloat((totalMinutes / 60).toFixed(2));
  
  return { totalHours, totalMinutes };
};

// ==========================================
// MAIN CONTROLLER FUNCTIONS
// ==========================================

/**
 * GUARD CHECK-IN ENDPOINT
 * Handles guard check-in with location validation and database storage
 * Creates attendance record and optional patrol log for checkpoint assignment
 */
const checkIn = async (req, res) => {
  try {
    // Extract request data
    const { latitude, longitude, checkpoint_id } = req.body;
    const guardId = req.user.id; // Get guard ID from JWT token
    
    console.log(`Check-in attempt from user ${req.user.email}:`, { latitude, longitude, checkpoint_id });

    // Validate required location data
    // Location is mandatory for security and tracking purposes
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required',
        code: 'MISSING_LOCATION'
      });
    }

    // Verify guard exists in database
    const guard = await User.findByPk(guardId);
    if (!guard) {
      return res.status(404).json({
        success: false,
        error: 'Guard not found',
        code: 'GUARD_NOT_FOUND'
      });
    }

    // Get current shift and time information
    const currentShift = getCurrentShift();
    const now = new Date();
    const { startOfDay, endOfDay } = getTodayDateRange();

    // Check if guard already checked in today for this shift
    // Prevents duplicate check-ins and ensures data integrity
    const existingAttendance = await Attendance.findOne({
      where: {
        guard_id: guardId,
        shift: currentShift,
        checkInTime: {
          [Op.between]: [startOfDay, endOfDay] // Today's date range
        }
      }
    });

    // Block duplicate check-ins
    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        error: 'Already checked in for this shift today',
        code: 'ALREADY_CHECKED_IN'
      });
    }

    // Enhanced geofencing validation with real implementation
    let checkpoint = null;
    let locationValidationPassed = true;
    let distanceFromCheckpoint = null;
    
    if (checkpoint_id) {
      // Fetch checkpoint from database
      checkpoint = await Checkpoint.findByPk(checkpoint_id);
      
      if (!checkpoint) {
        return res.status(404).json({
          success: false,
          error: 'Checkpoint not found',
          code: 'CHECKPOINT_NOT_FOUND'
        });
      }

      // Calculate distance from guard's location to checkpoint
      distanceFromCheckpoint = calculateDistance(
        latitude, longitude,
        checkpoint.latitude, checkpoint.longitude
      );

      // Validate geofence (use checkpoint's radius or default 100 meters)
      const geofenceRadius = checkpoint.radius || 100;
      locationValidationPassed = isWithinGeofence(
        latitude, longitude,
        checkpoint.latitude, checkpoint.longitude,
        geofenceRadius
      );

      // Block check-in if outside geofence
      if (!locationValidationPassed) {
        return res.status(400).json({
          success: false,
          error: 'Not within checkpoint area',
          code: 'OUTSIDE_GEOFENCE',
          details: {
            distance: Math.round(distanceFromCheckpoint),
            required_radius: geofenceRadius,
            checkpoint_name: checkpoint.name
          }
        });
      }

      console.log(`Geofence validation passed: ${distanceFromCheckpoint.toFixed(2)}m from checkpoint (radius: ${geofenceRadius}m)`);
    }

    // Create new attendance record in database
    const attendance = await Attendance.create({
      guard_id: guardId,
      shift: currentShift,
      checkInTime: now,
      status: 'Present', // Default status for successful check-in
      date: getTodayDate(),
      latitude: latitude, // Store guard's actual location
      longitude: longitude,
      checkpoint_id: checkpoint_id || null // Save checkpoint association
    });

    // Handle checkpoint assignment and patrol log creation
    let patrolLog = null;
    let checkpointInfo = null;
    
    if (checkpoint_id && checkpoint) {
      // Create patrol log entry linking guard to checkpoint
      patrolLog = await PatrolLog.create({
        guard_id: guardId,
        checkpoint_id: checkpoint_id,
        timestamp: now,
        attendance_id: attendance.id, // Link to attendance record
        latitude: latitude, // Store guard's actual location during patrol
        longitude: longitude,
        distance_from_checkpoint: Math.round(distanceFromCheckpoint)
      });

      // Format checkpoint information for response
      checkpointInfo = {
        id: checkpoint.id,
        name: checkpoint.name,
        location: checkpoint.location || `${checkpoint.latitude}, ${checkpoint.longitude}`,
        radius: checkpoint.radius || 100,
        patrol_log_id: patrolLog.id,
        distance_from_checkpoint: Math.round(distanceFromCheckpoint),
        location_validation_passed: locationValidationPassed
      };
    }

    // Log successful check-in
    console.log(`Guard ${guard.name} checked in successfully at ${now}${checkpoint ? ` at checkpoint ${checkpoint.name}` : ''}`);

    // Return success response with attendance data
    res.status(200).json({
      success: true,
      message: 'Checked in successfully',
      data: {
        attendance_id: attendance.id,
        status: attendance.status,
        shift: attendance.shift,
        checkInTime: attendance.checkInTime,
        location: {
          latitude: latitude,
          longitude: longitude
        },
        late_minutes: 0, // TODO: Calculate based on shift start time
        checkpoint: checkpointInfo,
        location_validation_passed: locationValidationPassed
      }
    });

  } catch (error) {
    // Handle any database or server errors
    console.error('Check-in error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      details: error.message
    });
  }
};

/**
 * GUARD CHECK-OUT ENDPOINT
 * Handles guard check-out with time calculation and database update
 * Updates existing attendance record with check-out time and total hours
 */
const checkOut = async (req, res) => {
  try {
    // Extract location data from request
    const { latitude, longitude } = req.body;
    const guardId = req.user.id;
    
    console.log(`Check-out attempt from user ${req.user.email}:`, { latitude, longitude });

    // Validate required location data
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required',
        code: 'MISSING_LOCATION'
      });
    }

    // Verify guard exists
    const guard = await User.findByPk(guardId);
    if (!guard) {
      return res.status(404).json({
        success: false,
        error: 'Guard not found',
        code: 'GUARD_NOT_FOUND'
      });
    }

    // Get current shift and time information
    const currentShift = getCurrentShift();
    const now = new Date();
    const { startOfDay, endOfDay } = getTodayDateRange();

    // Find today's attendance record for this shift that hasn't been checked out
    const attendance = await Attendance.findOne({
      where: {
        guard_id: guardId,
        shift: currentShift,
        checkInTime: {
          [Op.between]: [startOfDay, endOfDay] // Today's records only
        },
        checkOutTime: null // Only records without check-out time
      }
    });

    // Ensure guard has checked in before allowing check-out
    if (!attendance) {
      return res.status(400).json({
        success: false,
        error: 'No check-in record found for today',
        code: 'NOT_CHECKED_IN'
      });
    }

    // Calculate total time worked
    const { totalHours, totalMinutes } = calculateHours(attendance.checkInTime, now);

    // Update attendance record with check-out information
    await attendance.update({
      checkOutTime: now,
      total_hours: totalHours,
      total_minutes: totalMinutes,
      checkout_latitude: latitude, // Store check-out location
      checkout_longitude: longitude
    });

    // Log successful check-out
    console.log(`Guard ${guard.name} checked out successfully`);

    // Return success response with calculated time data
    res.status(200).json({
      success: true,
      message: 'Checked out successfully',
      data: {
        attendance_id: attendance.id,
        checkOutTime: now,
        total_hours: totalHours,
        total_minutes: totalMinutes,
        early_checkout_minutes: 0 // TODO: Calculate based on shift end time
      }
    });

  } catch (error) {
    // Handle errors
    console.error('Check-out error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      details: error.message
    });
  }
};

/**
 * GET CURRENT GUARD STATUS
 * Returns the current attendance status for the logged-in guard
 * Shows today's attendance record and any assigned checkpoint
 */
const getCurrentStatus = async (req, res) => {
  try {
    const guardId = req.user.id;
    const today = getTodayDate();
    const { startOfDay, endOfDay } = getTodayDateRange();
    
    console.log(`Status request from user ${req.user.email}`);

    // Verify guard exists
    const guard = await User.findByPk(guardId);
    if (!guard) {
      return res.status(404).json({
        success: false,
        error: 'Guard not found',
        code: 'GUARD_NOT_FOUND'
      });
    }

    // Find most recent attendance record for today
    const attendance = await Attendance.findOne({
      where: {
        guard_id: guardId,
        checkInTime: {
          [Op.between]: [startOfDay, endOfDay]
        }
      },
      order: [['checkInTime', 'DESC']] // Get most recent first
    });

    // If no attendance record found, guard hasn't checked in today
    if (!attendance) {
      return res.status(200).json({
        success: true,
        data: {
          status: 'Not Checked In',
          date: today,
          shift_name: getCurrentShift() + ' Shift',
          checkInTime: null,
          checkOutTime: null,
          current_hours_on_duty: '0',
          current_minutes_on_duty: 0
        }
      });
    }

    // Get checkpoint assignment from patrol log if exists
    const patrolLog = await PatrolLog.findOne({
      where: {
        guard_id: guardId,
        attendance_id: attendance.id
      },
      order: [['timestamp', 'DESC']] // Get most recent assignment
    });

    // Format checkpoint information if patrol log exists
    let checkpointInfo = null;
    if (patrolLog) {
      checkpointInfo = {
        id: patrolLog.checkpoint_id,
        name: `Checkpoint ${patrolLog.checkpoint_id}`,
        location: `Location ${patrolLog.checkpoint_id}`
      };
    }

    // Calculate current time on duty if still checked in
    let currentHours = '0';
    let currentMinutes = 0;
    
    if (attendance.checkInTime && !attendance.checkOutTime) {
      // Guard is currently on duty - calculate elapsed time
      const { totalHours, totalMinutes } = calculateHours(attendance.checkInTime, new Date());
      currentHours = totalHours.toString();
      currentMinutes = totalMinutes;
    }

    // Return current status information
    res.status(200).json({
      success: true,
      data: {
        attendance_id: attendance.id,
        status: attendance.status,
        shift_name: attendance.shift + ' Shift',
        date: attendance.date,
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        late_minutes: 0, // TODO: Calculate based on shift start time
        current_hours_on_duty: currentHours,
        current_minutes_on_duty: currentMinutes,
        checkpoint: checkpointInfo
      }
    });

  } catch (error) {
    console.error('Get current status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      details: error.message
    });
  }
};

/**
 * GET ATTENDANCE HISTORY
 * Returns paginated attendance history for the logged-in guard
 * Includes checkpoint assignments and supports date range filtering
 */
const getAttendanceHistory = async (req, res) => {
  try {
    const guardId = req.user.id;
    // Extract query parameters with defaults
    const { page = 1, limit = 10, startDate, endDate } = req.query;
    
    console.log(`History request from user ${req.user.email}`);

    // Verify guard exists
    const guard = await User.findByPk(guardId);
    if (!guard) {
      return res.status(404).json({
        success: false,
        error: 'Guard not found',
        code: 'GUARD_NOT_FOUND'
      });
    }

    // Build where clause for filtering
    const whereClause = { guard_id: guardId };
    
    // Add date range filtering if provided
    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date[Op.gte] = startDate; // Greater than or equal
      if (endDate) whereClause.date[Op.lte] = endDate; // Less than or equal
    }

    // Get attendance records with pagination and related guard info
    const { count, rows: attendanceRecords } = await Attendance.findAndCountAll({
      where: whereClause,
      order: [['checkInTime', 'DESC']], // Most recent first
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit), // Calculate offset for pagination
      include: [{
        model: User,
        as: 'guard', // Alias defined in model associations
        attributes: ['name', 'badgeNumber'] // Only include needed fields
      }]
    });

    // Get all patrol logs for these attendance records
    const attendanceIds = attendanceRecords.map(a => a.id);
    const patrolLogs = await PatrolLog.findAll({
      where: {
        attendance_id: { [Op.in]: attendanceIds } // Get logs for all attendance records
      }
    });

    // Create lookup map for efficient checkpoint assignment retrieval
    const patrolLogMap = {};
    patrolLogs.forEach(log => {
      patrolLogMap[log.attendance_id] = log;
    });

    // Format attendance records for response
    const formattedHistory = attendanceRecords.map(attendance => {
      const patrolLog = patrolLogMap[attendance.id];
      let checkpointInfo = null;
      
      // Add checkpoint information if patrol log exists
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

    // Return paginated history with metadata
    res.status(200).json({
      success: true,
      data: formattedHistory,
      count,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
        total: count
      }
    });

  } catch (error) {
    console.error('Get attendance history error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      details: error.message
    });
  }
};

// ==========================================
// ADMIN-ONLY FUNCTIONS
// ==========================================

/**
 * GET ACTIVE GUARDS (ADMIN ONLY)
 * Returns all guards who have checked in today but haven't checked out yet
 * Used for monitoring current workforce and shift management
 */
const getActiveGuards = async (req, res) => {
  try {
    console.log(`Active guards request from admin ${req.user.email}`);
    
    const { startOfDay, endOfDay } = getTodayDateRange();

    // Find all attendance records for today where guards haven't checked out
    const activeAttendance = await Attendance.findAll({
      where: {
        checkInTime: {
          [Op.between]: [startOfDay, endOfDay] // Today's records
        },
        checkOutTime: null, // Still on duty
        status: 'Present' // Only present guards
      },
      include: [{
        model: User,
        as: 'guard',
        attributes: ['id', 'name', 'email', 'badgeNumber'] // Guard information
      }],
      order: [['checkInTime', 'ASC']] // Earliest check-ins first
    });

    // Format active guards data with calculated time on duty
    const activeGuards = activeAttendance.map(attendance => ({
      attendance_id: attendance.id,
      guard: {
        id: attendance.guard.id,
        name: attendance.guard.name,
        email: attendance.guard.email,
        badge_number: attendance.guard.badgeNumber
      },
      shift: attendance.shift,
      checkInTime: attendance.checkInTime,
      // Calculate how long guard has been on duty
      hours_on_duty: calculateHours(attendance.checkInTime, new Date()).totalHours,
      status: attendance.status
    }));
    
    res.json({
      success: true,
      data: activeGuards,
      count: activeGuards.length,
      message: `Found ${activeGuards.length} active guards`
    });
  } catch (error) {
    console.error('Get active guards error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * AUTO MARK ABSENT (ADMIN ONLY)
 * Creates absent attendance records for guards who haven't checked in today
 * Typically run at start of each shift to identify no-shows
 */
const autoMarkAbsent = async (req, res) => {
  try {
    console.log(`Auto-mark absent request from admin ${req.user.email}`);
    
    const currentShift = getCurrentShift();
    const today = getTodayDate();
    const { startOfDay, endOfDay } = getTodayDateRange();

    // Get all active guards from user table
    // Assumes guards have role='guard' and status='active'
    const allGuards = await User.findAll({
      where: {
        role: 'guard', // Only guard users
        status: 'active' // Only active guards (not suspended/terminated)
      }
    });

    // Get guards who already have attendance records today for current shift
    const guardsWithAttendance = await Attendance.findAll({
      where: {
        checkInTime: {
          [Op.between]: [startOfDay, endOfDay]
        },
        shift: currentShift
      },
      attributes: ['guard_id'] // Only need guard IDs
    });

    // Create array of guard IDs that already have attendance
    const guardIdsWithAttendance = guardsWithAttendance.map(a => a.guard_id);

    // Filter out guards who already have attendance records
    const guardsWithoutAttendance = allGuards.filter(
      guard => !guardIdsWithAttendance.includes(guard.id)
    );

    // Create absent records for guards with no attendance
    const absentRecords = [];
    for (const guard of guardsWithoutAttendance) {
      const absentRecord = await Attendance.create({
        guard_id: guard.id,
        shift: currentShift,
        status: 'Absent', // Mark as absent
        date: today,
        checkInTime: null, // No check-in time for absent guards
        checkOutTime: null
      });
      
      // Add to response array
      absentRecords.push({
        attendance_id: absentRecord.id,
        guard: {
          id: guard.id,
          name: guard.name,
          badge_number: guard.badgeNumber
        }
      });
    }

    res.json({
      success: true,
      message: `Marked ${absentRecords.length} guards as absent for ${currentShift} shift`,
      data: {
        absent_count: absentRecords.length,
        shift: currentShift,
        marked_at: new Date(),
        absent_guards: absentRecords
      }
    });
  } catch (error) {
    console.error('Auto-mark absent error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * MARK GUARD AS OFF (ADMIN ONLY)
 * Manually marks a specific guard as off-duty for today
 * Used for scheduled days off, sick leave, or other approved absences
 */
const markOff = async (req, res) => {
  try {
    const { guard_id, reason } = req.body;
    console.log(`Mark off request from admin ${req.user.email}:`, req.body);
    
    // Validate required guard_id parameter
    if (!guard_id) {
      return res.status(400).json({
        success: false,
        error: 'Guard ID is required',
        code: 'MISSING_GUARD_ID'
      });
    }

    // Verify guard exists
    const guard = await User.findByPk(guard_id);
    if (!guard) {
      return res.status(404).json({
        success: false,
        error: 'Guard not found',
        code: 'GUARD_NOT_FOUND'
      });
    }

    const currentShift = getCurrentShift();
    const today = getTodayDate();
    const { startOfDay, endOfDay } = getTodayDateRange();

    // Check if guard already has an attendance record today
    let attendance = await Attendance.findOne({
      where: {
        guard_id: guard_id,
        checkInTime: {
          [Op.between]: [startOfDay, endOfDay]
        },
        shift: currentShift
      }
    });

    if (attendance) {
      // Update existing attendance record to 'Off' status
      await attendance.update({
        status: 'Off',
        notes: reason || 'Marked off by admin'
      });
    } else {
      // Create new 'Off' attendance record
      attendance = await Attendance.create({
        guard_id: guard_id,
        shift: currentShift,
        status: 'Off',
        date: today,
        checkInTime: null, // No check-in for off-duty guards
        checkOutTime: null,
        notes: reason || 'Marked off by admin'
      });
    }
    
    res.json({
      success: true,
      message: `Guard ${guard.name} marked as off-duty`,
      data: {
        attendance_id: attendance.id,
        guard_id: guard_id,
        status: 'Off',
        date: today,
        shift: currentShift,
        reason: reason
      }
    });
  } catch (error) {
    console.error('Mark off error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * GET DAILY REPORT (ADMIN ONLY)
 * Generates comprehensive daily attendance report with statistics
 * Shows attendance breakdown by shift and status (present, absent, off)
 */
const getDailyReport = async (req, res) => {
  try {
    console.log(`Daily report request from admin ${req.user.email}`);
    
    // Allow admin to specify date, default to today
    const reportDate = req.query.date || getTodayDate();
    
    // Parse the requested date to get proper date range
    const targetDate = new Date(reportDate);
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);

    // Get all attendance records for the specified date
    const attendanceRecords = await Attendance.findAll({
      where: {
        checkInTime: {
          [Op.between]: [startOfDay, endOfDay]
        }
      },
      include: [{
        model: User,
        as: 'guard',
        attributes: ['name', 'badgeNumber'] // Include guard information
      }],
      order: [['shift', 'ASC'], ['checkInTime', 'ASC']] // Group by shift, then chronological
    });

    // Initialize data structures for grouping
    const shifts = {};
    const totals = {
      present: 0,
      late: 0,
      absent: 0,
      off: 0,
      total: 0
    };

    // Process each attendance record
    attendanceRecords.forEach(record => {
      const shift = record.shift;
      const status = record.status.toLowerCase();

      // Initialize shift data structure if it doesn't exist
      if (!shifts[shift]) {
        shifts[shift] = {
          present: 0,
          late: 0,
          absent: 0,
          off: 0,
          total: 0,
          guards: [] // Array to hold guard details for this shift
        };
      }

      // Count attendance by status
      if (status === 'present') shifts[shift].present++;
      else if (status === 'absent') shifts[shift].absent++;
      else if (status === 'off') shifts[shift].off++;
      
      // Increment total count for shift
      shifts[shift].total++;
      
      // Add detailed guard information for the shift
      shifts[shift].guards.push({
        id: record.guard_id,
        name: record.guard?.name || 'Unknown',
        badge_number: record.guard?.badgeNumber || 'N/A',
        status: record.status,
        checkInTime: record.checkInTime,
        checkOutTime: record.checkOutTime,
        total_hours: record.total_hours || 0
      });

      // Update overall totals across all shifts
      if (status === 'present') totals.present++;
      else if (status === 'absent') totals.absent++;
      else if (status === 'off') totals.off++;
      totals.total++;
    });
    
    // Return comprehensive daily report
    res.json({
      success: true,
      data: {
        date: reportDate,
        shifts, // Breakdown by shift with guard details
        totals  // Overall statistics
      }
    });
  } catch (error) {
    console.error('Get daily report error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
};

// Export all controller functions for use in routes
module.exports = {
  checkIn,
  checkOut,
  getActiveGuards,
  autoMarkAbsent,
  markOff,
  getAttendanceHistory,
  getDailyReport,
  getCurrentStatus
};