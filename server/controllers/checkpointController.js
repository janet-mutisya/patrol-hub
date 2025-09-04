const { Checkpoint, User, PatrolLog } = require("../models");
const { Op } = require("sequelize");
const { body, validationResult, param, query } = require("express-validator");

// Validation middleware
const checkpointValidation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters")
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage("Name can only contain letters, numbers, spaces, hyphens, and underscores"),
  
  body("location")
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage("Location must be between 5 and 200 characters"),
  
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),
  
  body("coordinates")
    .optional()
    .custom((value) => {
      if (value) {
        const { latitude, longitude } = value;
        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
          throw new Error("Coordinates must contain valid latitude and longitude numbers");
        }
        if (latitude < -90 || latitude > 90) {
          throw new Error("Latitude must be between -90 and 90");
        }
        if (longitude < -180 || longitude > 180) {
          throw new Error("Longitude must be between -180 and 180");
        }
      }
      return true;
    }),
  
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean value")
];

const updateCheckpointValidation = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("Checkpoint ID must be a positive integer"),
  
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters")
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage("Name can only contain letters, numbers, spaces, hyphens, and underscores"),
  
  body("location")
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage("Location must be between 5 and 200 characters"),
  
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),
  
  body("coordinates")
    .optional()
    .custom((value) => {
      if (value) {
        const { latitude, longitude } = value;
        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
          throw new Error("Coordinates must contain valid latitude and longitude numbers");
        }
        if (latitude < -90 || latitude > 90) {
          throw new Error("Latitude must be between -90 and 90");
        }
        if (longitude < -180 || longitude > 180) {
          throw new Error("Longitude must be between -180 and 180");
        }
      }
      return true;
    }),
  
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean value")
];

const queryValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  
  query("search")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Search term must be between 1 and 100 characters"),
  
  query("status")
    .optional()
    .isIn(["active", "inactive", "all"])
    .withMessage("Status must be 'active', 'inactive', or 'all'"),
  
  query("sortBy")
    .optional()
    .isIn(["name", "location", "createdAt", "updatedAt"])
    .withMessage("Sort field must be name, location, createdAt, or updatedAt"),
  
  query("sortOrder")
    .optional()
    .isIn(["ASC", "DESC"])
    .withMessage("Sort order must be ASC or DESC")
];

