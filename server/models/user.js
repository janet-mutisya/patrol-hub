// Enhanced User Model with Additional Security Features and Checkpoint Assignment
const { DataTypes } = require("sequelize");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

module.exports = (sequelize) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: { msg: "Name cannot be empty" },
          len: { args: [2, 100], msg: "Name must be 2–100 characters" },
        },
        set(value) {
          this.setDataValue("name", value ? value.trim() : value);
        },
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: {
          name: "users_email_unique",
          msg: "Email address already in use",
        },
        validate: {
          isEmail: { msg: "Must be a valid email address" },
          notEmpty: { msg: "Email cannot be empty" },
        },
        set(value) {
          this.setDataValue("email", value ? value.toLowerCase().trim() : value);
        },
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          len: { args: [8, 255], msg: "Password must be at least 8 characters" },
          notEmpty: { msg: "Password cannot be empty" },
          isStrongPassword(value) {
            const strongPasswordRegex =
              /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#+\-_])[A-Za-z\d@$!%*?&#+\-_]{8,}$/;
            if (!strongPasswordRegex.test(value)) {
              throw new Error(
                "Password must contain at least one uppercase letter, lowercase letter, number, and special character"
              );
            }
          },
        },
      },
      role: {
        type: DataTypes.ENUM("admin", "guard", "manager"),
        allowNull: false,
        defaultValue: "guard",
      },
      badgeNumber: {
        type: DataTypes.STRING(50),
        allowNull: true,
        // Removed inline unique to prevent duplicate keys
        validate: {
          len: { args: [0, 50], msg: "Badge number too long" },
        },
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true,
        validate: {
          isDate: { msg: "Last login must be a valid date" },
        },
      },
      emailVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      emailVerificationToken: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      emailVerificationExpires: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      resetPasswordToken: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      resetPasswordExpires: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      profilePicture: {
        type: DataTypes.STRING(500),
        allowNull: true,
        validate: {
          isUrl: { msg: "Profile picture must be a valid URL" },
          len: { args: [0, 500], msg: "Profile picture URL too long" },
        },
      },
      phoneNumber: {
        type: DataTypes.STRING(20),
        allowNull: true,
        validate: {
          is: {
            args: /^[\+]?[1-9][\d]{0,15}$/,
            msg: "Invalid phone number format",
          },
        },
        set(value) {
          this.setDataValue("phoneNumber", value ? value.trim() : value);
        },
      },
      dateOfBirth: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        validate: {
          isDate: true,
          isBefore: {
            args: new Date().toISOString().split("T")[0],
            msg: "Date of birth must be in the past",
          },
          isAdult(value) {
            if (value) {
              const today = new Date();
              const birthDate = new Date(value);
              let age = today.getFullYear() - birthDate.getFullYear();
              const monthDiff = today.getMonth() - birthDate.getMonth();

              if (
                monthDiff < 0 ||
                (monthDiff === 0 && today.getDate() < birthDate.getDate())
              ) {
                age--;
              }

              if (age < 18) {
                throw new Error("User must be at least 18 years old");
              }
            }
          },
        },
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      preferences: {
        type: DataTypes.JSON,
        defaultValue: {},
      },

      // CHECKPOINT ASSIGNMENT FIELD
      assigned_checkpoint_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "checkpoints",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      // Security tracking fields
      loginAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      lockUntil: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      lastLoginIP: {
        type: DataTypes.STRING(45),
        allowNull: true,
        validate: {
          isIP: { msg: "Must be a valid IP address" },
        },
      },
      twoFactorSecret: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      twoFactorEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
      },
      updatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
      },
    },
    {
      tableName: "users",
      timestamps: true,
      paranoid: true,

      defaultScope: {
        attributes: {
          exclude: [
            "password",
            "emailVerificationToken",
            "resetPasswordToken",
            "twoFactorSecret",
          ],
        },
      },

      scopes: {
        withPassword: {
          attributes: { include: ["password"] },
        },
        withSecrets: {
          attributes: {
            include: [
              "password",
              "emailVerificationToken",
              "resetPasswordToken",
              "twoFactorSecret",
            ],
          },
        },
        active: { where: { isActive: true } },
        inactive: { where: { isActive: false } },
        verified: { where: { emailVerified: true } },
        unverified: { where: { emailVerified: false } },
        admins: { where: { role: "admin" } },
        guards: { where: { role: "guard" } },
        managers: { where: { role: "manager" } },
        locked: {
          where: {
            lockUntil: {
              [sequelize.Sequelize.Op.gt]: new Date(),
            },
          },
        },
        assignedGuards: {
          where: {
            assigned_checkpoint_id: {
              [sequelize.Sequelize.Op.not]: null,
            },
            role: "guard",
          },
        },
        unassignedGuards: {
          where: {
            assigned_checkpoint_id: null,
            role: "guard",
          },
        },
      },

      indexes: [
        { unique: true, fields: ["email"] },
        { unique: true, fields: ["badgeNumber"] },
        { fields: ["role"] },
        { fields: ["isActive"] },
        { fields: ["emailVerified"] },
        { fields: ["lastLoginAt"] },
        { fields: ["createdAt"] },
        { fields: ["assigned_checkpoint_id"] },
        {
          unique: true,
          fields: ["emailVerificationToken"],
          where: { emailVerificationToken: { [sequelize.Sequelize.Op.ne]: null } },
        },
        {
          unique: true,
          fields: ["resetPasswordToken"],
          where: { resetPasswordToken: { [sequelize.Sequelize.Op.ne]: null } },
        },
      ],
    }
  );

  // Hooks
  User.addHook("beforeCreate", async (user) => {
    if (user.password) {
      user.password = await bcrypt.hash(user.password, 12);
    }

    if (!user.emailVerificationToken) {
      user.emailVerificationToken = crypto.randomBytes(32).toString("hex");
      user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
  });

  User.addHook("beforeUpdate", async (user) => {
    if (user.changed("password")) {
      user.password = await bcrypt.hash(user.password, 12);
    }

    if (user.changed("email")) {
      user.emailVerified = false;
      user.emailVerificationToken = crypto.randomBytes(32).toString("hex");
      user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
  });

  // Instance methods
  User.prototype.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  };

  User.prototype.updateLastLogin = async function (ipAddress = null) {
    const updateData = {
      lastLoginAt: new Date(),
      loginAttempts: 0,
      lockUntil: null,
    };

    if (ipAddress) updateData.lastLoginIP = ipAddress;

    return this.update(updateData);
  };

  User.prototype.incrementLoginAttempts = async function () {
    const updates = { loginAttempts: this.loginAttempts + 1 };

    if (this.loginAttempts + 1 >= 5) {
      updates.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
    }

    return this.update(updates);
  };

  User.prototype.isLocked = function () {
    return this.lockUntil && this.lockUntil > new Date();
  };

  User.prototype.generateEmailVerificationToken = function () {
    this.emailVerificationToken = crypto.randomBytes(32).toString("hex");
    this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return this.emailVerificationToken;
  };

  User.prototype.generatePasswordResetToken = function () {
    this.resetPasswordToken = crypto.randomBytes(32).toString("hex");
    this.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    return this.resetPasswordToken;
  };

  User.prototype.verifyEmail = async function () {
    return this.update({
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    });
  };

  User.prototype.resetPassword = async function (newPassword) {
    return this.update({
      password: newPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      loginAttempts: 0,
      lockUntil: null,
    });
  };

  User.prototype.assignToCheckpoint = async function (checkpointId) {
    return this.update({
      assigned_checkpoint_id: checkpointId,
    });
  };

  User.prototype.unassignFromCheckpoint = async function () {
    return this.update({
      assigned_checkpoint_id: null,
    });
  };

  User.prototype.isAssignedToCheckpoint = function () {
    return this.assigned_checkpoint_id !== null;
  };

  User.prototype.getAssignedCheckpointId = function () {
    return this.assigned_checkpoint_id;
  };

  // Static methods
  User.findByEmail = function (email) {
    return this.findOne({ where: { email: email.toLowerCase() } });
  };

  User.findByVerificationToken = function (token) {
    return this.findOne({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: { [sequelize.Sequelize.Op.gt]: new Date() },
      },
    });
  };

  User.findByResetToken = function (token) {
    return this.scope("withSecrets").findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { [sequelize.Sequelize.Op.gt]: new Date() },
      },
    });
  };

  User.findAssignedGuards = function () {
    return this.scope("assignedGuards").findAll({
      include: [{ model: sequelize.models.Checkpoint, as: "AssignedCheckpoint" }],
    });
  };

  User.findGuardsByCheckpoint = function (checkpointId) {
    return this.findAll({
      where: { role: "guard", assigned_checkpoint_id: checkpointId },
    });
  };

  User.findUnassignedGuards = function () {
    return this.scope("unassignedGuards").findAll();
  };

  // Associations
  User.associate = (models) => {
    User.hasMany(models.Checkpoint, {
      foreignKey: "createdBy",
      as: "createdCheckpoints",
    });

    User.hasMany(models.Checkpoint, {
      foreignKey: "assignedTo",
      as: "temporaryAssignments",
    });

    User.belongsTo(models.Checkpoint, {
      foreignKey: "assigned_checkpoint_id",
      as: "AssignedCheckpoint",
    });

    User.hasMany(models.PatrolLog, {
      foreignKey: "guardId",
      as: "patrolLogs",
    });

    if (models.Attendance) {
      User.hasMany(models.Attendance, {
        foreignKey: "guard_id",
        as: "attendanceRecords",
        onDelete: "CASCADE",
      });
    }

    User.belongsTo(models.User, {
      foreignKey: "createdBy",
      as: "creator",
    });

    User.belongsTo(models.User, {
      foreignKey: "updatedBy",
      as: "updater",
    });

    if (models.Report) {
      User.hasMany(models.Report, {
        foreignKey: "guardId",
        as: "reportsFiled",
      });
    }
  };

  return User;
};
