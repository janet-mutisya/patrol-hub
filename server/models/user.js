// Enhanced User Model with Additional Security Features
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
          isAlpha: {
            args: true,
            msg: "Name can only contain letters, spaces, hyphens, and apostrophes"
          }
        },
        set(value) {
          this.setDataValue("name", value ? value.trim() : value);
        },
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: {
          name: 'users_email_unique',
          msg: 'Email address already in use'
        },
        validate: { 
          isEmail: { msg: "Must be a valid email address" },
          notEmpty: { msg: "Email cannot be empty" }
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
            const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#+\-_])[A-Za-z\d@$!%*?&#+\-_]{8,}$/;
            if (!strongPasswordRegex.test(value)) {
              throw new Error('Password must contain at least one uppercase letter, lowercase letter, number, and special character');
            }
          }
        },
      },
      role: {
        type: DataTypes.ENUM("admin", "guard", "manager"),
        allowNull: false,
        defaultValue: "guard",
        validate: {
          isIn: {
            args: [["admin", "guard", "manager"]],
            msg: "Role must be admin, guard, or manager"
          }
        }
      },
      badgeNumber: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: true,
        validate: {
          len: { args: [0, 50], msg: "Badge number too long" }
        }
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true,
        validate: {
          isDate: { msg: "Last login must be a valid date" }
        }
      },
      emailVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      emailVerificationToken: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true
      },
      emailVerificationExpires: {
        type: DataTypes.DATE,
        allowNull: true,
        validate: {
          isDate: true,
          isAfterNow(value) {
            if (value && new Date(value) <= new Date()) {
              throw new Error('Email verification token must expire in the future');
            }
          }
        }
      },
      resetPasswordToken: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true
      },
      resetPasswordExpires: {
        type: DataTypes.DATE,
        allowNull: true,
        validate: {
          isDate: true,
          isAfterNow(value) {
            if (value && new Date(value) <= new Date()) {
              throw new Error('Reset password token must expire in the future');
            }
          }
        }
      },
      profilePicture: {
        type: DataTypes.STRING(500),
        allowNull: true,
        validate: { 
          isUrl: { msg: "Profile picture must be a valid URL" },
          len: { args: [0, 500], msg: "Profile picture URL too long" }
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
        }
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
              const age = today.getFullYear() - birthDate.getFullYear();
              const monthDiff = today.getMonth() - birthDate.getMonth();
              
              if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
              }
              
              if (age < 18) {
                throw new Error('User must be at least 18 years old');
              }
            }
          }
        },
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
          len: { args: [0, 1000], msg: "Address too long" }
        }
      },
      preferences: {
        type: DataTypes.JSON,
        defaultValue: {},
        validate: {
          isValidJSON(value) {
            if (value && typeof value !== 'object') {
              throw new Error('Preferences must be a valid JSON object');
            }
          }
        }
      },
      // Security tracking fields
      loginAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        validate: {
          min: { args: [0], msg: "Login attempts cannot be negative" }
        }
      },
      lockUntil: {
        type: DataTypes.DATE,
        allowNull: true,
        validate: {
          isDate: true
        }
      },
      lastLoginIP: {
        type: DataTypes.STRING(45), // IPv6 compatible
        allowNull: true,
        validate: {
          isIP: { msg: "Must be a valid IP address" }
        }
      },
      twoFactorSecret: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      twoFactorEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      // Metadata
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      updatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      }
    },
    {
      tableName: "users",
      timestamps: true,
      paranoid: true, // Soft delete support

      defaultScope: {
        attributes: {
          exclude: [
            "password", 
            "emailVerificationToken", 
            "resetPasswordToken",
            "twoFactorSecret"
          ],
        },
      },

      scopes: {
        withPassword: { 
          attributes: { 
            include: ["password"] 
          } 
        },
        withSecrets: {
          attributes: {
            include: ["password", "emailVerificationToken", "resetPasswordToken", "twoFactorSecret"]
          }
        },
        active: { 
          where: { isActive: true } 
        },
        inactive: { 
          where: { isActive: false } 
        },
        verified: { 
          where: { emailVerified: true } 
        },
        unverified: { 
          where: { emailVerified: false } 
        },
        admins: { 
          where: { role: "admin" } 
        },
        guards: { 
          where: { role: "guard" } 
        },
        managers: {
          where: { role: "manager" }
        },
        locked: {
          where: {
            lockUntil: {
              [sequelize.Sequelize.Op.gt]: new Date()
            }
          }
        }
      },

      indexes: [
        { unique: true, fields: ['email'] },
        { fields: ['role'] },
        { fields: ['isActive'] },
        { fields: ['emailVerified'] },
        { fields: ['lastLoginAt'] },
        { fields: ['createdAt'] },
        { unique: true, fields: ['emailVerificationToken'], where: { emailVerificationToken: { [sequelize.Sequelize.Op.ne]: null } } },
        { unique: true, fields: ['resetPasswordToken'], where: { resetPasswordToken: { [sequelize.Sequelize.Op.ne]: null } } }
      ]
    }
  );

  // Enhanced password hashing with better security
  User.addHook("beforeCreate", async (user) => {
    if (user.password) {
      // Use higher cost factor for better security (12 rounds)
      user.password = await bcrypt.hash(user.password, 12);
    }
    
    // Generate email verification token
    if (!user.emailVerificationToken) {
      user.emailVerificationToken = crypto.randomBytes(32).toString('hex');
      user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    }
  });

  User.addHook("beforeUpdate", async (user) => {
    if (user.changed("password")) {
      user.password = await bcrypt.hash(user.password, 12);
    }
    
    if (user.changed("email")) {
      user.emailVerified = false;
      user.emailVerificationToken = crypto.randomBytes(32).toString('hex');
      user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
  });

  // Enhanced instance methods
  User.prototype.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  };

  User.prototype.updateLastLogin = async function (ipAddress = null) {
    const updateData = { 
      lastLoginAt: new Date(),
      loginAttempts: 0, // Reset login attempts on successful login
      lockUntil: null   // Clear any account lock
    };
    
    if (ipAddress) {
      updateData.lastLoginIP = ipAddress;
    }
    
    return this.update(updateData);
  };

  User.prototype.incrementLoginAttempts = async function () {
    const updates = { loginAttempts: this.loginAttempts + 1 };
    
    // Lock account after 5 failed attempts for 30 minutes
    if (this.loginAttempts + 1 >= 5) {
      updates.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    }
    
    return this.update(updates);
  };

  User.prototype.isLocked = function () {
    return this.lockUntil && this.lockUntil > new Date();
  };

  User.prototype.generateEmailVerificationToken = function () {
    this.emailVerificationToken = crypto.randomBytes(32).toString('hex');
    this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return this.emailVerificationToken;
  };

  User.prototype.generatePasswordResetToken = function () {
    this.resetPasswordToken = crypto.randomBytes(32).toString('hex');
    this.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    return this.resetPasswordToken;
  };

  User.prototype.verifyEmail = async function () {
    return this.update({
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null
    });
  };

  User.prototype.resetPassword = async function (newPassword) {
    return this.update({
      password: newPassword, // Will be hashed by beforeUpdate hook
      resetPasswordToken: null,
      resetPasswordExpires: null,
      loginAttempts: 0,
      lockUntil: null
    });
  };

  // Static methods for common queries
  User.findByEmail = function (email) {
    return this.findOne({
      where: { email: email.toLowerCase() }
    });
  };

  User.findByVerificationToken = function (token) {
    return this.findOne({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          [sequelize.Sequelize.Op.gt]: new Date()
        }
      }
    });
  };

  User.findByResetToken = function (token) {
    return this.scope('withSecrets').findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          [sequelize.Sequelize.Op.gt]: new Date()
        }
      }
    });
  };

  // FIXED ASSOCIATIONS
  User.associate = (models) => {
    // A user can create checkpoints
    User.hasMany(models.Checkpoint, {
      foreignKey: "createdBy",
      as: "createdCheckpoints",
    });

    // A user (guard) can be assigned to checkpoints
    User.hasMany(models.Checkpoint, {
      foreignKey: "assignedTo",
      as: "assignedCheckpoints",
    });

    // A user (guard) can have many patrol logs
    User.hasMany(models.PatrolLog, {
      foreignKey: "guardId",
      as: "patrolLogs",
    });

    // A user can create other users
    User.belongsTo(models.User, {
      foreignKey: "createdBy",
      as: "creator",
    });

    User.belongsTo(models.User, {
      foreignKey: "updatedBy",
      as: "updater",
    });

    // A user (guard) can file many reports
    if (models.Report) {
      User.hasMany(models.Report, {
        foreignKey: "guardId",
        as: "reportsFiled",
      });
    }
  };

  return User;
};