// Create checkpoint (Admin only)
const createCheckpoint = async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const { name, location, description, coordinates, isActive = true } = req.body;

    // Check if checkpoint name already exists
    const existingCheckpoint = await Checkpoint.findOne({
      where: { name: name.trim() }
    });

    if (existingCheckpoint) {
      return res.status(409).json({
        success: false,
        message: "Checkpoint with this name already exists"
      });
    }

    const checkpoint = await Checkpoint.create({
      name: name.trim(),
      location: location.trim(),
      description: description?.trim() || null,
      coordinates: coordinates || null,
      isActive,
      createdBy: req.user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Fetch the created checkpoint with creator info
    const checkpointWithCreator = await Checkpoint.findByPk(checkpoint.id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email', 'role']
      }]
    });

    console.log(`Checkpoint created: ${checkpoint.name} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: "Checkpoint created successfully",
      data: {
        checkpoint: checkpointWithCreator
      }
    });

  } catch (error) {
    console.error("Error creating checkpoint:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while creating checkpoint"
    });
  }
};

// Get all checkpoints with advanced filtering and pagination
const getAllCheckpoints = async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const {
      page = 1,
      limit = 20,
      search,
      status = "all",
      sortBy = "createdAt",
      sortOrder = "DESC"
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    // Apply search filter
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { location: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Apply status filter
    if (status !== "all") {
      where.isActive = status === "active";
    }

    const { count, rows: checkpoints } = await Checkpoint.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortOrder]],
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email', 'role']
      }]
    });

    res.json({
      success: true,
      data: {
        checkpoints,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          totalCheckpoints: count,
          limit: parseInt(limit),
          hasNext: parseInt(page) < Math.ceil(count / parseInt(limit)),
          hasPrev: parseInt(page) > 1
        },
        filters: {
          search: search || null,
          status,
          sortBy,
          sortOrder
        }
      }
    });

  } catch (error) {
    console.error("Error fetching checkpoints:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching checkpoints"
    });
  }
};

// Get active checkpoints only (for guards)
const getActiveCheckpoints = async (req, res) => {
  try {
    const checkpoints = await Checkpoint.findAll({
      where: { isActive: true },
      order: [['name', 'ASC']],
      attributes: ['id', 'name', 'location', 'description', 'coordinates']
    });

    res.json({
      success: true,
      data: {
        checkpoints
      }
    });

  } catch (error) {
    console.error("Error fetching active checkpoints:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching active checkpoints"
    });
  }
};

// NEW: Get checkpoint assigned to a specific guard
const getAssignedCheckpoint = async (req, res) => {
  try {
    const { guardId } = req.params;
    
    const checkpoint = await Checkpoint.findOne({ 
      where: { assignedTo: guardId, isActive: true },
      include: [
        {
          model: User,
          as: 'assignedGuard',
          attributes: ['id', 'name', 'badgeNumber']
        }
      ]
    });
    
    res.json({ checkpoint });
  } catch (error) {
    console.error('Error fetching assigned checkpoint:', error);
    res.status(500).json({ error: 'Failed to fetch assigned checkpoint' });
  }
};

// Get single checkpoint by ID
const getCheckpointById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: "Valid checkpoint ID is required"
      });
    }

    const checkpoint = await Checkpoint.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email', 'role']
        },
        {
          model: PatrolLog,
          as: 'patrolLogs',
          limit: 5,
          order: [['createdAt', 'DESC']],
          include: [{
            model: User,
            as: 'guard',
            attributes: ['id', 'name', 'email']
          }]
        }
      ]
    });

    if (!checkpoint) {
      return res.status(404).json({
        success: false,
        message: "Checkpoint not found"
      });
    }

    res.json({
      success: true,
      data: {
        checkpoint
      }
    });

  } catch (error) {
    console.error("Error fetching checkpoint:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching checkpoint"
    });
  }
};

// Update checkpoint (Admin only)
const updateCheckpoint = async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updates = req.body;

    const checkpoint = await Checkpoint.findByPk(id);
    if (!checkpoint) {
      return res.status(404).json({
        success: false,
        message: "Checkpoint not found"
      });
    }

    // Check if name is being updated and if it conflicts with existing checkpoint
    if (updates.name && updates.name.trim() !== checkpoint.name) {
      const existingCheckpoint = await Checkpoint.findOne({
        where: { 
          name: updates.name.trim(),
          id: { [Op.ne]: id }
        }
      });

      if (existingCheckpoint) {
        return res.status(409).json({
          success: false,
          message: "Another checkpoint with this name already exists"
        });
      }
    }

    // Update checkpoint
    await checkpoint.update({
      ...updates,
      name: updates.name?.trim(),
      location: updates.location?.trim(),
      description: updates.description?.trim(),
      updatedAt: new Date()
    });

    // Fetch updated checkpoint with relations
    const updatedCheckpoint = await Checkpoint.findByPk(id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email', 'role']
      }]
    });

    console.log(`Checkpoint updated: ${checkpoint.name} by ${req.user.email}`);

    res.json({
      success: true,
      message: "Checkpoint updated successfully",
      data: {
        checkpoint: updatedCheckpoint
      }
    });

  } catch (error) {
    console.error("Error updating checkpoint:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while updating checkpoint"
    });
  }
};

// Delete checkpoint (Admin only)
const deleteCheckpoint = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: "Valid checkpoint ID is required"
      });
    }

    const checkpoint = await Checkpoint.findByPk(id);
    if (!checkpoint) {
      return res.status(404).json({
        success: false,
        message: "Checkpoint not found"
      });
    }

    // Check if checkpoint has associated patrol logs
    const patrolLogsCount = await PatrolLog.count({
      where: { checkpointId: id }
    });

    if (patrolLogsCount > 0) {
      // Soft delete by setting isActive to false instead of hard delete
      await checkpoint.update({ 
        isActive: false,
        updatedAt: new Date()
      });

      console.log(`Checkpoint soft deleted: ${checkpoint.name} by ${req.user.email} (had ${patrolLogsCount} patrol logs)`);

      return res.json({
        success: true,
        message: "Checkpoint deactivated successfully (has associated patrol logs)"
      });
    }

    // Hard delete if no patrol logs
    const checkpointName = checkpoint.name;
    await checkpoint.destroy();

    console.log(`Checkpoint deleted: ${checkpointName} by ${req.user.email}`);

    res.json({
      success: true,
      message: "Checkpoint deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting checkpoint:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while deleting checkpoint"
    });
  }
};

// Toggle checkpoint status (Admin only)
const toggleCheckpointStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: "Valid checkpoint ID is required"
      });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: "isActive must be a boolean value"
      });
    }

    const checkpoint = await Checkpoint.findByPk(id);
    if (!checkpoint) {
      return res.status(404).json({
        success: false,
        message: "Checkpoint not found"
      });
    }

    await checkpoint.update({ 
      isActive,
      updatedAt: new Date()
    });

    console.log(`Checkpoint status updated: ${checkpoint.name} -> ${isActive ? 'active' : 'inactive'} by ${req.user.email}`);

    res.json({
      success: true,
      message: `Checkpoint ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        checkpoint: {
          id: checkpoint.id,
          name: checkpoint.name,
          isActive
        }
      }
    });

  } catch (error) {
    console.error("Error toggling checkpoint status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while updating checkpoint status"
    });
  }
};

