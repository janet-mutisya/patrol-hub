// server/models/patrol_logs.js
const { Op } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const PatrolLog = sequelize.define(
    "PatrolLog",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      guardId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        field: "guard_id", // maps model to DB column
      },
      guardName: { type: DataTypes.STRING(100), allowNull: true },
      badgeNumber: { type: DataTypes.STRING(50), allowNull: true },

      checkpointId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "checkpoints", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        field: "checkpoint_id", // maps model to DB column
      },
      checkpointName: { type: DataTypes.STRING(100), allowNull: true },

      type: {
        type: DataTypes.ENUM("patrol", "emergency-checkin"),
        defaultValue: "patrol",
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("pending", "active", "completed", "skipped"),
        defaultValue: "pending",
        allowNull: false,
      },
      notes: { type: DataTypes.TEXT, allowNull: true, defaultValue: "" },
      reason: { type: DataTypes.STRING(255), allowNull: true },

      startTime: { type: DataTypes.DATE, allowNull: true },
      endTime: { type: DataTypes.DATE, allowNull: true },
      timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
      completedAt: { type: DataTypes.DATE, allowNull: true },

      startLatitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
      startLongitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
      endLatitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
      endLongitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
      latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
      longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true },

      priority: {
        type: DataTypes.ENUM("low", "medium", "high", "urgent"),
        defaultValue: "medium",
        allowNull: false,
      },
      duration: { type: DataTypes.INTEGER, allowNull: true, comment: "Duration in minutes" },
      incidentReported: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
      weatherConditions: { type: DataTypes.STRING(100), allowNull: true },
      equipmentUsed: { type: DataTypes.JSON, allowNull: true },
    },
    {
      tableName: "patrol_logs",
      timestamps: true,
      indexes: [
        { name: "idx_patrol_logs_guard_id", fields: ["guard_id"] },
        { name: "idx_patrol_logs_checkpoint_id", fields: ["checkpoint_id"] },
        { name: "idx_patrol_logs_status", fields: ["status"] },
        { name: "idx_patrol_logs_timestamp", fields: ["timestamp"] },
        { name: "idx_patrol_logs_guard_checkpoint", fields: ["guard_id", "checkpoint_id"] },
        { name: "idx_patrol_logs_type", fields: ["type"] },
        { name: "idx_patrol_logs_start_time", fields: ["startTime"] },
        { name: "idx_patrol_logs_end_time", fields: ["endTime"] },
      ],
      hooks: {
        beforeUpdate: (patrolLog) => {
          if (patrolLog.status === "completed" && !patrolLog.completedAt) patrolLog.completedAt = new Date();
          if (patrolLog.startTime && patrolLog.endTime) {
            const durationMs = new Date(patrolLog.endTime) - new Date(patrolLog.startTime);
            patrolLog.duration = Math.round(durationMs / 60000);
          }
        },
        beforeCreate: (patrolLog) => {
          if (patrolLog.status === "completed" && !patrolLog.completedAt) patrolLog.completedAt = new Date();
          if (patrolLog.type === "emergency-checkin") {
            patrolLog.status = "completed";
            patrolLog.completedAt = new Date();
            patrolLog.endTime = patrolLog.timestamp;
          }
        },
      },
      validate: {
        statusCompletedAt() {
          if (this.status === "completed" && !this.completedAt) {
            throw new Error("completedAt is required when status is completed");
          }
        },
        validDuration() {
          if (this.duration !== null && (this.duration < 0 || this.duration > 1440)) {
            throw new Error("Duration must be between 0 and 1440 minutes");
          }
        },
        validCoordinates() {
          if (this.startLatitude && (this.startLatitude < -90 || this.startLatitude > 90)) {
            throw new Error("Start latitude must be between -90 and 90");
          }
          if (this.startLongitude && (this.startLongitude < -180 || this.startLongitude > 180)) {
            throw new Error("Start longitude must be between -180 and 180");
          }
        },
      },
    }
  );

  // FIXED ASSOCIATIONS - This is the key fix
  PatrolLog.associate = (models) => {
    // Make sure the alias matches what you use in your queries
    PatrolLog.belongsTo(models.User, { 
      foreignKey: "guardId", 
      as: "guard",
      targetKey: "id"
    });
    
    PatrolLog.belongsTo(models.Checkpoint, { 
      foreignKey: "checkpointId", 
      as: "checkpoint",
      targetKey: "id"
    });

    // Optional: Add reverse associations if needed
    if (models.Report) {
      PatrolLog.hasMany(models.Report, { 
        foreignKey: "patrolLogId", 
        as: "reports",
        sourceKey: "id"
      });
    }
  };

  // Instance methods
  PatrolLog.prototype.markCompleted = function (notes = null) {
    return this.update({
      status: "completed",
      completedAt: new Date(),
      endTime: new Date(),
      notes: notes || this.notes,
    });
  };

  PatrolLog.prototype.isOverdue = function (hoursThreshold = 24) {
    if (this.status !== "pending") return false;
    const overdueTime = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);
    return this.timestamp < overdueTime;
  };

  PatrolLog.prototype.getDurationHours = function () {
    if (!this.duration) return null;
    return Math.round((this.duration / 60) * 100) / 100;
  };

  // FIXED CLASS METHODS - Ensure proper alias usage
  PatrolLog.getStatusCounts = async function (whereClause = {}) {
    return await this.findAll({
      where: whereClause,
      attributes: ["status", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
      group: ["status"],
      raw: true,
    });
  };

  PatrolLog.getRecentActivity = async function (guardId, days = 7) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return await this.findAll({
      where: { guardId, timestamp: { [Op.gte]: startDate } },
      include: [
        { 
          model: sequelize.models.User, 
          as: "guard", 
          attributes: ["id", "name", "badgeNumber"] 
        },
        { 
          model: sequelize.models.Checkpoint, 
          as: "checkpoint", 
          attributes: ["id", "name", "location"] 
        },
      ],
      order: [["timestamp", "DESC"]],
    });
  };

  // ADDITIONAL HELPER METHODS for your controller
  PatrolLog.findWithAssociations = async function (whereClause = {}, options = {}) {
    return await this.findAll({
      where: whereClause,
      include: [
        { 
          model: sequelize.models.User, 
          as: "guard", 
          attributes: ["id", "name", "email", "badgeNumber"] 
        },
        { 
          model: sequelize.models.Checkpoint, 
          as: "checkpoint", 
          attributes: ["id", "name", "location"] 
        },
      ],
      order: [["timestamp", "DESC"]],
      ...options
    });
  };

  PatrolLog.findByPkWithAssociations = async function (id) {
    return await this.findByPk(id, {
      include: [
        { 
          model: sequelize.models.User, 
          as: "guard", 
          attributes: ["id", "name", "email", "badgeNumber"] 
        },
        { 
          model: sequelize.models.Checkpoint, 
          as: "checkpoint", 
          attributes: ["id", "name", "location"] 
        },
      ]
    });
  };

  return PatrolLog;
};