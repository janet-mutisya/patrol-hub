// controllers/attendanceController.js - Fully Fixed Association Aliases

// Import required models and Sequelize operators
const { User, Attendance, PatrolLog, Checkpoint, Shift } = require('../models');
const { Op } = require('sequelize');
const axios = require('axios');

// ==========================================
// HELPER FUNCTIONS (unchanged)
// ==========================================

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
    
    return {
      place_name: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      address: {},
      formatted_address: `Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
    };
  } catch (error) {
    console.error('Reverse geocoding failed:', error.message);
    return {
      place_name: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      address: {},
      formatted_address: `Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      geocoding_error: error.message
    };
  }
};

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

const isWithinGeofence = (userLat, userLng, checkpointLat, checkpointLng, radius) => {
  const distance = calculateDistance(userLat, userLng, checkpointLat, checkpointLng);
  return distance <= radius;
};

const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

let shiftsCache = null;
let shiftsCacheExpiry = null;

const getShiftsFromCache = async () => {
  const now = Date.now();
  
  if (!shiftsCache || !shiftsCacheExpiry || now > shiftsCacheExpiry) {
    shiftsCache = await Shift.findAll({
      attributes: ['id', 'name', 'start_time', 'end_time']
    });
    shiftsCacheExpiry = now + (60 * 60 * 1000);
  }
  
  return shiftsCache;
};

