// controllers/attendanceController.js - Fixed version with correct column names

// Import required models and Sequelize operators
const { User, Attendance, PatrolLog, Checkpoint, Shift } = require('../models');
const { Op } = require('sequelize');
const axios = require('axios');

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Reverse geocode coordinates to get place name using OpenStreetMap Nominatim
 */
const reverseGeocode = async (latitude, longitude) => {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        format: 'json',
        lat: latitude,
        lon: longitude,
        zoom: 18,
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'SecurityGuardApp/1.0'
      },
      timeout: 10000
    });

    if (response.data && response.data.display_name) {
      return {
        place_name: response.data.display_name,
        address: response.data.address || {},
        formatted_address: response.data.display_name
      };
    }
    
    // Fallback if no display_name
    return {
      place_name: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      address: {},
      formatted_address: `Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
    };
  } catch (error) {
    console.error('Reverse geocoding failed:', error.message);
    // Return coordinates as fallback
    return {
      place_name: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      address: {},
      formatted_address: `Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      geocoding_error: error.message
    };
  }
};

/**
 * Calculate distance between two coordinates using Haversine formula
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
 */
const isWithinGeofence = (userLat, userLng, checkpointLat, checkpointLng, radius) => {
  const distance = calculateDistance(userLat, userLng, checkpointLat, checkpointLng);
  return distance <= radius;
};

/**
 * Get today's date in YYYY-MM-DD format
 */
const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Determine current shift based on time of day and get shift ID
 */
const getCurrentShift = async () => {
  const hour = new Date().getHours();
  let shiftName;

  if (hour >= 6 && hour < 18) shiftName = 'Day';   // 6:00 AM - 5:59 PM
  else shiftName = 'Night';                        // 6:00 PM - 5:59 AM

  const shift = await Shift.findOne({ where: { name: shiftName } });

  if (!shift) {
    throw new Error(`Shift '${shiftName}' not found in database`);
  }

  return {
    id: shift.id,
    name: shift.name,
    start_time: shift.start_time,
    end_time: shift.end_time
  };
};



/**
 * Get start and end timestamps for today
 */
const getTodayDateRange = () => {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  return { startOfDay, endOfDay };
};

/**
 * Calculate total hours and minutes between check-in and check-out times
 */
const calculateHours = (checkInTime, checkOutTime) => {
  const diffMs = new Date(checkOutTime) - new Date(checkInTime);
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const totalHours = parseFloat((totalMinutes / 60).toFixed(2));
  return { totalHours, totalMinutes };
};

// ==========================================
// MAIN CONTROLLER FUNCTIONS
// ==========================================

/**
 * GUARD CHECK-IN ENDPOINT - Fixed with correct shift_id
 */
