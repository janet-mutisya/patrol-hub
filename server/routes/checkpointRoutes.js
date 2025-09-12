const express = require('express');
const router = express.Router();
const { auth, requireRole, fallbackToGuard } = require('../middlewares/auth');
const { User, Checkpoint, PatrolLog } = require('../models');
const { Op, sequelize } = require('sequelize');
const { body, validationResult } = require('express-validator');

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCached = (key) => {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }
  return item.data;
};

const setCache = (key, data, ttl = CACHE_TTL) => {
  cache.set(key, {
    data,
    expiry: Date.now() + ttl
  });
};

const invalidateCache = () => {
  cache.clear();
  console.log('Cache invalidated');
};

// Apply auth middleware to all routes
router.use(auth);

// ===========================================
// MAIN ROUTES
// ===========================================

// Get all checkpoints (Admin only)
// Get all checkpoints (Admin and Guard access)
router.get("/", requireRole(["admin", "guard"]), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = (page - 1) * limit;
    const search = req.query.search?.trim();
    const status = req.query.status;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const whereConditions = {};
    
    // If user is a guard, only show active checkpoints
    if (req.user.role === 'guard') {
      whereConditions.isActive = true;
    }
    
    if (search) {
      whereConditions[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    if (status === 'active') {
      whereConditions.isActive = true;
    } else if (status === 'inactive') {
      whereConditions.isActive = false;
    }

    const cacheKey = `checkpoints_${req.user.role}_${page}_${limit}_${search || 'all'}_${status || 'all'}_${sortBy}_${sortOrder}`;
    let cachedResult = getCached(cacheKey);

    if (cachedResult) {
      return res.json({
        success: true,
        data: cachedResult,
        cached: true
      });
    }

    const { count, rows } = await Checkpoint.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email'],
          required: false
        },
        {
          model: User,
          as: 'AssignedGuards',
          attributes: ['id', 'name', 'email', 'badgeNumber'],
          where: { isActive: true },
          required: false
        }
      ],
      order: [[sortBy, sortOrder]],
      limit,
      offset,
      distinct: true
    });

    const enhancedCheckpoints = rows.map(checkpoint => {
      const data = checkpoint.toJSON();
      data.assignedGuardCount = data.AssignedGuards ? data.AssignedGuards.length : 0;
      data.canAssignMore = data.assignedGuardCount < (checkpoint.maxAssignedGuards || 1);
      data.isOverdue = checkpoint.lastPatrolled && 
        (Date.now() - new Date(checkpoint.lastPatrolled)) > (checkpoint.patrolFrequency * 60000);
      data.hasValidCoordinates = checkpoint.latitude && checkpoint.longitude;
      data.coordinates = data.hasValidCoordinates 
        ? { latitude: checkpoint.latitude, longitude: checkpoint.longitude }
        : null;
      return data;
    });

    const totalPages = Math.ceil(count / limit);
    
    const result = {
      checkpoints: enhancedCheckpoints,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: count,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    };

    setCache(cacheKey, result);

    res.json({
      success: true,
      data: result,
      cached: false
    });

  } catch (error) {
    console.error("Error fetching checkpoints:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching checkpoints"
    });
  }
});

// Create checkpoint (Admin only)
router.post("/", requireRole("admin"), async (req, res) => {
  try {
    const { name, location, description, coordinates, isActive = true } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Checkpoint name is required"
      });
    }

    if (!location || !location.trim()) {
      return res.status(400).json({
        success: false,
        message: "Location is required"
      });
    }

    if (coordinates) {
      const { latitude, longitude } = coordinates;
      if (latitude !== undefined && longitude !== undefined) {
        if (isNaN(latitude) || isNaN(longitude) || 
            latitude < -90 || latitude > 90 || 
            longitude < -180 || longitude > 180) {
          return res.status(400).json({
            success: false,
            message: "Invalid coordinates provided"
          });
        }
      }
    }

    const checkpointData = {
      name: name.trim(),
      location: location.trim(),
      description: description?.trim() || null,
      isActive: Boolean(isActive),
      createdBy: req.user.id
    };

    if (coordinates?.latitude !== undefined && coordinates?.longitude !== undefined) {
      checkpointData.latitude = parseFloat(coordinates.latitude);
      checkpointData.longitude = parseFloat(coordinates.longitude);
    }

    const checkpoint = await Checkpoint.create(checkpointData);

    const createdCheckpoint = await Checkpoint.findByPk(checkpoint.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    invalidateCache();

    res.status(201).json({
      success: true,
      message: "Checkpoint created successfully",
      data: { checkpoint: createdCheckpoint }
    });

  } catch (error) {
    console.error("Error creating checkpoint:", error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: "A checkpoint with this name already exists"
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error while creating checkpoint"
    });
  }
});

