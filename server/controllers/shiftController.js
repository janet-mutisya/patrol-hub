// controllers/shiftController.js
const { Shift, Attendance, User } = require('../models');
const { Op } = require('sequelize');

const shiftController = {
  // GET /api/shifts - Get all shifts (with optional filtering)
  getAllShifts: async (req, res) => {
    try {
      const { active, include_stats } = req.query;
      
      const whereClause = {};
      if (active === 'true') {
        whereClause.is_active = true;
      }

      let options = {
        where: whereClause,
        order: [['start_time', 'ASC']],
      };

      // Include attendance stats if requested
      if (include_stats === 'true') {
        options.include = [
          {
            model: Attendance,
            as: 'attendanceRecords',
            attributes: ['status'],
            required: false
          }
        ];
      }

      const shifts = await Shift.findAll(options);
      
      console.log(`Retrieved ${shifts.length} shifts for user: ${req.user.email}`);
      
      res.status(200).json({
        success: true,
        data: shifts,
        count: shifts.length
      });

    } catch (error) {
      console.error('Error fetching shifts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch shifts',
        error: error.message
      });
    }
  },

  // GET /api/shifts/:id - Get single shift by ID
  getShiftById: async (req, res) => {
    try {
      const { id } = req.params;
      const { include_attendance } = req.query;

      let options = {
        where: { id }
      };

      if (include_attendance === 'true') {
        options.include = [
          {
            model: Attendance,
            as: 'attendanceRecords',
            include: [
              {
                model: User,
                attributes: ['id', 'firstName', 'lastName', 'email']
              }
            ]
          }
        ];
      }

      const shift = await Shift.findOne(options);

      if (!shift) {
        return res.status(404).json({
          success: false,
          message: 'Shift not found'
        });
      }

      // Add calculated properties
      const shiftData = {
        ...shift.toJSON(),
        crossesMidnight: shift.crossesMidnight(),
        durationMinutes: shift.getDurationMinutes(),
        isCurrentlyActive: shift.isActiveNow()
      };

      console.log(`Retrieved shift: ${shift.name} for user: ${req.user.email}`);
      
      res.status(200).json({
        success: true,
        data: shiftData
      });

    } catch (error) {
      console.error('Error fetching shift:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch shift',
        error: error.message
      });
    }
  },

  // POST /api/shifts - Create new shift (Admin only)
  createShift: async (req, res) => {
    try {
      const {
        name,
        start_time,
        end_time,
        is_active = true,
        break_duration = 30,
        grace_period = 15,
        color_code,
        description,
        overtime_threshold = 480
      } = req.body;

      // Validate required fields
      if (!name || !start_time || !end_time) {
        return res.status(400).json({
          success: false,
          message: 'Name, start_time, and end_time are required'
        });
      }

      // Check for duplicate name
      const existingShift = await Shift.findOne({ where: { name } });
      if (existingShift) {
        return res.status(409).json({
          success: false,
          message: 'Shift name already exists'
        });
      }

      const shift = await Shift.create({
        name,
        start_time,
        end_time,
        is_active,
        break_duration,
        grace_period,
        color_code,
        description,
        overtime_threshold
      });

      console.log(`Shift created: ${shift.name} by admin: ${req.user.email}`);

      res.status(201).json({
        success: true,
        message: 'Shift created successfully',
        data: {
          ...shift.toJSON(),
          crossesMidnight: shift.crossesMidnight(),
          durationMinutes: shift.getDurationMinutes()
        }
      });

    } catch (error) {
      console.error('Error creating shift:', error);
      
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

      res.status(500).json({
        success: false,
        message: 'Failed to create shift',
        error: error.message
      });
    }
  },

  // PUT /api/shifts/:id - Update shift (Admin only)
  updateShift: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const shift = await Shift.findByPk(id);
      if (!shift) {
        return res.status(404).json({
          success: false,
          message: 'Shift not found'
        });
      }

      // Check for name conflict if name is being updated
      if (updateData.name && updateData.name !== shift.name) {
        const existingShift = await Shift.findOne({
          where: { 
            name: updateData.name,
            id: { [Op.ne]: id }
          }
        });
        
        if (existingShift) {
          return res.status(409).json({
            success: false,
            message: 'Shift name already exists'
          });
        }
      }

      await shift.update(updateData);

      console.log(`Shift updated: ${shift.name} by admin: ${req.user.email}`);

      res.status(200).json({
        success: true,
        message: 'Shift updated successfully',
        data: {
          ...shift.toJSON(),
          crossesMidnight: shift.crossesMidnight(),
          durationMinutes: shift.getDurationMinutes()
        }
      });

    } catch (error) {
      console.error('Error updating shift:', error);
      
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

      res.status(500).json({
        success: false,
        message: 'Failed to update shift',
        error: error.message
      });
    }
  },

  // DELETE /api/shifts/:id - Delete shift (Admin only)
  deleteShift: async (req, res) => {
    try {
      const { id } = req.params;
      const { force } = req.query;

      const shift = await Shift.findByPk(id);
      if (!shift) {
        return res.status(404).json({
          success: false,
          message: 'Shift not found'
        });
      }

      // Check if shift has associated attendance records
      const attendanceCount = await Attendance.count({
        where: { shift_id: id }
      });

      if (attendanceCount > 0 && force !== 'true') {
        return res.status(409).json({
          success: false,
          message: 'Cannot delete shift with existing attendance records',
          attendanceCount,
          hint: 'Add ?force=true to force delete (this will also delete attendance records)'
        });
      }

      // If force delete, remove attendance records first
      if (force === 'true' && attendanceCount > 0) {
        await Attendance.destroy({ where: { shift_id: id } });
        console.log(`Deleted ${attendanceCount} attendance records for shift: ${shift.name}`);
      }

      const shiftName = shift.name;
      await shift.destroy();

      console.log(`Shift deleted: ${shiftName} by admin: ${req.user.email}`);

      res.status(200).json({
        success: true,
        message: 'Shift deleted successfully',
        deletedAttendanceRecords: force === 'true' ? attendanceCount : 0
      });

    } catch (error) {
      console.error('Error deleting shift:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete shift',
        error: error.message
      });
    }
  },

  // GET /api/shifts/current - Get currently active shift
  getCurrentShift: async (req, res) => {
    try {
      const currentShift = await Shift.getCurrentShift();

      if (!currentShift) {
        return res.status(404).json({
          success: false,
          message: 'No active shift found for current time'
        });
      }

      res.status(200).json({
        success: true,
        data: {
          ...currentShift.toJSON(),
          crossesMidnight: currentShift.crossesMidnight(),
          durationMinutes: currentShift.getDurationMinutes(),
          isCurrentlyActive: true
        }
      });

    } catch (error) {
      console.error('Error fetching current shift:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch current shift',
        error: error.message
      });
    }
  },

  // POST /api/shifts/setup-defaults - Create default shifts (Admin only)
  setupDefaultShifts: async (req, res) => {
    try {
      const createdShifts = await Shift.createDefaultShifts();

      console.log(`Default shifts setup by admin: ${req.user.email}`);

      res.status(201).json({
        success: true,
        message: 'Default shifts created successfully',
        data: createdShifts,
        count: createdShifts.length
      });

    } catch (error) {
      console.error('Error setting up default shifts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to setup default shifts',
        error: error.message
      });
    }
  },

  // GET /api/shifts/:id/stats - Get attendance statistics for a shift
  getShiftStats: async (req, res) => {
    try {
      const { id } = req.params;
      const { start_date, end_date, days = 30 } = req.query;

      const shift = await Shift.findByPk(id);
      if (!shift) {
        return res.status(404).json({
          success: false,
          message: 'Shift not found'
        });
      }

      // Set date range
      const endDate = end_date ? new Date(end_date) : new Date();
      const startDate = start_date ? new Date(start_date) : new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

      const stats = await Shift.getAttendanceStats(id, startDate, endDate);

      // Get detailed attendance records
      const attendanceRecords = await Attendance.findAll({
        where: {
          shift_id: id,
          date: {
            [Op.between]: [startDate, endDate]
          }
        },
        include: [
          {
            model: User,
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ],
        order: [['date', 'DESC']]
      });

      res.status(200).json({
        success: true,
        data: {
          shift: {
            ...shift.toJSON(),
            crossesMidnight: shift.crossesMidnight(),
            durationMinutes: shift.getDurationMinutes()
          },
          dateRange: { startDate, endDate },
          statistics: stats,
          attendanceRecords,
          totalRecords: attendanceRecords.length
        }
      });

    } catch (error) {
      console.error('Error fetching shift statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch shift statistics',
        error: error.message
      });
    }
  },

  // POST /api/shifts/:id/toggle - Toggle shift active status (Admin only)
  toggleShiftStatus: async (req, res) => {
    try {
      const { id } = req.params;

      const shift = await Shift.findByPk(id);
      if (!shift) {
        return res.status(404).json({
          success: false,
          message: 'Shift not found'
        });
      }

      await shift.update({ is_active: !shift.is_active });

      console.log(`Shift ${shift.name} status toggled to ${shift.is_active ? 'active' : 'inactive'} by admin: ${req.user.email}`);

      res.status(200).json({
        success: true,
        message: `Shift ${shift.is_active ? 'activated' : 'deactivated'} successfully`,
        data: shift
      });

    } catch (error) {
      console.error('Error toggling shift status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle shift status',
        error: error.message
      });
    }
  }
};

module.exports = shiftController;