const getCurrentShift = async () => {
  const hour = new Date().getHours();
  let shiftName;

  if (hour >= 6 && hour < 18) shiftName = 'Day';
  else shiftName = 'Night';

  const shifts = await getShiftsFromCache();
  const shift = shifts.find(s => s.name === shiftName);

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

const getTodayDateRange = () => {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  return { startOfDay, endOfDay };
};

const calculateHours = (checkInTime, checkOutTime) => {
  const diffMs = new Date(checkOutTime) - new Date(checkInTime);
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const totalHours = parseFloat((totalMinutes / 60).toFixed(2));
  return { totalHours, totalMinutes };
};

// ==========================================
// CONTROLLER FUNCTIONS - ALL ALIASES FIXED
// ==========================================

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

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates provided',
        code: 'INVALID_COORDINATES'
      });
    }

    const currentShift = await getCurrentShift();
    const now = new Date();
    const { startOfDay, endOfDay } = getTodayDateRange();

    const existingAttendance = await Attendance.findOne({
      where: {
        guard_id: guardId,
        shift_id: currentShift.id,
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

    const guard = await User.findByPk(guardId);
    if (!guard) {
      return res.status(404).json({
        success: false,
        error: 'Guard not found',
        code: 'GUARD_NOT_FOUND'
      });
    }

    const promises = [
      reverseGeocode(latitude, longitude)
    ];

    if (checkpoint_id) {
      promises.push(Checkpoint.findByPk(checkpoint_id));
    }

    const [locationInfo, checkpoint] = await Promise.all(promises);

    let locationValidationPassed = true;
    let distanceFromCheckpoint = null;
    
    if (checkpoint_id) {
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

    const attendance = await Attendance.create({
      guard_id: guardId,
      shift_id: currentShift.id,
      checkInTime: now,
      status: 'Present',
      date: getTodayDate(),
      check_in_lat: latitude,
      check_in_lng: longitude,
      place_name: locationInfo.place_name,
      formatted_address: locationInfo.formatted_address,
      geocoding_error: locationInfo.geocoding_error || null,
      checkpoint_id: checkpoint_id || null
    });

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
        shift: currentShift.name,
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

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates provided',
        code: 'INVALID_COORDINATES'
      });
    }

    const currentShift = await getCurrentShift();
    const now = new Date();
    const { startOfDay, endOfDay } = getTodayDateRange();

    const attendance = await Attendance.findOne({
      where: {
        guard_id: guardId,
        shift_id: currentShift.id,
        checkInTime: {
          [Op.between]: [startOfDay, endOfDay]
        },
        checkOutTime: null
      },
      include: [{
        model: Shift,
        as: 'shift', // ✅ FIXED: Using proper alias
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

    const guard = await User.findByPk(guardId);

    console.log('Getting checkout location info...');
    const checkoutLocationInfo = await reverseGeocode(latitude, longitude);
    console.log('Checkout location result:', checkoutLocationInfo);

    const { totalHours, totalMinutes } = calculateHours(attendance.checkInTime, now);

    await attendance.update({
      checkOutTime: now,
      total_hours: totalHours,
      total_minutes: totalMinutes,
      check_out_lat: latitude,
      check_out_lng: longitude,
      checkout_place_name: checkoutLocationInfo.place_name,
      checkout_formatted_address: checkoutLocationInfo.formatted_address,
      checkout_geocoding_error: checkoutLocationInfo.geocoding_error || null
    });

    console.log(`Guard ${guard?.name} checked out successfully at ${checkoutLocationInfo.place_name}`);

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

const getAllCheckins = async (req, res) => {
  try {
    const { page = 1, limit = 50, date, guard_id } = req.query;
    
    console.log(`Admin ${req.user.email} requesting all check-ins`);

    const whereClause = {};
    
    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);
      
      whereClause.checkInTime = {
        [Op.between]: [startOfDay, endOfDay]
      };
    }

    if (guard_id) {
      whereClause.guard_id = guard_id;
    }

    const { count, rows: attendanceRecords } = await Attendance.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'guard', // ✅ FIXED: Using proper alias
          attributes: ['id', 'name', 'email', 'badgeNumber']
        },
        {
          model: Shift,
          as: 'shift', // ✅ FIXED: Using proper alias
          attributes: ['name', 'start_time', 'end_time']
        }
      ],
      order: [['checkInTime', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    const formattedCheckins = attendanceRecords.map(attendance => ({
      id: attendance.id,
      guard_id: attendance.guard_id,
      guard_name: attendance.guard?.name || 'Unknown Guard',
      guard_email: attendance.guard?.email || 'N/A',
      badge_number: attendance.guard?.badgeNumber || 'N/A',
      check_in_time: attendance.checkInTime,
      check_out_time: attendance.checkOutTime,
      latitude: attendance.check_in_lat,
      longitude: attendance.check_in_lng,
      place_name: attendance.place_name,
      formatted_address: attendance.formatted_address,
      checkout_latitude: attendance.check_out_lat,
      checkout_longitude: attendance.check_out_lng,
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

const getCurrentStatus = async (req, res) => {
  try {
    const guardId = req.user.id;
    const today = getTodayDate();
    const { startOfDay, endOfDay } = getTodayDateRange();
    
    console.log(`Status request from user ${req.user.email}`);

    const attendance = await Attendance.findOne({
      where: {
        guard_id: guardId,
        checkInTime: {
          [Op.between]: [startOfDay, endOfDay]
        }
      },
      include: [
        {
          model: Shift,
          as: 'shift', // ✅ FIXED: Using proper alias
          attributes: ['name', 'start_time', 'end_time']
        },
        {
          model: Checkpoint,
          as: 'checkpoint', // ✅ FIXED: Using proper alias
          attributes: ['id', 'name', 'location', 'latitude', 'longitude'],
          required: false
        }
      ],
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

    let hoursWorkedToday = 0;
    if (attendance.checkInTime && !attendance.checkOutTime) {
      const { totalMinutes } = calculateHours(attendance.checkInTime, new Date());
      hoursWorkedToday = totalMinutes;
    } else if (attendance.total_minutes) {
      hoursWorkedToday = attendance.total_minutes;
    }

    const checkpointInfo = attendance.checkpoint;

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
            latitude: attendance.check_in_lat,
            longitude: attendance.check_in_lng,
            place_name: attendance.place_name,
            formatted_address: attendance.formatted_address
          },
          checkout: attendance.check_out_lat ? {
            latitude: attendance.check_out_lat,
            longitude: attendance.check_out_lng,
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

const getAttendanceHistory = async (req, res) => {
  try {
    const guardId = req.user.id;
    const { page = 1, limit = 10, startDate, endDate } = req.query;

    console.log(`History request from user ${req.user.email}, page: ${page}, limit: ${limit}`);

    const whereClause = { guard_id: guardId };

    if (startDate || endDate) {
      whereClause.checkInTime = {};
      if (startDate) whereClause.checkInTime[Op.gte] = new Date(startDate);
      if (endDate) whereClause.checkInTime[Op.lte] = new Date(endDate);
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const offset = (pageNum - 1) * limitNum;

    const { count, rows: attendanceRecords } = await Attendance.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'guard', // ✅ FIXED: Using proper alias
          attributes: ['name', 'badgeNumber']
        },
        {
          model: Shift,
          as: 'shift', // ✅ FIXED: Using proper alias
          attributes: ['name', 'start_time', 'end_time']
        }
      ],
      order: [['checkInTime', 'DESC']],
      limit: limitNum,
      offset
    });

    const formattedHistory = attendanceRecords.map((attendance) => ({
      id: attendance.id,
      guard_name: attendance.guard?.name || 'Unknown Guard',
      badge_number: attendance.guard?.badgeNumber || 'N/A',
      shift_name: attendance.shift?.name
        ? `${attendance.shift.name} Shift`
        : 'Unknown Shift',
      date: attendance.checkInTime,
      checkInTime: attendance.checkInTime,
      checkOutTime: attendance.checkOutTime,
      status: attendance.status,
      late_minutes: attendance.late_minutes || 0,
      total_hours: attendance.total_hours || 0,
      checkpoint: attendance.checkpoint_id
        ? `Checkpoint ${attendance.checkpoint_id}`
        : null,
      notes: attendance.notes,
      location: {
        checkin: {
          latitude: attendance.check_in_lat,
          longitude: attendance.check_in_lng,
          place_name: attendance.place_name,
          formatted_address: attendance.formatted_address,
        },
        checkout: attendance.check_out_lat
          ? {
              latitude: attendance.check_out_lat,
              longitude: attendance.check_out_lng,
              place_name: attendance.checkout_place_name,
              formatted_address: attendance.checkout_formatted_address,
            }
          : null,
      },
    }));

    res.status(200).json({
      success: true,
      data: formattedHistory,
      count,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum),
        total: count,
      },
    });
  } catch (error) {
    console.error("Get attendance history error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      code: "SERVER_ERROR",
      details: error.message,
    });
  }
};

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
          as: 'guard', // ✅ FIXED: Using proper alias
          attributes: ['id', 'name', 'email', 'badgeNumber']
        },
        {
          model: Shift,
          as: 'shift', // ✅ FIXED: Using proper alias
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
        coordinates: `${attendance.check_in_lat}, ${attendance.check_in_lng}`
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

const getDailyReport = async (req, res) => {
  try {
    console.log(`Daily report request from admin ${req.user.email}`);
    
    const reportDate = req.query.date || getTodayDate();
    const targetDate = new Date(reportDate);
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);

    const [attendanceStats] = await Attendance.findAll({
      attributes: [
        [Attendance.sequelize.fn('COUNT', Attendance.sequelize.col('id')), 'totalGuards'],
        [Attendance.sequelize.fn('SUM', 
          Attendance.sequelize.literal("CASE WHEN status = 'Present' THEN 1 ELSE 0 END")
        ), 'onTime'],
        [Attendance.sequelize.fn('SUM', 
          Attendance.sequelize.literal("CASE WHEN status = 'Late' THEN 1 ELSE 0 END")
        ), 'late'],
        [Attendance.sequelize.fn('SUM', 
          Attendance.sequelize.literal("CASE WHEN status = 'Absent' THEN 1 ELSE 0 END")
        ), 'absent']
      ],
      where: {
        checkInTime: {
          [Op.between]: [startOfDay, endOfDay]
        }
      },
      include: [{
        model: User,
        as: 'guard', // ✅ FIXED: Using proper alias
        attributes: [],
        where: { role: 'guard', status: 'active' }
      }],
      raw: true
    });

    const stats = {
      totalGuards: parseInt(attendanceStats.totalGuards) || 0,
      onTime: parseInt(attendanceStats.onTime) || 0,
      late: parseInt(attendanceStats.late) || 0,
      absent: parseInt(attendanceStats.absent) || 0,
      attendanceRate: 0
    };

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

const autoMarkAbsent = async (req, res) => {
  try {
    console.log(`Auto-mark absent request from admin ${req.user.email}`);
    
    const currentShift = await getCurrentShift();
    const today = getTodayDate();
    const { startOfDay, endOfDay } = getTodayDateRange();

    const allActiveGuards = await User.findAll({
      where: {
        role: 'guard',
        status: 'active'
      },
      attributes: ['id', 'name']
    });

    const guardsWithAttendance = await Attendance.findAll({
      where: {
        shift_id: currentShift.id,
        checkInTime: {
          [Op.between]: [startOfDay, endOfDay]
        }
      },
      attributes: ['guard_id'],
      raw: true
    });

    const attendedGuardIds = guardsWithAttendance.map(a => a.guard_id);
    const guardsWithoutAttendance = allActiveGuards.filter(
      guard => !attendedGuardIds.includes(guard.id)
    );

    const absentRecordsData = guardsWithoutAttendance.map(guard => ({
      guard_id: guard.id,
      shift_id: currentShift.id,
      status: 'Absent',
      date: today,
      checkInTime: null,
      checkOutTime: null
    }));

    const absentRecords = await Attendance.bulkCreate(absentRecordsData, {
      returning: true
    });

    const formattedAbsentRecords = absentRecords.map((record, index) => ({
      attendance_id: record.id,
      guard_name: guardsWithoutAttendance[index].name,
      guard_id: guardsWithoutAttendance[index].id
    }));

    res.json({
      success: true,
      message: `Marked ${formattedAbsentRecords.length} guards as absent for ${currentShift.name} shift`,
      data: {
        absent_count: formattedAbsentRecords.length,
        shift: currentShift.name,
        marked_at: new Date(),
        absent_guards: formattedAbsentRecords
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

const markOff = async (req, res) => {
  try {
    const { guard_id, reason } = req.body;
    
    console.log(`Mark off request from admin ${req.user.email} for guard ${guard_id}`);

    const { startOfDay, endOfDay } = getTodayDateRange();
    const now = new Date();

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

    const guard = await User.findByPk(guard_id);
    if (!guard) {
      return res.status(404).json({
        success: false,
        error: 'Guard not found',
        code: 'GUARD_NOT_FOUND'
      });
    }

    const { totalHours, totalMinutes } = calculateHours(attendance.checkInTime, now);

    await attendance.update({
      checkOutTime: now,
      total_hours: totalHours,
      total_minutes: totalMinutes,
      status: 'Off',
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

const bulkCheckIn = async (req, res) => {
  try {
    const { guards } = req.body;
    
    if (!Array.isArray(guards) || guards.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Guards array is required',
        code: 'MISSING_GUARDS'
      });
    }

    const currentShift = await getCurrentShift();
    const now = new Date();
    const { startOfDay, endOfDay } = getTodayDateRange();

    const guardIds = guards.map(g => g.guard_id);
    const existingAttendance = await Attendance.findAll({
      where: {
        guard_id: { [Op.in]: guardIds },
        shift_id: currentShift.id,
        checkInTime: {
          [Op.between]: [startOfDay, endOfDay]
        }
      },
      attributes: ['guard_id']
    });

    const alreadyCheckedInIds = existingAttendance.map(a => a.guard_id);
    const validGuards = guards.filter(guard => 
      !alreadyCheckedInIds.includes(guard.guard_id)
    );

    const attendanceData = validGuards.map(guardData => ({
      guard_id: guardData.guard_id,
      shift_id: currentShift.id,
      checkInTime: now,
      status: 'Present',
      date: getTodayDate(),
      check_in_lat: guardData.latitude,
      check_in_lng: guardData.longitude,
      checkpoint_id: guardData.checkpoint_id || null
    }));

    const createdAttendance = await Attendance.bulkCreate(attendanceData, {
      returning: true
    });

    res.json({
      success: true,
      message: `Bulk check-in completed for ${createdAttendance.length} guards`,
      data: {
        checked_in_count: createdAttendance.length,
        already_checked_in: guards.length - createdAttendance.length,
        attendance_records: createdAttendance.map(record => ({
          attendance_id: record.id,
          guard_id: record.guard_id,
          checkInTime: record.checkInTime
        }))
      }
    });

  } catch (error) {
    console.error('Bulk check-in error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      details: error.message
    });
  }
};

const getAttendanceSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateRange = {};
    
    if (startDate || endDate) {
      dateRange.checkInTime = {};
      if (startDate) dateRange.checkInTime[Op.gte] = new Date(startDate);
      if (endDate) dateRange.checkInTime[Op.lte] = new Date(endDate);
    } else {
      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateRange.checkInTime = { [Op.gte]: thirtyDaysAgo };
    }

    const summary = await Attendance.findAll({
      attributes: [
        [Attendance.sequelize.fn('DATE', Attendance.sequelize.col('checkInTime')), 'date'],
        [Attendance.sequelize.fn('COUNT', Attendance.sequelize.col('id')), 'total'],
        [Attendance.sequelize.fn('SUM', 
          Attendance.sequelize.literal("CASE WHEN status = 'Present' THEN 1 ELSE 0 END")
        ), 'present'],
        [Attendance.sequelize.fn('SUM', 
          Attendance.sequelize.literal("CASE WHEN status = 'Late' THEN 1 ELSE 0 END")
        ), 'late'],
        [Attendance.sequelize.fn('SUM', 
          Attendance.sequelize.literal("CASE WHEN status = 'Absent' THEN 1 ELSE 0 END")
        ), 'absent'],
        [Attendance.sequelize.fn('AVG', Attendance.sequelize.col('total_hours')), 'avgHours']
      ],
      where: dateRange,
      group: [Attendance.sequelize.fn('DATE', Attendance.sequelize.col('checkInTime'))],
      order: [[Attendance.sequelize.fn('DATE', Attendance.sequelize.col('checkInTime')), 'DESC']],
      raw: true
    });

    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        daily_summary: summary.map(day => ({
          date: day.date,
          total: parseInt(day.total),
          present: parseInt(day.present),
          late: parseInt(day.late),
          absent: parseInt(day.absent),
          avgHours: parseFloat(day.avgHours) || 0,
          attendance_rate: day.total > 0 ? 
            Math.round(((parseInt(day.present) + parseInt(day.late)) / parseInt(day.total)) * 100) : 0
        }))
      }
    });

  } catch (error) {
    console.error('Get attendance summary error:', error);
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
  markOff,
  bulkCheckIn,
  getAttendanceSummary
};