// server/models/checkpoint.js
module.exports = (sequelize, DataTypes) => {
  const Checkpoint = sequelize.define(
    "Checkpoint",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
          len: [2, 100],
        },
      },
      location: {
        type: DataTypes.STRING(200),
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [5, 200],
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
          len: [0, 500],
        },
      },
      coordinates: {
        type: DataTypes.JSON, // e.g. { lat: ..., lng: ... }
        allowNull: true,
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
        validate: { min: -90, max: 90 },
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        validate: { min: -180, max: 180 },
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      assignedTo: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      priority: {
        type: DataTypes.ENUM("low", "medium", "high", "critical"),
        defaultValue: "medium",
      },
      checkpointType: {
        type: DataTypes.ENUM("entrance", "exit", "perimeter", "internal", "emergency"),
        defaultValue: "perimeter",
      },
      lastPatrolled: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      patrolFrequency: {
        type: DataTypes.INTEGER, // minutes
        defaultValue: 60,
      },
    },
    {
      tableName: "checkpoints",
      timestamps: true,
      indexes: [
        { fields: ["isActive"] },
        { fields: ["assignedTo"] },
        { fields: ["createdBy"] },
        { fields: ["priority"] },
        { fields: ["checkpointType"] },
      ],
    }
  );

  // Associations
  Checkpoint.associate = (models) => {
    Checkpoint.belongsTo(models.User, { foreignKey: "createdBy", as: "creator" });
    Checkpoint.belongsTo(models.User, { foreignKey: "assignedTo", as: "assignedGuard" });

    Checkpoint.hasMany(models.PatrolLog, { foreignKey: "checkpointId", as: "patrolLogs" });

    // Use Report instead of Incident
    if (models.Report) {
      Checkpoint.hasMany(models.Report, { foreignKey: "checkpointId", as: "reports" });
    }
  };

  return Checkpoint;
};
