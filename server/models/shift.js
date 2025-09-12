// models/Shift.js
// Enhanced Shift Model with better database migration handling
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Shift = sequelize.define('Shift', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [2, 50]
      },
      comment: 'Shift name (e.g., "Day Shift", "Night Shift", "Morning Shift")'
    },
    start_time: {
      type: DataTypes.TIME,
      allowNull: false,
      validate: {
        is: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, // HH:MM:SS format
      },
      comment: 'Shift start time in HH:MM:SS format (e.g., "06:00:00")'
    },
    end_time: {
      type: DataTypes.TIME,
      allowNull: false,
      validate: {
        is: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, // HH:MM:SS format
      },
      comment: 'Shift end time in HH:MM:SS format (e.g., "18:00:00")'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      comment: 'Whether this shift is currently active'
    },
    break_duration: {
      type: DataTypes.INTEGER,
      defaultValue: 30,
      allowNull: false,
      validate: {
        min: 0,
        max: 240 // Max 4 hours break
      },
      comment: 'Break duration in minutes'
    },
    grace_period: {
      type: DataTypes.INTEGER,
      defaultValue: 15,
      allowNull: false,
      validate: {
        min: 0,
        max: 60
      },
      comment: 'Grace period for late arrival in minutes'
    },
    color_code: {
      type: DataTypes.STRING(7),
      allowNull: true,
      validate: {
        is: /^#[0-9A-Fa-f]{6}$/
      },
      comment: 'Hex color code for UI display (e.g., "#FF5733")'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 500]
      },
      comment: 'Optional description of the shift'
    },
    overtime_threshold: {
      type: DataTypes.INTEGER,
      defaultValue: 480, // 8 hours in minutes
      allowNull: false,
      validate: {
        min: 60,
        max: 1440
      },
      comment: 'Minutes after which overtime applies'
    },
    // Define timestamps manually to handle existing data better
    created_at: {
      type: DataTypes.DATE,
      allowNull: true, // Allow null for existing records
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true, // Allow null for existing records
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'shifts',
    timestamps: false, // Disable automatic timestamps since we define them manually
    
    indexes: [
      {
        unique: true,
        fields: ['name'],
        name: 'shifts_name_unique'
      },
      {
        fields: ['is_active'],
        name: 'shifts_is_active_idx'
      },
      {
        fields: ['start_time', 'end_time'],
        name: 'shifts_time_range_idx'
      }
    ],

    // Model-level validations
    validate: {
      timeFormat() {
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
        if (!timeRegex.test(this.start_time) || !timeRegex.test(this.end_time)) {
          throw new Error('Times must be in HH:MM:SS format');
        }
      }
    },

    // Add hooks to handle timestamps manually
    hooks: {
      beforeCreate: (shift, options) => {
        const now = new Date();
        if (!shift.created_at) shift.created_at = now;
        if (!shift.updated_at) shift.updated_at = now;
      },
      beforeUpdate: (shift, options) => {
        shift.updated_at = new Date();
      }
    }
  });

  // All your existing methods remain the same...
  Shift.prototype.crossesMidnight = function() {
    const startTime = this.start_time;
    const endTime = this.end_time;
    
    const startNumeric = startTime.replace(/:/g, '');
    const endNumeric = endTime.replace(/:/g, '');
    
    return parseInt(endNumeric) < parseInt(startNumeric);
  };

  Shift.prototype.getDurationMinutes = function() {
    const [startHour, startMin] = this.start_time.split(':').map(Number);
    const [endHour, endMin] = this.end_time.split(':').map(Number);
    
    let startTotalMinutes = startHour * 60 + startMin;
    let endTotalMinutes = endHour * 60 + endMin;
    
    if (this.crossesMidnight()) {
      endTotalMinutes += 24 * 60;
    }
    
    return endTotalMinutes - startTotalMinutes;
  };

  Shift.prototype.getScheduledCheckInTime = function(date) {
    const shiftDate = new Date(date);
    const [hour, minute, second] = this.start_time.split(':').map(Number);
    
    shiftDate.setHours(hour, minute, second || 0, 0);
    return shiftDate;
  };

  Shift.prototype.getScheduledCheckOutTime = function(date) {
    const shiftDate = new Date(date);
    const [hour, minute, second] = this.end_time.split(':').map(Number);
    
    shiftDate.setHours(hour, minute, second || 0, 0);
    
    if (this.crossesMidnight()) {
      shiftDate.setDate(shiftDate.getDate() + 1);
    }
    
    return shiftDate;
  };

  Shift.prototype.isActiveNow = function(currentTime = new Date()) {
    const now = currentTime;
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    
    const [startHour, startMin] = this.start_time.split(':').map(Number);
    const [endHour, endMin] = this.end_time.split(':').map(Number);
    
    const startTotalMinutes = startHour * 60 + startMin;
    let endTotalMinutes = endHour * 60 + endMin;
    
    if (this.crossesMidnight()) {
      return currentTotalMinutes >= startTotalMinutes || currentTotalMinutes <= endTotalMinutes;
    } else {
      return currentTotalMinutes >= startTotalMinutes && currentTotalMinutes <= endTotalMinutes;
    }
  };

  Shift.prototype.getGuardStatus = async function(guardId, date) {
    const attendance = await sequelize.models.Attendance.findOne({
      where: {
        guard_id: guardId,
        shift_id: this.id,
        date: date
      }
    });

    return attendance ? attendance.status : 'Absent';
  };

  Shift.prototype.calculateOvertime = function(workedMinutes) {
    if (workedMinutes <= this.overtime_threshold) {
      return 0;
    }
    return workedMinutes - this.overtime_threshold;
  };

  Shift.prototype.isCheckInLate = function(checkInTime, shiftDate, gracePeriod = null) {
    const graceMinutes = gracePeriod || this.grace_period;
    const scheduledCheckIn = this.getScheduledCheckInTime(shiftDate);
    const graceTime = new Date(scheduledCheckIn.getTime() + (graceMinutes * 60 * 1000));
    
    return new Date(checkInTime) > graceTime;
  };

  // Static methods
  Shift.findActive = function() {
    return this.findAll({
      where: { is_active: true },
      order: [['start_time', 'ASC']]
    });
  };

  Shift.findByName = function(name) {
    return this.findOne({
      where: { name: name }
    });
  };

  Shift.getCurrentShift = function(currentTime = new Date()) {
    return this.findAll({
      where: { is_active: true }
    }).then(shifts => {
      return shifts.find(shift => shift.isActiveNow(currentTime)) || null;
    });
  };

  Shift.createDefaultShifts = async function() {
    const defaultShifts = [
      {
        name: 'Day Shift',
        start_time: '06:00:00',
        end_time: '18:00:00',
        color_code: '#FFA500',
        description: 'Standard day shift (6 AM to 6 PM)'
      },
      {
        name: 'Night Shift',
        start_time: '18:00:00',
        end_time: '06:00:00',
        color_code: '#191970',
        description: 'Night shift with midnight crossover (6 PM to 6 AM)'
      }
    ];

    const createdShifts = [];
    for (const shiftData of defaultShifts) {
      try {
        const existingShift = await this.findByName(shiftData.name);
        if (!existingShift) {
          const shift = await this.create(shiftData);
          createdShifts.push(shift);
        }
      } catch (error) {
        console.error(`Error creating shift ${shiftData.name}:`, error.message);
      }
    }

    return createdShifts;
  };

  Shift.getAttendanceStats = function(shiftId, startDate, endDate) {
    return sequelize.models.Attendance.findAll({
      where: {
        shift_id: shiftId,
        date: {
          [sequelize.Sequelize.Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status']
    });
  };

  Shift.associate = (models) => {
    Shift.hasMany(models.Attendance, { 
      foreignKey: 'shift_id', 
      as: 'attendanceRecords' 
    });
  };

  return Shift;
};