// Get active checkpoints (Admin only)
router.get("/active", requireRole(["admin"]), async (req, res) => {
  try {
    const cacheKey = 'active_checkpoints';
    let checkpoints = getCached(cacheKey);
    
    if (!checkpoints) {
      checkpoints = await Checkpoint.findAll({
        where: { isActive: true },
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email'],
            required: false
          },
          {
            model: User,
            as: 'AssignedGuards',
            attributes: ['id', 'name', 'email', 'badgeNumber'],
            where: { isActive: true },
            required: false
          }
        ],
        order: [['name', 'ASC']]
      });

      setCache(cacheKey, checkpoints);
    }

    const enhancedCheckpoints = checkpoints.map(checkpoint => {
      const data = checkpoint.toJSON ? checkpoint.toJSON() : checkpoint;
      data.assignedGuardCount = data.AssignedGuards ? data.AssignedGuards.length : 0;
      data.canAssignMore = data.assignedGuardCount < (checkpoint.maxAssignedGuards || 1);
      data.isOverdue = checkpoint.lastPatrolled && 
        (Date.now() - new Date(checkpoint.lastPatrolled)) > (checkpoint.patrolFrequency * 60000);
      return data;
    });

    res.json({
      success: true,
      data: { 
        checkpoints: enhancedCheckpoints,
        count: enhancedCheckpoints.length
      }
    });

  } catch (error) {
    console.error("Error fetching active checkpoints:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching active checkpoints"
    });
  }
});

// Get guard's assigned checkpoint
router.get("/guard/:guardId", fallbackToGuard, async (req, res) => {
  try {
    const { guardId } = req.params;
    
    if (req.user.role !== 'admin' && req.user.id !== parseInt(guardId)) {
      return res.status(403).json({
        success: false,
        message: "You can only access your own checkpoint assignment"
      });
    }
    
    const guard = await User.findByPk(guardId, {
      where: { role: 'guard', isActive: true },
      include: [{
        model: Checkpoint,
        as: 'AssignedCheckpoint',
        where: { isActive: true },
        required: false,
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email'],
          required: false
        }]
      }]
    });

    if (!guard) {
      return res.status(404).json({
        success: false,
        message: "Guard not found or inactive"
      });
    }

    const checkpoint = guard.AssignedCheckpoint;
    let enhancedCheckpoint = null;

    if (checkpoint) {
      enhancedCheckpoint = checkpoint.toJSON();
      enhancedCheckpoint.isOverdue = checkpoint.lastPatrolled && 
        (Date.now() - new Date(checkpoint.lastPatrolled)) > (checkpoint.patrolFrequency * 60000);
      enhancedCheckpoint.hasValidCoordinates = checkpoint.latitude && checkpoint.longitude;
      enhancedCheckpoint.coordinates = enhancedCheckpoint.hasValidCoordinates 
        ? { latitude: checkpoint.latitude, longitude: checkpoint.longitude }
        : null;
    }
    
    res.json({ 
      success: true,
      data: {
        guard: {
          id: guard.id,
          name: guard.name,
          email: guard.email,
          badgeNumber: guard.badgeNumber
        },
        checkpoint: enhancedCheckpoint
      }
    });

  } catch (error) {
    console.error('Error fetching guard checkpoint:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch guard checkpoint' 
    });
  }
});

// Get nearby checkpoints
router.post("/nearby", fallbackToGuard, async (req, res) => {
  try {
    const { latitude, longitude, radius = 1000 } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required"
      });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: "Invalid coordinates"
      });
    }

    const checkpoints = await sequelize.query(`
      SELECT *,
             (6371000 * ACOS(
               GREATEST(-1, LEAST(1,
                 COS(RADIANS(?)) * 
                 COS(RADIANS(latitude)) * 
                 COS(RADIANS(longitude) - RADIANS(?)) + 
                 SIN(RADIANS(?)) * 
                 SIN(RADIANS(latitude))
               ))
             )) AS distance
      FROM checkpoints
      WHERE isActive = 1
        AND latitude IS NOT NULL 
        AND longitude IS NOT NULL
      HAVING distance <= ?
      ORDER BY distance ASC
      LIMIT 50
    `, {
      replacements: [latitude, longitude, latitude, radius],
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: {
        checkpoints: checkpoints.map(cp => ({
          ...cp,
          distance: Math.round(cp.distance)
        })),
        userLocation: { latitude, longitude },
        searchRadius: radius,
        count: checkpoints.length
      }
    });

  } catch (error) {
    console.error("Error fetching nearby checkpoints:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching nearby checkpoints"
    });
  }
});