const checkIn = async (req, res) => {
  try {
    const { latitude, longitude, checkpoint_id } = req.body;
    const guardId = req.user.id;
    
    console.log(`Check-in attempt from user ${req.user.email}:`, { latitude, longitude, checkpoint_id });

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

    // Verify guard exists
    const guard = await User.findByPk(guardId);
    if (!guard) {
      return res.status(404).json({
        success: false,
        error: 'Guard not found',
        code: 'GUARD_NOT_FOUND'
      });
    }

    // Get current shift information
    const currentShift = await getCurrentShift();
    const now = new Date();
    const { startOfDay, endOfDay } = getTodayDateRange();

    // Check if guard already checked in today for this shift
    const existingAttendance = await Attendance.findOne({
      where: {
        guard_id: guardId,
        shift_id: currentShift.id,  // ✅ Fixed: Use shift_id instead of shift
        checkInTime: {
          [Op.between]: [startOfDay, endOfDay]
        }
      }
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        error: 'Already checked in for this shift today',
        code: 'ALREADY_CHECKED_IN',
        data: {
          existing_checkin_time: existingAttendance.checkInTime,
          existing_place_name: existingAttendance.place_name
        }
      });
    }

    // Get place name using reverse geocoding
    console.log('Starting reverse geocoding...');
    const locationInfo = await reverseGeocode(latitude, longitude);
    console.log('Reverse geocoding result:', locationInfo);

    // Handle checkpoint validation if provided
    let checkpoint = null;
    let locationValidationPassed = true;
    let distanceFromCheckpoint = null;
    
    if (checkpoint_id) {
      checkpoint = await Checkpoint.findByPk(checkpoint_id);
      
      if (!checkpoint) {
        return res.status(404).json({
          success: false,
          error: 'Checkpoint not found',
          code: 'CHECKPOINT_NOT_FOUND'
        });
      }

      distanceFromCheckpoint = calculateDistance(
        latitude, longitude,
        checkpoint.latitude, checkpoint.longitude
      );

      const geofenceRadius = checkpoint.radius || 100;
      locationValidationPassed = isWithinGeofence(
        latitude, longitude,
        checkpoint.latitude, checkpoint.longitude,
        geofenceRadius
      );

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
    }

    // Create attendance record with location information
    const attendance = await Attendance.create({
      guard_id: guardId,
      shift_id: currentShift.id,  // ✅ Fixed: Use shift_id instead of shift
      checkInTime: now,
      status: 'Present',
      date: getTodayDate(),
      latitude: latitude,
      longitude: longitude,
      place_name: locationInfo.place_name,
      formatted_address: locationInfo.formatted_address,
      geocoding_error: locationInfo.geocoding_error || null,
      checkpoint_id: checkpoint_id || null
    });

    // Create patrol log if checkpoint assigned
    let patrolLog = null;
    let checkpointInfo = null;
    
    if (checkpoint_id && checkpoint) {
      patrolLog = await PatrolLog.create({
        guard_id: guardId,
        checkpoint_id: checkpoint_id,
        timestamp: now,
        attendance_id: attendance.id,
        latitude: latitude,
        longitude: longitude,
        distance_from_checkpoint: Math.round(distanceFromCheckpoint || 0)
      });

      checkpointInfo = {
        id: checkpoint.id,
        name: checkpoint.name,
        location: checkpoint.location || `${checkpoint.latitude}, ${checkpoint.longitude}`,
        radius: checkpoint.radius || 100,
        patrol_log_id: patrolLog.id,
        distance_from_checkpoint: Math.round(distanceFromCheckpoint || 0),
        location_validation_passed: locationValidationPassed
      };
    }

    console.log(`Guard ${guard.name} checked in successfully at ${locationInfo.place_name}`);

    res.status(200).json({
      success: true,
      message: 'Checked in successfully',
      data: {
        attendance_id: attendance.id,
        status: attendance.status,
        shift: currentShift.name,  // Return shift name for display
        checkInTime: attendance.checkInTime,
        location: {
          latitude: latitude,
          longitude: longitude,
          place_name: locationInfo.place_name,
          formatted_address: locationInfo.formatted_address
        },
        late_minutes: 0,
        checkpoint: checkpointInfo,
        location_validation_passed: locationValidationPassed
      }
    });

  } catch (error) {
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
 * GUARD CHECK-OUT ENDPOINT - Fixed with correct shift_id
 */
const checkOut = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const guardId = req.user.id;
    
    console.log(`Check-out attempt from user ${req.user.email}`);

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

    const guard = await User.findByPk(guardId);
    if (!guard) {
      return res.status(404).json({
        success: false,
        error: 'Guard not found',
        code: 'GUARD_NOT_FOUND'
      });
    }

    // Get current shift information
    const currentShift = await getCurrentShift();
    const now = new Date();
    const { startOfDay, endOfDay } = getTodayDateRange();

    // Find attendance record to update
    const attendance = await Attendance.findOne({
      where: {
        guard_id: guardId,
        shift_id: currentShift.id,  // ✅ Fixed: Use shift_id instead of shift
        checkInTime: {
          [Op.between]: [startOfDay, endOfDay]
        },
        checkOutTime: null
      },
      include: [{
        model: Shift,
        as: 'shift',
        attributes: ['name', 'start_time', 'end_time']
      }]
    });

    if (!attendance) {
      return res.status(400).json({
        success: false,
        error: 'No check-in record found for today',
        code: 'NOT_CHECKED_IN'
      });
    }

    // Get place name for check-out location
    console.log('Getting checkout location info...');
    const checkoutLocationInfo = await reverseGeocode(latitude, longitude);
    console.log('Checkout location result:', checkoutLocationInfo);

    // Calculate hours worked
    const { totalHours, totalMinutes } = calculateHours(attendance.checkInTime, now);

    // Update attendance record
    await attendance.update({
      checkOutTime: now,
      total_hours: totalHours,
      total_minutes: totalMinutes,
      checkout_latitude: latitude,
      checkout_longitude: longitude,
      checkout_place_name: checkoutLocationInfo.place_name,
      checkout_formatted_address: checkoutLocationInfo.formatted_address,
      checkout_geocoding_error: checkoutLocationInfo.geocoding_error || null
    });

    console.log(`Guard ${guard.name} checked out successfully at ${checkoutLocationInfo.place_name}`);

    res.status(200).json({
      success: true,
      message: 'Checked out successfully',
      data: {
        attendance_id: attendance.id,
        checkOutTime: now,
        total_hours: totalHours,
        total_minutes: totalMinutes,
        checkout_location: {
          latitude: latitude,
          longitude: longitude,
          place_name: checkoutLocationInfo.place_name,
          formatted_address: checkoutLocationInfo.formatted_address
        },
        early_checkout_minutes: 0
      }
    });

  } catch (error) {
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
 * GET ALL GUARD CHECK-INS (Admin Only) - Fixed with proper associations
 */
const getAllCheckins = async (req, res) => {
  try {
    const { page = 1, limit = 50, date, guard_id } = req.query;
    
    console.log(`Admin ${req.user.email} requesting all check-ins`);

    // Build where clause
    const whereClause = {};
    
    // Filter by date if provided
    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);
      
      whereClause.checkInTime = {
        [Op.between]: [startOfDay, endOfDay]
      };
    }

    // Filter by guard if provided
    if (guard_id) {
      whereClause.guard_id = guard_id;
    }

    // Get attendance records with guard and shift information
    const { count, rows: attendanceRecords } = await Attendance.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'guard',
          attributes: ['id', 'name', 'email', 'badgeNumber']
        },
        {
          model: Shift,
          as: 'shift',
          attributes: ['name', 'start_time', 'end_time']
        }
      ],
      order: [['checkInTime', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    // Format the response data
    const formattedCheckins = attendanceRecords.map(attendance => ({
      id: attendance.id,
      guard_id: attendance.guard_id,
      guard_name: attendance.guard?.name || 'Unknown Guard',
      guard_email: attendance.guard?.email || 'N/A',
      badge_number: attendance.guard?.badgeNumber || 'N/A',
      check_in_time: attendance.checkInTime,
      check_out_time: attendance.checkOutTime,
      latitude: attendance.latitude,
      longitude: attendance.longitude,
      place_name: attendance.place_name,
      formatted_address: attendance.formatted_address,
      checkout_latitude: attendance.checkout_latitude,
      checkout_longitude: attendance.checkout_longitude,
      checkout_place_name: attendance.checkout_place_name,
      checkout_formatted_address: attendance.checkout_formatted_address,
      shift: attendance.shift?.name || 'Unknown Shift',
      status: attendance.status,
      total_hours: attendance.total_hours,
      date: attendance.date
    }));

    res.status(200).json({
      success: true,
      data: formattedCheckins,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit))
      },
      message: `Found ${count} check-in records`
    });

  } catch (error) {
    console.error('Get all check-ins error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      details: error.message
    });
  }
};

