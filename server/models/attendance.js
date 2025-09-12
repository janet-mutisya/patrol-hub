// models/Attendance.js
// Enhanced Attendance Model with proper field names and validation
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Attendance = sequelize.define('Attendance', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    guard_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'Foreign key to User (guard)'
    },
    shift_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'shifts',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT', // Don't allow shift deletion if attendance records exist
      comment: 'Foreign key to Shift'
    },
    // 📌 UPDATED: Proper field names as requested
    checkInTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'check_in_time', // Maps to snake_case in DB
      validate: {
        isDate: true
      },
      comment: 'Actual check-in timestamp'
    },
    checkOutTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'check_out_time', // Maps to snake_case in DB
      validate: {
        isDate: true,
        isAfterCheckIn(value) {
          if (value && this.checkInTime && new Date(value) <= new Date(this.checkInTime)) {
            throw new Error('Check-out time must be after check-in time');
          }
        }
      },
      comment: 'Actual check-out timestamp'
    },
    // 📌 UPDATED: Enhanced status field with all requested statuses
    status: {
      type: DataTypes.ENUM('Present', 'Late', 'Absent', 'Off'),
      allowNull: false,
      defaultValue: 'Absent', // Default to Absent until they check in
      validate: {
        isIn: {
          args: [['Present', 'Late', 'Absent', 'Off']],
          msg: 'Status must be Present, Late, Absent, or Off'
        }
      },
      comment: 'Attendance status for the shift'
    },
    // 📌 NEW: Checkpoint assignment tracking
    checkpoint_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'checkpoints',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Checkpoint where guard checked in'
    },
    // Location tracking for check-in validation
    check_in_lat: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: -90,
        max: 90,
        isFloat: true
      },
      comment: 'Latitude where guard checked in'
    },
    check_in_lng: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: -180,
        max: 180,
        isFloat: true
      },
      comment: 'Longitude where guard checked in'
    },
    check_out_lat: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: -90,
        max: 90,
        isFloat: true
      },
      comment: 'Latitude where guard checked out'
    },
    check_out_lng: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: -180,
        max: 180,
        isFloat: true
      },
      comment: 'Longitude where guard checked out'
    },
    // Date for the attendance record
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: true
      },
      comment: 'Date of the shift'
    },
    // 📌 NEW: Additional tracking fields
    scheduled_check_in: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Expected check-in time based on shift schedule'
    },
    scheduled_check_out: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Expected check-out time based on shift schedule'
    },
    late_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Minutes late for check-in'
    },
    early_checkout_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Minutes early for check-out'
    },
    // Notes for attendance issues
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 1000]
      },
      comment: 'Additional notes about attendance'
    },
    // Who approved/modified this record
    modified_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'User who last modified this record'
    }
  }, {
    tableName: 'attendance',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    
    // Composite indexes for performance
    indexes: [
      {
        unique: true,
        fields: ['guard_id', 'date', 'shift_id'],
        name: 'attendance_guard_date_shift_unique'
      },
      {
        fields: ['shift_id'],
        name: 'attendance_shift_id_idx'
      },
      {
        fields: ['status'],
        name: 'attendance_status_idx'
      },
      {
        fields: ['date'],
        name: 'attendance_date_idx'
      },
      {
        fields: ['checkpoint_id'],
        name: 'attendance_checkpoint_id_idx'
      },
      {
        fields: ['guard_id', 'status'],
        name: 'attendance_guard_status_idx'
      }
    ],

    // Model-level validations
    validate: {
      checkInBeforeCheckOut() {
        if (this.checkInTime && this.checkOutTime) {
          if (new Date(this.checkOutTime) <= new Date(this.checkInTime)) {
            throw new Error('Check-out time must be after check-in time');
          }
        }
      },
      statusConsistency() {
        // If checked in, status cannot be Absent
        if (this.checkInTime && this.status === 'Absent') {
          throw new Error('Cannot be marked Absent if check-in time is recorded');
        }
        // If status is Present or Late, must have check-in time
        if (['Present', 'Late'].includes(this.status) && !this.checkInTime) {
          throw new Error('Present or Late status requires check-in time');
        }
      },
      locationConsistency() {
        // If check-in time exists, location should exist too
        if (this.checkInTime && (!this.check_in_lat || !this.check_in_lng)) {
          throw new Error('Check-in location required when check-in time is recorded');
        }
      }
    }
  });

  // Instance methods
  Attendance.prototype.checkIn = async function(lat, lng, checkpointId = null) {
    const now = new Date();
    
    // Get shift details to calculate if late
    const shift = await sequelize.models.Shift.findByPk(this.shift_id);
    const scheduledCheckIn = shift.getScheduledCheckInTime(this.date);
    
    const lateMinutes = Math.max(0, Math.floor((now - scheduledCheckIn) / (1000 * 60)));
    
    const updates = {
      checkInTime: now,
      check_in_lat: lat,
      check_in_lng: lng,
      scheduled_check_in: scheduledCheckIn,
      late_minutes: lateMinutes,
      status: lateMinutes > 0 ? 'Late' : 'Present'
    };
    
    if (checkpointId) {
      updates.checkpoint_id = checkpointId;
    }
    
    return this.update(updates);
  };

  Attendance.prototype.checkOut = async function(lat, lng) {
    const now = new Date();
    
    // Get shift details to calculate if early checkout
    const shift = await sequelize.models.Shift.findByPk(this.shift_id);
    const scheduledCheckOut = shift.getScheduledCheckOutTime(this.date);
    
    const earlyMinutes = Math.max(0, Math.floor((scheduledCheckOut - now) / (1000 * 60)));
    
    return this.update({
      checkOutTime: now,
      check_out_lat: lat,
      check_out_lng: lng,
      scheduled_check_out: scheduledCheckOut,
      early_checkout_minutes: earlyMinutes
    });
  };

  Attendance.prototype.markAbsent = async function(modifiedBy = null) {
    return this.update({
      status: 'Absent',
      checkInTime: null,
      checkOutTime: null,
      check_in_lat: null,
      check_in_lng: null,
      check_out_lat: null,
      check_out_lng: null,
      modified_by: modifiedBy
    });
  };

  Attendance.prototype.markOff = async function(modifiedBy = null) {
    return this.update({
      status: 'Off',
      checkInTime: null,
      checkOutTime: null,
      check_in_lat: null,
      check_in_lng: null,
      check_out_lat: null,
      check_out_lng: null,
      modified_by: modifiedBy,
      notes: 'Marked as Off-duty'
    });
  };

  Attendance.prototype.getWorkDuration = function() {
    if (!this.checkInTime || !this.checkOutTime) {
      return null;
    }
    
    const duration = new Date(this.checkOutTime) - new Date(this.checkInTime);
    return Math.floor(duration / (1000 * 60)); // Duration in minutes
  };

  Attendance.prototype.isLate = function() {
    return this.status === 'Late' || this.late_minutes > 0;
  };

  Attendance.prototype.isPresent = function() {
    return ['Present', 'Late'].includes(this.status);
  };

  // Static methods
  Attendance.findByGuardAndDate = function(guardId, date) {
    return this.findAll({
      where: {
        guard_id: guardId,
        date: date
      },
      include: [
        { model: sequelize.models.Shift, as: 'shift' },
        { model: sequelize.models.Checkpoint, as: 'checkpoint' }
      ]
    });
  };

  Attendance.findByShiftAndDate = function(shiftId, date) {
    return this.findAll({
      where: {
        shift_id: shiftId,
        date: date
      },
      include: [
        { model: sequelize.models.User, as: 'guard' }
      ]
    });
  };

  Attendance.getAttendanceReport = function(startDate, endDate, guardId = null) {
    const where = {
      date: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      }
    };
    
    if (guardId) {
      where.guard_id = guardId;
    }
    
    return this.findAll({
      where,
      include: [
        { model: sequelize.models.User, as: 'guard', attributes: ['id', 'name', 'badgeNumber'] },
        { model: sequelize.models.Shift, as: 'shift' },
        { model: sequelize.models.Checkpoint, as: 'checkpoint', attributes: ['id', 'name', 'location'] }
      ],
      order: [['date', 'DESC'], ['shift_id', 'ASC']]
    });
  };

  // Associations will be defined in models/index.js
  Attendance.associate = (models) => {
    Attendance.belongsTo(models.User, { 
      foreignKey: 'guard_id', 
      as: 'guard' 
    });
    
    Attendance.belongsTo(models.Shift, { 
      foreignKey: 'shift_id', 
      as: 'shift' 
    });
    
    if (models.Checkpoint) {
      Attendance.belongsTo(models.Checkpoint, { 
        foreignKey: 'checkpoint_id', 
        as: 'checkpoint' 
      });
    }
    
    Attendance.belongsTo(models.User, { 
      foreignKey: 'modified_by', 
      as: 'modifier' 
    });
  };

  return Attendance;
};