// Get single checkpoint
router.get("/:id", fallbackToGuard, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: "Valid checkpoint ID is required"
      });
    }

    if (req.user.role === 'guard') {
      const guard = await User.findByPk(req.user.id);
      if (!guard || guard.assigned_checkpoint_id !== parseInt(id)) {
        return res.status(403).json({
          success: false,
          message: "Guards can only access their assigned checkpoint"
        });
      }
    }

    const checkpoint = await Checkpoint.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email', 'role'],
          required: false
        },
        {
          model: User,
          as: 'AssignedGuards',
          attributes: ['id', 'name', 'email', 'badgeNumber'],
          where: { isActive: true },
          required: false
        }
      ]
    });

    if (!checkpoint) {
      return res.status(404).json({
        success: false,
        message: "Checkpoint not found"
      });
    }

    const data = checkpoint.toJSON();
    data.assignedGuardCount = data.AssignedGuards ? data.AssignedGuards.length : 0;
    data.canAssignMore = data.assignedGuardCount < checkpoint.maxAssignedGuards;
    data.coordinates = checkpoint.latitude && checkpoint.longitude 
      ? { latitude: checkpoint.latitude, longitude: checkpoint.longitude }
      : null;

    res.json({
      success: true,
      data: { checkpoint: data }
    });

  } catch (error) {
    console.error("Error fetching checkpoint:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// Update checkpoint
router.put("/:id", requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, description, coordinates, isActive } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Checkpoint name is required"
      });
    }

    if (!location || !location.trim()) {
      return res.status(400).json({
        success: false,
        message: "Location is required"
      });
    }

    const checkpoint = await Checkpoint.findByPk(id);
    if (!checkpoint) {
      return res.status(404).json({
        success: false,
        message: "Checkpoint not found"
      });
    }

    const updateData = {
      name: name.trim(),
      location: location.trim(),
      description: description?.trim() || null,
      isActive: Boolean(isActive)
    };

    if (coordinates?.latitude !== undefined && coordinates?.longitude !== undefined) {
      if (isNaN(coordinates.latitude) || isNaN(coordinates.longitude) ||
          coordinates.latitude < -90 || coordinates.latitude > 90 ||
          coordinates.longitude < -180 || coordinates.longitude > 180) {
        return res.status(400).json({
          success: false,
          message: "Invalid coordinates provided"
        });
      }
      updateData.latitude = parseFloat(coordinates.latitude);
      updateData.longitude = parseFloat(coordinates.longitude);
    }

    await checkpoint.update(updateData);
    invalidateCache();

    const updatedCheckpoint = await Checkpoint.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.json({
      success: true,
      message: "Checkpoint updated successfully",
      data: { checkpoint: updatedCheckpoint }
    });

  } catch (error) {
    console.error("Error updating checkpoint:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while updating checkpoint"
    });
  }
});

// Toggle checkpoint status
router.patch("/:id/toggle", requireRole("admin"), async (req, res) => {
  const transaction = await sequelize.transaction();
  
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

    const checkpoint = await Checkpoint.findByPk(id, { transaction });
    if (!checkpoint) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Checkpoint not found"
      });
    }

    if (!isActive && checkpoint.isActive) {
      await User.update(
        { assigned_checkpoint_id: null },
        { where: { assigned_checkpoint_id: id }, transaction }
      );
    }

    await checkpoint.update({ isActive }, { transaction });
    await transaction.commit();
    
    invalidateCache();

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
    await transaction.rollback();
    console.error("Error toggling checkpoint status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while updating checkpoint status"
    });
  }
});

// Update patrol status
router.patch("/:id/patrol", fallbackToGuard, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role === 'guard') {
      const guard = await User.findByPk(req.user.id);
      if (!guard || guard.assigned_checkpoint_id !== parseInt(id)) {
        return res.status(403).json({
          success: false,
          message: "Guards can only update patrol status for their assigned checkpoint"
        });
      }
    }

    const checkpoint = await Checkpoint.findByPk(id);
    if (!checkpoint) {
      return res.status(404).json({
        success: false,
        message: "Checkpoint not found"
      });
    }

    checkpoint.lastPatrolled = new Date();
    await checkpoint.save();

    invalidateCache();

    res.json({
      success: true,
      message: "Last patrolled time updated successfully",
      data: {
        checkpointId: checkpoint.id,
        lastPatrolled: checkpoint.lastPatrolled
      }
    });

  } catch (error) {
    console.error("Error updating last patrolled:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while updating last patrolled time"
    });
  }
});

module.exports = router;