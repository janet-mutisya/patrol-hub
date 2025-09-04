// server/models/report.js
module.exports = (sequelize, DataTypes) => {
  const Report = sequelize.define(
    "Report",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      title: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: { notEmpty: true, len: [3, 150] },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      severity: {
        type: DataTypes.ENUM("low", "medium", "high", "critical"),
        defaultValue: "medium",
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("open", "in-progress", "resolved", "closed"),
        defaultValue: "open",
        allowNull: false,
      },
      reportedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      resolvedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      evidence: {
        type: DataTypes.JSON, // e.g. [{type: "image", url: "..."}, {type: "video", url: "..."}]
        allowNull: true,
      },
      guardId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      checkpointId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "checkpoints", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      patrolLogId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "patrol_logs", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
    },
    {
      tableName: "reports",
      timestamps: true,
      indexes: [
        { fields: ["severity"] },
        { fields: ["status"] },
        { fields: ["guardId"] },
        { fields: ["checkpointId"] },
        { fields: ["patrolLogId"] },
      ],
    }
  );

  // Associations
  Report.associate = (models) => {
    Report.belongsTo(models.User, { foreignKey: "guardId", as: "guard" });
    Report.belongsTo(models.Checkpoint, { foreignKey: "checkpointId", as: "checkpoint" });
    Report.belongsTo(models.PatrolLog, { foreignKey: "patrolLogId", as: "patrolLog" });
  };

  return Report;
};