/**
 * GET CURRENT GUARD STATUS - Fixed with proper associations
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

    // Find today's attendance record with shift information
    const attendance = await Attendance.findOne({
      where: {
        guard_id: guardId,
        checkInTime: {
          [Op.between]: [startOfDay, endOfDay]
        }
      },
      include: [{
        model: Shift,
        as: 'shift',
        attributes: ['name', 'start_time', 'end_time']
      }],
      order: [['checkInTime', 'DESC']]
    });

    if (!attendance) {
      const currentShift = await getCurrentShift();
      return res.status(200).json({
        success: true,
        data: {
          isCheckedIn: false,
          status: 'Not Checked In',
          currentShift: currentShift.name,
          date: today,
          checkInTime: null,
          checkOutTime: null,
          hoursWorkedToday: 0,
          checkpoint: null,
          location: null
        }
      });
    }

    // Get checkpoint info if exists
    let checkpointInfo = null;
    if (attendance.checkpoint_id) {
      try {
        const checkpoint = await Checkpoint.findByPk(attendance.checkpoint_id);
        if (checkpoint) {
          checkpointInfo = {
            id: checkpoint.id,
            name: checkpoint.name,
            location: checkpoint.location,
            latitude: checkpoint.latitude,
            longitude: checkpoint.longitude
          };
        }
      } catch (checkpointError) {
        console.log('Checkpoint lookup failed:', checkpointError.message);
      }
    }

    // Calculate current hours on duty
    let hoursWorkedToday = 0;
    if (attendance.checkInTime && !attendance.checkOutTime) {
      const { totalMinutes } = calculateHours(attendance.checkInTime, new Date());
      hoursWorkedToday = totalMinutes;
    } else if (attendance.total_minutes) {
      hoursWorkedToday = attendance.total_minutes;
    }

    res.status(200).json({
      success: true,
      data: {
        isCheckedIn: !attendance.checkOutTime,
        status: attendance.status,
        currentShift: attendance.shift?.name || 'Unknown',
        date: attendance.date,
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        hoursWorkedToday: hoursWorkedToday,
        checkpoint: checkpointInfo?.name || null,
        checkpointCoordinates: checkpointInfo ? {
          latitude: checkpointInfo.latitude,
          longitude: checkpointInfo.longitude
        } : null,
        location: {
          checkin: {
            latitude: attendance.latitude,
            longitude: attendance.longitude,
            place_name: attendance.place_name,
            formatted_address: attendance.formatted_address
          },
          checkout: attendance.checkout_latitude ? {
            latitude: attendance.checkout_latitude,
            longitude: attendance.checkout_longitude,
            place_name: attendance.checkout_place_name,
            formatted_address: attendance.checkout_formatted_address
          } : null
        }
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
 * GET ATTENDANCE HISTORY - Fixed with proper associations
 */
