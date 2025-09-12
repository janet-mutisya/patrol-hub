// server/models/index.js
const { Sequelize, DataTypes } = require("sequelize");
const dotenv = require("dotenv");

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST || "127.0.0.1",
    dialect: process.env.DB_DIALECT || "mysql",
    logging: false,
  }
);

// Load existing models (match exact filenames)
const User = require("./user")(sequelize, DataTypes);
const Checkpoint = require("./checkpoint")(sequelize, DataTypes);
const PatrolLog = require("./patrol_logs")(sequelize, DataTypes);
const Report = require("./Report")(sequelize, DataTypes);

// NEW: Load Attendance System models
const Shift = require("./shift")(sequelize, DataTypes);
const Attendance = require("./attendance")(sequelize, DataTypes);

// Collect models in db object
const db = {
  sequelize,
  Sequelize,
  User,
  Checkpoint,
  PatrolLog,
  Report,
  // 📌 NEW: Add attendance models
  Shift,
  Attendance,
};

// Apply associations if defined - THIS IS WHERE ALL ASSOCIATIONS ARE HANDLED
Object.keys(db).forEach((modelName) => {
  if (db[modelName] && typeof db[modelName].associate === "function") {
    db[modelName].associate(db);
  }
});

// ❌ REMOVE THESE DUPLICATE ASSOCIATIONS - THEY'RE ALREADY IN THE MODEL FILES
// 📌 ENHANCED: Guard-Checkpoint Assignment Associations
// Primary relationship: User belongs to Checkpoint (permanent assignment)
// User.belongsTo(Checkpoint, { 
//   foreignKey: 'assigned_checkpoint_id', 
//   as: 'AssignedCheckpoint' 
// });

// Reverse relationship: Checkpoint has many assigned Guards
// Checkpoint.hasMany(User, { 
//   foreignKey: 'assigned_checkpoint_id', 
//   as: 'AssignedGuards' 
// });

// ❌ REMOVE THESE TOO - THEY'RE ALREADY IN THE MODEL FILES
// 📌 ATTENDANCE SYSTEM ASSOCIATIONS
// User-Attendance associations (guards can have multiple attendance records)
// User.hasMany(Attendance, { 
//   foreignKey: 'guard_id', 
//   onDelete: 'CASCADE',
//   as: 'attendanceRecords'
// });
// Attendance.belongsTo(User, { 
//   foreignKey: 'guard_id',
//   as: 'guard' 
// });

// Shift-Attendance associations (shifts can have multiple attendance records)
// Shift.hasMany(Attendance, { 
//   foreignKey: 'shift_id',
//   as: 'attendanceRecords' 
// });
// Attendance.belongsTo(Shift, { 
//   foreignKey: 'shift_id',
//   as: 'shift' 
// });

// ❌ REMOVE THIS TOO - IT'S ALREADY IN THE MODEL FILES
// 📌 NEW: Checkpoint-Attendance associations (if attendance includes checkpoint_id)
// This one might be okay if it's conditional and not in model files
// if (Attendance.rawAttributes.checkpoint_id) {
//   Checkpoint.hasMany(Attendance, {
//     foreignKey: 'checkpoint_id',
//     as: 'attendanceRecords'
//   });
//   Attendance.belongsTo(Checkpoint, {
//     foreignKey: 'checkpoint_id',
//     as: 'checkpoint'
//   });
// }

