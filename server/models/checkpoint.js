// Enhanced Checkpoint Model with Guard Assignment Support
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
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: "Unknown",
        validate: {
          len: [1, 255]
        }
      },
      coordinates: {
        type: DataTypes.JSON, // e.g. { lat: ..., lng: ... }
        allowNull: true,
        validate: {
          isValidCoordinates(value) {
            if (value && typeof value === 'object') {
              if (typeof value.lat !== 'number' || typeof value.lng !== 'number') {
                throw new Error('Coordinates must contain numeric lat and lng properties');
              }
              if (value.lat < -90 || value.lat > 90) {
                throw new Error('Latitude must be between -90 and 90');
              }
              if (value.lng < -180 || value.lng > 180) {
                throw new Error('Longitude must be between -180 and 180');
              }
            }
          }
        }
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
        validate: { 
          min: -90, 
          max: 90,
          isDecimal: true 
        },
        comment: 'Primary latitude field for geofencing'
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        validate: { 
          min: -180, 
          max: 180,
          isDecimal: true 
        },
        comment: 'Primary longitude field for geofencing'
      },
      // 📌 NEW: Geofencing radius in meters
      geofence_radius: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 50, // 50 meters default
        validate: {
          min: { args: [1], msg: "Geofence radius must be at least 1 meter" },
          max: { args: [1000], msg: "Geofence radius cannot exceed 1000 meters" }
        },
        comment: 'Allowed check-in radius in meters'
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { 
          model: "users", 
          key: "id" 
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      assignedTo: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { 
          model: "users", 
          key: "id" 
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        comment: 'Legacy field - use User.assigned_checkpoint_id instead'
      },
      priority: {
        type: DataTypes.ENUM("low", "medium", "high", "critical"),
        defaultValue: "medium",
        allowNull: false
      },
      checkpointType: {
        type: DataTypes.ENUM("entrance", "exit", "perimeter", "internal", "emergency"),
        defaultValue: "perimeter",
        allowNull: false
      },
      lastPatrolled: {
        type: DataTypes.DATE,
        allowNull: true,
        validate: {
          isDate: true
        }
      },
      patrolFrequency: {
        type: DataTypes.INTEGER, // minutes
        defaultValue: 60,
        allowNull: false,
        validate: {
          min: { args: [1], msg: "Patrol frequency must be at least 1 minute" },
          max: { args: [1440], msg: "Patrol frequency cannot exceed 1440 minutes (24 hours)" }
        }
      },
      // 📌 NEW: Additional fields for better checkpoint management
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
          len: [0, 1000]
        }
      },
      isGeofenceEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: 'Whether to enforce geofencing for this checkpoint'
      },
      maxAssignedGuards: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        allowNull: false,
        validate: {
          min: { args: [1], msg: "Must allow at least 1 guard" },
          max: { args: [10], msg: "Cannot exceed 10 guards per checkpoint" }
        },
        comment: 'Maximum number of guards that can be assigned to this checkpoint'
      }
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
        { fields: ["latitude", "longitude"] }, // For geospatial queries
        { fields: ["lastPatrolled"] },
        { fields: ["isGeofenceEnabled"] }
      ],
      validate: {
        // Ensure coordinates are consistent
        coordinatesConsistency() {
          if ((this.latitude !== null && this.longitude === null) || 
              (this.latitude === null && this.longitude !== null)) {
            throw new Error('Both latitude and longitude must be provided together');
          }
        }
      }
    }
  );

  // Hooks for coordinate synchronization
  Checkpoint.addHook("beforeSave", (checkpoint) => {
    // Sync coordinates JSON with individual lat/lng fields
    if (checkpoint.latitude !== null && checkpoint.longitude !== null) {
      checkpoint.coordinates = {
        lat: parseFloat(checkpoint.latitude),
        lng: parseFloat(checkpoint.longitude)
      };
    } else if (checkpoint.coordinates && typeof checkpoint.coordinates === 'object') {
      checkpoint.latitude = checkpoint.coordinates.lat;
      checkpoint.longitude = checkpoint.coordinates.lng;
    }
  });

  // Instance methods
  Checkpoint.prototype.updateLastPatrolled = async function () {
    return this.update({
      lastPatrolled: new Date()
    });
  };

  Checkpoint.prototype.isOverdue = function () {
    if (!this.lastPatrolled) return true;
    const overdueTreshold = new Date();
    overdueTreshold.setMinutes(overdueTreshold.getMinutes() - this.patrolFrequency);
    return this.lastPatrolled < overdueTreshold;
  };

  Checkpoint.prototype.hasValidCoordinates = function () {
    return this.latitude !== null && this.longitude !== null;
  };

  Checkpoint.prototype.getCoordinates = function () {
    if (this.hasValidCoordinates()) {
      return {
        lat: parseFloat(this.latitude),
        lng: parseFloat(this.longitude)
      };
    }
    return null;
  };

  // 📌 NEW: Geofencing methods
  Checkpoint.prototype.isWithinGeofence = function (userLat, userLng) {
    if (!this.hasValidCoordinates() || !this.isGeofenceEnabled) {
      return true; // Allow check-in if geofencing is disabled
    }

    const distance = this.calculateDistance(userLat, userLng);
    return distance <= this.geofence_radius;
  };

  Checkpoint.prototype.calculateDistance = function (userLat, userLng) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = parseFloat(this.latitude) * Math.PI/180;
    const φ2 = userLat * Math.PI/180;
    const Δφ = (userLat - parseFloat(this.latitude)) * Math.PI/180;
    const Δλ = (userLng - parseFloat(this.longitude)) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  Checkpoint.prototype.getAssignedGuardCount = async function () {
    const User = sequelize.models.User;
    return await User.count({
      where: {
        assigned_checkpoint_id: this.id,
        role: 'guard',
        isActive: true
      }
    });
  };

  Checkpoint.prototype.canAssignMoreGuards = async function () {
    const currentCount = await this.getAssignedGuardCount();
    return currentCount < this.maxAssignedGuards;
  };

  // Static methods
  Checkpoint.findActive = function () {
    return this.findAll({
      where: { isActive: true }
    });
  };

  Checkpoint.findOverdue = function () {
    const overdueThreshold = new Date();
    overdueThreshold.setHours(overdueThreshold.getHours() - 1); // 1 hour default
    
    return this.findAll({
      where: {
        isActive: true,
        [sequelize.Sequelize.Op.or]: [
          { lastPatrolled: { [sequelize.Sequelize.Op.lt]: overdueThreshold } },
          { lastPatrolled: null }
        ]
      }
    });
  };

  Checkpoint.findByPriority = function (priority) {
    return this.findAll({
      where: { 
        priority, 
        isActive: true 
      }
    });
  };

  Checkpoint.findNearLocation = function (lat, lng, radiusKm = 5) {
    // Simple bounding box calculation
    const latDelta = radiusKm / 111.32;
    const lngDelta = radiusKm / (111.32 * Math.cos(lat * Math.PI / 180));

    return this.findAll({
      where: {
        isActive: true,
        latitude: {
          [sequelize.Sequelize.Op.between]: [lat - latDelta, lat + latDelta]
        },
        longitude: {
          [sequelize.Sequelize.Op.between]: [lng - lngDelta, lng + lngDelta]
        }
      }
    });
  };

  // 📌 NEW: Assignment-related static methods
  Checkpoint.findWithAssignedGuards = function () {
    return this.findAll({
      where: { isActive: true },
      include: [{
        model: sequelize.models.User,
        as: 'AssignedGuards',
        where: { isActive: true },
        required: false
      }]
    });
  };

  Checkpoint.findAvailableForAssignment = function () {
    const User = sequelize.models.User;
    return this.findAll({
      where: {
        isActive: true
      },
      include: [{
        model: User,
        as: 'AssignedGuards',
        attributes: ['id'],
        required: false
      }],
      having: sequelize.literal(`COUNT(\`AssignedGuards\`.\`id\`) < \`Checkpoint\`.\`maxAssignedGuards\``)
    });
  };

  // Enhanced Associations
  Checkpoint.associate = (models) => {
    // Creator relationship
    Checkpoint.belongsTo(models.User, { 
      foreignKey: "createdBy", 
      as: "creator" 
    });
    
    // Legacy assigned guard (single assignment)
    Checkpoint.belongsTo(models.User, { 
      foreignKey: "assignedTo", 
      as: "assignedGuard" 
    });

    // 📌 NEW: Permanent guard assignments (multiple guards per checkpoint)
    Checkpoint.hasMany(models.User, { 
      foreignKey: 'assigned_checkpoint_id', 
      as: 'AssignedGuards' 
    });

    // Patrol logs
    Checkpoint.hasMany(models.PatrolLog, { 
      foreignKey: "checkpointId", 
      as: "patrolLogs" 
    });

    // Reports
    if (models.Report) {
      Checkpoint.hasMany(models.Report, { 
        foreignKey: "checkpointId", 
        as: "reports" 
      });
    }

    // 📌 NEW: Attendance records (guards checking in/out at this checkpoint)
    if (models.Attendance) {
      Checkpoint.hasMany(models.Attendance, {
        foreignKey: 'checkpoint_id',
        as: 'attendanceRecords'
      });
    }
  };

  return Checkpoint;
};