const getAttendanceHistory = async (req, res) => {
  try {
    const guardId = req.user.id;
    const { page = 1, limit = 10, startDate, endDate } = req.query;
    
    console.log(`History request from user ${req.user.email}, page: ${page}, limit: ${limit}`);

    // Verify guard exists
    const guard = await User.findByPk(guardId);
    if (!guard) {
      return res.status(404).json({
        success: false,
        error: 'Guard not found',
        code: 'GUARD_NOT_FOUND'
      });
    }

    // Build where clause
    const whereClause = { guard_id: guardId };
    
    // Add date filtering if provided
    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date[Op.gte] = startDate;
      if (endDate) whereClause.date[Op.lte] = endDate;
    }

    // Get attendance records with shift information
    const { count, rows: attendanceRecords } = await Attendance.findAndCountAll({
      where: whereClause,
      include: [{
        model: Shift,
        as: 'shift',
        attributes: ['name', 'start_time', 'end_time']
      }],
      order: [['checkInTime', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    // Format attendance records with location information
    const formattedHistory = attendanceRecords.map(attendance => ({
      id: attendance.id,
      guard_name: guard.name,
      badge_number: guard.badgeNumber || 'N/A',
      shift_name: attendance.shift?.name ? `${attendance.shift.name} Shift` : 'Unknown Shift',
      date: attendance.date,
      checkInTime: attendance.checkInTime,
      checkOutTime: attendance.checkOutTime,
      status: attendance.status,
      late_minutes: 0,
      total_hours: attendance.total_hours,
      checkpoint: attendance.checkpoint_id ? `Checkpoint ${attendance.checkpoint_id}` : null,
      notes: attendance.notes,
      location: {
        checkin: {
          latitude: attendance.latitude,
          longitude: attendance.longitude,
          place_name: attendance.place_name,
          formatted_address: attendance.formatted_address
        },
        checkout: attendance.checkout_latitude ? {
          latitude: attendance.checkout_latitude,
          longitude: attendance.checkout_longitude,
          place_name: attendance.checkout_place_name,
          formatted_address: attendance.checkout_formatted_address
        } : null
      }
    }));

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

/**
 * GET ACTIVE GUARDS - Fixed with proper associations
 */
const getActiveGuards = async (req, res) => {
  try {
    console.log(`Active guards request from admin ${req.user.email}`);
    
    const { startOfDay, endOfDay } = getTodayDateRange();

    const activeAttendance = await Attendance.findAll({
      where: {
        checkInTime: {
          [Op.between]: [startOfDay, endOfDay]
        },
        checkOutTime: null,
        status: 'Present'
      },
      include: [
        {
          model: User,
          as: 'guard',
          attributes: ['id', 'name', 'email', 'badgeNumber']
        },
        {
          model: Shift,
          as: 'shift',
          attributes: ['name', 'start_time', 'end_time']
        }
      ],
      order: [['checkInTime', 'ASC']]
    });

    const formattedGuards = activeAttendance.map(attendance => ({
      id: attendance.guard?.id || attendance.guard_id,
      name: attendance.guard?.name || 'Unknown Guard',
      status: attendance.status,
      checkpoint: attendance.checkpoint_id ? `Checkpoint ${attendance.checkpoint_id}` : 'Unassigned',
      shift: attendance.shift?.name || 'Unknown Shift',
      checkInTime: attendance.checkInTime,
      hoursOnDuty: calculateHours(attendance.checkInTime, new Date()).totalHours,
      location: {
        place_name: attendance.place_name,
        formatted_address: attendance.formatted_address,
        coordinates: `${attendance.latitude}, ${attendance.longitude}`
      }
    }));

    const summary = {
      checkedIn: formattedGuards.length,
      checkedOut: 0,
      late: 0,
      absent: 0,
      guards: formattedGuards
    };
    
    res.json({
      success: true,
      data: summary,
      message: `Found ${formattedGuards.length} active guards`
    });

  } catch (error) {
    console.error('Get active guards error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      details: error.message
    });
  }
};

/**
 * GET DAILY REPORT - Fixed with proper associations
 */
const getDailyReport = async (req, res) => {
  try {
    console.log(`Daily report request from admin ${req.user.email}`);
    
    const reportDate = req.query.date || getTodayDate();
    const targetDate = new Date(reportDate);
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);

    const attendanceRecords = await Attendance.findAll({
      where: {
        checkInTime: {
          [Op.between]: [startOfDay, endOfDay]
        }
      },
      include: [{
        model: Shift,
        as: 'shift',
        attributes: ['name', 'start_time', 'end_time']
      }],
      order: [['shift_id', 'ASC'], ['checkInTime', 'ASC']]  // ✅ Fixed: Order by shift_id
    });

    const stats = {
      totalGuards: attendanceRecords.length,
      onTime: 0,
      late: 0,
      absent: 0,
      attendanceRate: 0
    };

    attendanceRecords.forEach(record => {
      switch(record.status.toLowerCase()) {
        case 'present':
          stats.onTime++;
          break;
        case 'late':
          stats.late++;
          break;
        case 'absent':
          stats.absent++;
          break;
      }
    });

    if (stats.totalGuards > 0) {
      stats.attendanceRate = Math.round(((stats.onTime + stats.late) / stats.totalGuards) * 100);
    }
    
    res.json({
      success: true,
      data: {
        date: reportDate,
        totalGuards: stats.totalGuards,
        onTime: stats.onTime,
        late: stats.late,
        absent: stats.absent,
        attendanceRate: stats.attendanceRate
      }
    });

  } catch (error) {
    console.error('Get daily report error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      details: error.message
    });
  }
};

/**
 * AUTO-MARK ABSENT - Fixed with proper shift handling
 */
const autoMarkAbsent = async (req, res) => {
  try {
    console.log(`Auto-mark absent request from admin ${req.user.email}`);
    
    const currentShift = await getCurrentShift();
    const today = getTodayDate();
    const { startOfDay, endOfDay } = getTodayDateRange();

    const allGuards = await User.findAll({
      where: {
        role: 'guard',
        status: 'active'
      }
    });

    const guardsWithAttendance = await Attendance.findAll({
      where: {
        checkInTime: {
          [Op.between]: [startOfDay, endOfDay]
        },
        shift_id: currentShift.id  // ✅ Fixed: Use shift_id instead of shift
      },
      attributes: ['guard_id']
    });

    const guardIdsWithAttendance = guardsWithAttendance.map(a => a.guard_id);
    const guardsWithoutAttendance = allGuards.filter(
      guard => !guardIdsWithAttendance.includes(guard.id)
    );

    const absentRecords = [];
    for (const guard of guardsWithoutAttendance) {
      const absentRecord = await Attendance.create({
        guard_id: guard.id,
        shift_id: currentShift.id,  // ✅ Fixed: Use shift_id instead of shift
        status: 'Absent',
        date: today,
        checkInTime: null,
        checkOutTime: null
      });
      
      absentRecords.push({
        attendance_id: absentRecord.id,
        guard_name: guard.name,
        guard_id: guard.id
      });
    }

    res.json({
      success: true,
      message: `Marked ${absentRecords.length} guards as absent for ${currentShift.name} shift`,
      data: {
        absent_count: absentRecords.length,
        shift: currentShift.name,
        marked_at: new Date(),
        absent_guards: absentRecords
      }
    });

  } catch (error) {
    console.error('Auto-mark absent error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      details: error.message
    });
  }
};

/**
 * MANUALLY MARK A GUARD AS OFF-DUTY (Admin Only) - Fixed
 */
const markOff = async (req, res) => {
  try {
    const { guard_id, reason } = req.body;
    
    console.log(`Mark off request from admin ${req.user.email} for guard ${guard_id}`);

    // Verify guard exists
    const guard = await User.findByPk(guard_id);
    if (!guard) {
      return res.status(404).json({
        success: false,
        error: 'Guard not found',
        code: 'GUARD_NOT_FOUND'
      });
    }

    const { startOfDay, endOfDay } = getTodayDateRange();
    const now = new Date();

    // Find active attendance record for today
    const attendance = await Attendance.findOne({
      where: {
        guard_id: guard_id,
        checkInTime: {
          [Op.between]: [startOfDay, endOfDay]
        },
        checkOutTime: null
      }
    });

    if (!attendance) {
      return res.status(400).json({
        success: false,
        error: 'No active attendance record found for this guard today',
        code: 'NOT_CHECKED_IN'
      });
    }

    // Calculate hours worked
    const { totalHours, totalMinutes } = calculateHours(attendance.checkInTime, now);

    // Update attendance record to mark as off-duty
    await attendance.update({
      checkOutTime: now,
      total_hours: totalHours,
      total_minutes: totalMinutes,
      status: 'Off Duty',
      notes: reason || 'Marked off-duty by admin'
    });

    console.log(`Guard ${guard.name} marked as off-duty by admin ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Guard marked as off-duty successfully',
      data: {
        guard_id: guard_id,
        guard_name: guard.name,
        attendance_id: attendance.id,
        checkOutTime: now,
        total_hours: totalHours,
        reason: reason || 'Marked off-duty by admin',
        marked_by: req.user.email
      }
    });

  } catch (error) {
    console.error('Mark off error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      details: error.message
    });
  }
};

// ==========================================
// EXPORT CONTROLLER FUNCTIONS
// ==========================================

module.exports = {
  checkIn,
  checkOut,
  getAllCheckins,
  getCurrentStatus,
  getAttendanceHistory,
  getActiveGuards,
  getDailyReport,
  autoMarkAbsent,
  markOff
};