// 📌 HELPER METHODS: Add to db object for easy access
db.helpers = {
  // Assign guard to checkpoint
  assignGuardToCheckpoint: async (guardId, checkpointId) => {
    const guard = await User.findByPk(guardId);
    const checkpoint = await Checkpoint.findByPk(checkpointId);
    
    if (!guard || guard.role !== 'guard') {
      throw new Error('Invalid guard ID or user is not a guard');
    }
    
    if (!checkpoint || !checkpoint.isActive) {
      throw new Error('Invalid or inactive checkpoint');
    }

    // Check if checkpoint can accept more guards
    const canAssign = await checkpoint.canAssignMoreGuards();
    if (!canAssign) {
      throw new Error('Checkpoint has reached maximum guard capacity');
    }

    return await guard.assignToCheckpoint(checkpointId);
  },

  // Unassign guard from checkpoint
  unassignGuardFromCheckpoint: async (guardId) => {
    const guard = await User.findByPk(guardId);
    if (!guard || guard.role !== 'guard') {
      throw new Error('Invalid guard ID or user is not a guard');
    }

    return await guard.unassignFromCheckpoint();
  },

  // Get all guards assigned to a specific checkpoint
  getGuardsByCheckpoint: async (checkpointId) => {
    return await User.findAll({
      where: {
        assigned_checkpoint_id: checkpointId,
        role: 'guard',
        isActive: true
      },
      include: [{
        model: Checkpoint,
        as: 'AssignedCheckpoint',
        attributes: ['id', 'name', 'location', 'latitude', 'longitude']
      }]
    });
  },

  // Get checkpoint with all assigned guards
  getCheckpointWithGuards: async (checkpointId) => {
    return await Checkpoint.findByPk(checkpointId, {
      include: [{
        model: User,
        as: 'AssignedGuards',
        where: { isActive: true },
        required: false,
        attributes: ['id', 'name', 'email', 'badgeNumber', 'phoneNumber']
      }]
    });
  },

  // Validate guard can check-in at location (geofencing)
  validateGuardCheckIn: async (guardId, userLat, userLng) => {
    const guard = await User.findByPk(guardId, {
      include: [{
        model: Checkpoint,
        as: 'AssignedCheckpoint'
      }]
    });

    if (!guard || guard.role !== 'guard') {
      throw new Error('Invalid guard ID or user is not a guard');
    }

    if (!guard.AssignedCheckpoint) {
      throw new Error('Guard is not assigned to any checkpoint');
    }

    const checkpoint = guard.AssignedCheckpoint;
    if (!checkpoint.isWithinGeofence(userLat, userLng)) {
      const distance = checkpoint.calculateDistance(userLat, userLng);
      throw new Error(`Check-in location is ${Math.round(distance)}m away from assigned checkpoint. Maximum allowed distance: ${checkpoint.geofence_radius}m`);
    }

    return {
      success: true,
      checkpoint: checkpoint,
      distance: checkpoint.calculateDistance(userLat, userLng)
    };
  },

  // Get dashboard statistics
  getDashboardStats: async () => {
    const [
      totalGuards,
      assignedGuards,
      totalCheckpoints,
      activeCheckpoints,
      overdueCheckpoints
    ] = await Promise.all([
      User.count({ where: { role: 'guard', isActive: true } }),
      User.count({ where: { role: 'guard', isActive: true, assigned_checkpoint_id: { [Sequelize.Op.not]: null } } }),
      Checkpoint.count(),
      Checkpoint.count({ where: { isActive: true } }),
      Checkpoint.count({
        where: {
          isActive: true,
          [Sequelize.Op.or]: [
            { lastPatrolled: { [Sequelize.Op.lt]: new Date(Date.now() - 60 * 60 * 1000) } }, // 1 hour ago
            { lastPatrolled: null }
          ]
        }
      })
    ]);

    return {
      guards: {
        total: totalGuards,
        assigned: assignedGuards,
        unassigned: totalGuards - assignedGuards,
        assignmentRate: totalGuards > 0 ? Math.round((assignedGuards / totalGuards) * 100) : 0
      },
      checkpoints: {
        total: totalCheckpoints,
        active: activeCheckpoints,
        overdue: overdueCheckpoints
      }
    };
  },

  // Bulk assign guards to checkpoints
  bulkAssignGuards: async (assignments) => {
    // assignments = [{ guardId: 1, checkpointId: 5 }, { guardId: 2, checkpointId: 3 }]
    const results = [];
    
    for (const assignment of assignments) {
      try {
        const result = await db.helpers.assignGuardToCheckpoint(assignment.guardId, assignment.checkpointId);
        results.push({ 
          success: true, 
          guardId: assignment.guardId, 
          checkpointId: assignment.checkpointId,
          result 
        });
      } catch (error) {
        results.push({ 
          success: false, 
          guardId: assignment.guardId, 
          checkpointId: assignment.checkpointId,
          error: error.message 
        });
      }
    }
    
    return results;
  }
};

module.exports = db;