// Get checkpoint statistics (Admin only)
const getCheckpointStats = async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 30 } = req.query;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: "Valid checkpoint ID is required"
      });
    }

    const checkpoint = await Checkpoint.findByPk(id);
    if (!checkpoint) {
      return res.status(404).json({
        success: false,
        message: "Checkpoint not found"
      });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get patrol statistics
    const patrolStats = await PatrolLog.findAll({
      where: {
        checkpointId: id,
        createdAt: {
          [Op.gte]: startDate
        }
      },
      attributes: [
        [require('sequelize').fn('DATE', require('sequelize').col('createdAt')), 'date'],
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: [require('sequelize').fn('DATE', require('sequelize').col('createdAt'))],
      order: [[require('sequelize').fn('DATE', require('sequelize').col('createdAt')), 'ASC']]
    });

    const totalPatrols = await PatrolLog.count({
      where: { checkpointId: id }
    });

    const recentPatrols = await PatrolLog.count({
      where: {
        checkpointId: id,
        createdAt: {
          [Op.gte]: startDate
        }
      }
    });

    res.json({
      success: true,
      data: {
        checkpoint: {
          id: checkpoint.id,
          name: checkpoint.name,
          location: checkpoint.location
        },
        statistics: {
          totalPatrols,
          recentPatrols,
          periodDays: parseInt(days),
          dailyPatrols: patrolStats
        }
      }
    });

  } catch (error) {
    console.error("Error fetching checkpoint statistics:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching checkpoint statistics"
    });
  }
};

// Bulk operations for checkpoints (Admin only)
const bulkUpdateCheckpoints = async (req, res) => {
  try {
    const { checkpointIds, action, data } = req.body;

    if (!Array.isArray(checkpointIds) || checkpointIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Checkpoint IDs array is required"
      });
    }

    if (!["activate", "deactivate", "update"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be 'activate', 'deactivate', or 'update'"
      });
    }

    let updateData = {};
    
    switch (action) {
      case "activate":
        updateData = { isActive: true };
        break;
      case "deactivate":
        updateData = { isActive: false };
        break;
      case "update":
        if (!data || typeof data !== 'object') {
          return res.status(400).json({
            success: false,
            message: "Update data is required for update action"
          });
        }
        updateData = { ...data };
        break;
    }

    updateData.updatedAt = new Date();

    const [updatedCount] = await Checkpoint.update(
      updateData,
      {
        where: {
          id: {
            [Op.in]: checkpointIds
          }
        }
      }
    );

    console.log(`Bulk ${action} performed on ${updatedCount} checkpoints by ${req.user.email}`);

    res.json({
      success: true,
      message: `Successfully ${action}d ${updatedCount} checkpoint(s)`,
      data: {
        updatedCount,
        action
      }
    });

  } catch (error) {
    console.error("Error in bulk checkpoint operation:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during bulk operation"
    });
  }
};

// Get checkpoints near coordinates (for mobile apps)
const getNearbyCheckpoints = async (req, res) => {
  try {
    const { latitude, longitude, radius = 1000 } = req.query; // radius in meters

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required"
      });
    }

    if (isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude must be valid numbers"
      });
    }

    // Using Haversine formula for distance calculation
    const checkpoints = await Checkpoint.findAll({
      where: {
        isActive: true,
        coordinates: {
          [Op.ne]: null
        }
      },
      attributes: [
        'id', 'name', 'location', 'description', 'coordinates',
        // Calculate distance using Haversine formula
        [
          require('sequelize').literal(`
            6371000 * acos(
              cos(radians(${parseFloat(latitude)})) * 
              cos(radians(CAST(coordinates->>'latitude' AS FLOAT))) * 
              cos(radians(CAST(coordinates->>'longitude' AS FLOAT)) - radians(${parseFloat(longitude)})) + 
              sin(radians(${parseFloat(latitude)})) * 
              sin(radians(CAST(coordinates->>'latitude' AS FLOAT)))
            )
          `),
          'distance'
        ]
      ],
      having: require('sequelize').literal(`distance <= ${parseInt(radius)}`),
      order: [['distance', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        checkpoints,
        searchCenter: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        },
        radiusMeters: parseInt(radius)
      }
    });

  } catch (error) {
    console.error("Error fetching nearby checkpoints:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching nearby checkpoints"
    });
  }
};

// Assign a checkpoint to a guard (Admin/Supervisor only)
const assignCheckpoint = async (req, res) => {
  try {
    const { checkpointId, guardId } = req.body;

    if (!checkpointId || !guardId) {
      return res.status(400).json({
        success: false,
        message: "checkpointId and guardId are required"
      });
    }

    // Check checkpoint
    const checkpoint = await Checkpoint.findByPk(checkpointId);
    if (!checkpoint) {
      return res.status(404).json({
        success: false,
        message: "Checkpoint not found"
      });
    }

    // Check guard
    const guard = await User.findByPk(guardId);
    if (!guard || guard.role !== "guard") {
      return res.status(400).json({
        success: false,
        message: "Invalid guard ID or user is not a guard"
      });
    }

    // Assign
    await checkpoint.update({ assignedTo: guardId });

    res.json({
      success: true,
      message: `Checkpoint '${checkpoint.name}' assigned to guard '${guard.name}'`,
      data: {
        checkpointId: checkpoint.id,
        guardId: guard.id,
        guardName: guard.name
      }
    });
  } catch (error) {
    console.error("Error assigning checkpoint:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while assigning checkpoint"
    });
  }
};

// Unassign checkpoint
const unassignCheckpoint = async (req, res) => {
  try {
    const { checkpointId } = req.body;

    if (!checkpointId) {
      return res.status(400).json({
        success: false,
        message: "checkpointId is required"
      });
    }

    const checkpoint = await Checkpoint.findByPk(checkpointId);
    if (!checkpoint) {
      return res.status(404).json({
        success: false,
        message: "Checkpoint not found"
      });
    }

    await checkpoint.update({ assignedTo: null });

    res.json({
      success: true,
      message: `Checkpoint '${checkpoint.name}' unassigned successfully`,
      data: { checkpointId: checkpoint.id }
    });
  } catch (error) {
    console.error("Error unassigning checkpoint:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while unassigning checkpoint"
    });
  }
};

// Get checkpoints assigned to a guard
const getGuardCheckpoints = async (req, res) => {
  try {
    const { guardId } = req.params;

    if (!guardId) {
      return res.status(400).json({
        success: false,
        message: "guardId is required"
      });
    }

    const checkpoints = await Checkpoint.findAll({
      where: { assignedTo: guardId, isActive: true },
      include: [{ 
        model: User, 
        as: "creator", 
        attributes: ["id", "name", "email"] 
      }]
    });

    res.json({
      success: true,
      data: { checkpoints }
    });
  } catch (error) {
    console.error("Error fetching guard checkpoints:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching guard checkpoints"
    });
  }
};

module.exports = {
  createCheckpoint,
  getAllCheckpoints,
  getActiveCheckpoints,
  getCheckpointById,
  updateCheckpoint,
  deleteCheckpoint,
  toggleCheckpointStatus,
  getCheckpointStats,
  bulkUpdateCheckpoints,
  getNearbyCheckpoints,
  checkpointValidation,
  updateCheckpointValidation,
  queryValidation,
  assignCheckpoint,
  unassignCheckpoint,
  getGuardCheckpoints,
  getAssignedCheckpoint // Added the missing function
};