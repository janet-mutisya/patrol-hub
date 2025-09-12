const { Checkpoint, User, PatrolLog, Attendance, AuditLog } = require("../models");
const { Op, sequelize } = require("sequelize");
const { body, validationResult } = require("express-validator");
const NodeCache = require('node-cache');

// Initialize cache with 5 minute TTL for active checkpoints
const checkpointCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Audit logging utility
const logAuditAction = async (action, entityType, entityId, userId, details = {}, transaction = null) => {
  try {
    await AuditLog.create({
      action,
      entityType,
      entityId,
      userId,
      details: JSON.stringify(details),
      ipAddress: details.ipAddress || null,
      userAgent: details.userAgent || null
    }, { transaction });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};

// Cache management utilities
const getCachedCheckpoints = (key) => {
  return checkpointCache.get(key);
};

const setCachedCheckpoints = (key, data, ttl = null) => {
  checkpointCache.set(key, data, ttl || 300); // 5 minutes default
};

const invalidateCheckpointCache = () => {
  checkpointCache.flushAll();
  console.log('Checkpoint cache invalidated');
};

// Bulk assignment validation
const bulkAssignValidation = [
  body("assignments")
    .isArray({ min: 1, max: 50 })
    .withMessage("Assignments must be an array with 1-50 items"),
  
  body("assignments.*.checkpointId")
    .isInt({ min: 1 })
    .withMessage("Each assignment must have a valid checkpointId"),
  
  body("assignments.*.guardId")
    .isInt({ min: 1 })
    .withMessage("Each assignment must have a valid guardId"),
];

// Bulk assignment operation with transaction and audit logging
const bulkAssignCheckpoints = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const { assignments } = req.body;
    const results = {
      successful: [],
      failed: [],
      summary: { total: assignments.length, success: 0, failures: 0 }
    };

    // Validate all checkpoints and guards first
    const checkpointIds = assignments.map(a => a.checkpointId);
    const guardIds = assignments.map(a => a.guardId);

    const [checkpoints, guards] = await Promise.all([
      Checkpoint.findAll({
        where: { 
          id: { [Op.in]: checkpointIds },
          isActive: true 
        },
        transaction
      }),
      User.findAll({
        where: { 
          id: { [Op.in]: guardIds },
          role: 'guard',
          isActive: true 
        },
        transaction
      })
    ]);

    const validCheckpointIds = new Set(checkpoints.map(c => c.id));
    const validGuardIds = new Set(guards.map(g => g.id));
    const guardAssignments = new Map(guards.map(g => [g.id, g.assigned_checkpoint_id]));

    // Process each assignment
    for (const assignment of assignments) {
      const { checkpointId, guardId } = assignment;
      
      try {
        // Validation checks
        if (!validCheckpointIds.has(checkpointId)) {
          throw new Error(`Checkpoint ${checkpointId} not found or inactive`);
        }
        
        if (!validGuardIds.has(guardId)) {
          throw new Error(`Guard ${guardId} not found or inactive`);
        }
        
        if (guardAssignments.get(guardId)) {
          throw new Error(`Guard ${guardId} is already assigned to checkpoint ${guardAssignments.get(guardId)}`);
        }

        // Check checkpoint capacity
        const checkpoint = checkpoints.find(c => c.id === checkpointId);
        const currentAssignedCount = await User.count({
          where: { assigned_checkpoint_id: checkpointId },
          transaction
        });

        if (currentAssignedCount >= checkpoint.maxAssignedGuards) {
          throw new Error(`Checkpoint ${checkpointId} has reached maximum capacity`);
        }

        // Perform assignment
        await User.update(
          { assigned_checkpoint_id: checkpointId },
          { where: { id: guardId }, transaction }
        );

        // Update local tracking
        guardAssignments.set(guardId, checkpointId);

        // Log audit trail
        await logAuditAction(
          'BULK_ASSIGN',
          'CHECKPOINT_GUARD_ASSIGNMENT',
          checkpointId,
          req.user.id,
          { 
            guardId, 
            checkpointId,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          },
          transaction
        );

        results.successful.push({
          checkpointId,
          guardId,
          checkpointName: checkpoint.name,
          guardName: guards.find(g => g.id === guardId).name
        });
        results.summary.success++;

      } catch (error) {
        results.failed.push({
          checkpointId,
          guardId,
          error: error.message
        });
        results.summary.failures++;
      }
    }

    await transaction.commit();

    // Invalidate cache after successful assignments
    if (results.summary.success > 0) {
      invalidateCheckpointCache();
    }

    console.log(`Bulk assignment completed: ${results.summary.success}/${results.summary.total} successful by ${req.user.email}`);

    res.json({
      success: true,
      message: `Bulk assignment completed: ${results.summary.success}/${results.summary.total} successful`,
      data: results
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Error in bulk assignment:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during bulk assignment",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Bulk unassignment operation
const bulkUnassignCheckpoints = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { guardIds } = req.body;

    if (!Array.isArray(guardIds) || guardIds.length === 0 || guardIds.length > 50) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "guardIds must be an array with 1-50 items"
      });
    }

    const guards = await User.findAll({
      where: { 
        id: { [Op.in]: guardIds },
        role: 'guard',
        isActive: true 
      },
      include: [{
        model: Checkpoint,
        as: 'AssignedCheckpoint',
        attributes: ['id', 'name']
      }],
      transaction
    });

    const results = {
      successful: [],
      failed: [],
      summary: { total: guardIds.length, success: 0, failures: 0 }
    };

    for (const guardId of guardIds) {
      try {
        const guard = guards.find(g => g.id === guardId);
        
        if (!guard) {
          throw new Error(`Guard ${guardId} not found or inactive`);
        }

        const previousCheckpoint = guard.AssignedCheckpoint;
        
        await guard.update({ assigned_checkpoint_id: null }, { transaction });

        // Log audit trail
        await logAuditAction(
          'BULK_UNASSIGN',
          'CHECKPOINT_GUARD_ASSIGNMENT',
          previousCheckpoint?.id || null,
          req.user.id,
          { 
            guardId, 
            previousCheckpointId: previousCheckpoint?.id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          },
          transaction
        );

        results.successful.push({
          guardId,
          guardName: guard.name,
          previousCheckpoint: previousCheckpoint?.name || 'None'
        });
        results.summary.success++;

      } catch (error) {
        results.failed.push({
          guardId,
          error: error.message
        });
        results.summary.failures++;
      }
    }

    await transaction.commit();

    // Invalidate cache after successful unassignments
    if (results.summary.success > 0) {
      invalidateCheckpointCache();
    }

    console.log(`Bulk unassignment completed: ${results.summary.success}/${results.summary.total} successful by ${req.user.email}`);

    res.json({
      success: true,
      message: `Bulk unassignment completed: ${results.summary.success}/${results.summary.total} successful`,
      data: results
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Error in bulk unassignment:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during bulk unassignment",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Enhanced getActiveCheckpoints with caching
const getActiveCheckpointsWithCache = async (req, res) => {
  try {
    const cacheKey = 'active_checkpoints';
    
    // Try to get from cache first
    let checkpoints = getCachedCheckpoints(cacheKey);
    
    if (!checkpoints) {
      console.log('Cache miss - fetching active checkpoints from database');
      
      checkpoints = await Checkpoint.findAll({
        where: { isActive: true },
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email']
          },
          {
            model: User,
            as: 'AssignedGuards',
            attributes: ['id', 'name', 'email', 'badgeNumber'],
            where: { isActive: true },
            required: false
          }
        ],
        order: [['priority', 'DESC'], ['name', 'ASC']]
      });

      // Cache the results
      setCachedCheckpoints(cacheKey, checkpoints, 300); // 5 minutes
    } else {
      console.log('Cache hit - returning cached active checkpoints');
    }

    // Enhance with computed fields (these shouldn't be cached as they change frequently)
    const enhancedCheckpoints = await Promise.all(
      checkpoints.map(async (checkpoint) => {
        const data = checkpoint.toJSON ? checkpoint.toJSON() : checkpoint;
        data.isOverdue = checkpoint.isOverdue ? checkpoint.isOverdue() : false;
        data.hasValidCoordinates = checkpoint.hasValidCoordinates ? checkpoint.hasValidCoordinates() : false;
        data.assignedGuardCount = data.AssignedGuards ? data.AssignedGuards.length : 0;
        data.canAssignMore = data.assignedGuardCount < (checkpoint.maxAssignedGuards || 1);
        return data;
      })
    );

    res.json({
      success: true,
      data: { 
        checkpoints: enhancedCheckpoints,
        cached: checkpoints !== getCachedCheckpoints(cacheKey) ? false : true,
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
};

// Optimized nearby checkpoints with spatial indexing support
const getNearbyCheckpointsOptimized = async (req, res) => {
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

    // Use raw SQL for better performance with spatial indexing
    const checkpoints = await sequelize.query(`
      SELECT 
        c.*,
        ST_Distance(
          ST_Point(c.longitude, c.latitude)::geography,
          ST_Point(:longitude, :latitude)::geography
        ) as distance
      FROM checkpoints c
      WHERE 
        c.is_active = true 
        AND c.latitude IS NOT NULL 
        AND c.longitude IS NOT NULL
        AND ST_DWithin(
          ST_Point(c.longitude, c.latitude)::geography,
          ST_Point(:longitude, :latitude)::geography,
          :radius
        )
      ORDER BY distance ASC
      LIMIT 50
    `, {
      replacements: { latitude, longitude, radius },
      type: sequelize.QueryTypes.SELECT
    });

    // Get additional data for each checkpoint
    const enhancedCheckpoints = await Promise.all(
      checkpoints.map(async (checkpoint) => {
        const guardCount = await User.count({
          where: { 
            assigned_checkpoint_id: checkpoint.id,
            isActive: true 
          }
        });
        
        return {
          ...checkpoint,
          assignedGuardCount: guardCount,
          distance: Math.round(checkpoint.distance),
          withinGeofence: checkpoint.distance <= (checkpoint.geofence_radius || 50)
        };
      })
    );

    res.json({
      success: true,
      data: {
        checkpoints: enhancedCheckpoints,
        userLocation: { latitude, longitude },
        searchRadius: radius,
        count: enhancedCheckpoints.length
      }
    });

  } catch (error) {
    console.error("Error fetching nearby checkpoints:", error);
    
    // Fallback to original method if spatial queries fail
    if (error.name === 'SequelizeDatabaseError') {
      console.log("Falling back to haversine distance calculation");
      return getNearbyCheckpointsFallback(req, res);
    }
    
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching nearby checkpoints"
    });
  }
};

// Fallback method using Haversine formula
const getNearbyCheckpointsFallback = async (req, res) => {
  try {
    const { latitude, longitude, radius = 1000 } = req.body;

    const checkpoints = await Checkpoint.findAll({
      where: {
        isActive: true,
        latitude: { [Op.not]: null },
        longitude: { [Op.not]: null }
      },
      attributes: {
        include: [
          [
            sequelize.literal(
              `(6371000 * ACOS(
                GREATEST(-1, LEAST(1,
                  COS(RADIANS(${latitude})) * 
                  COS(RADIANS(latitude)) * 
                  COS(RADIANS(longitude) - RADIANS(${longitude})) + 
                  SIN(RADIANS(${latitude})) * 
                  SIN(RADIANS(latitude))
                ))
              ))`
            ),
            'distance'
          ]
        ]
      },
      having: sequelize.literal(`distance <= ${radius}`),
      order: [[sequelize.literal('distance'), 'ASC']],
      limit: 50
    });

    const enhancedCheckpoints = await Promise.all(
      checkpoints.map(async (checkpoint) => {
        const data = checkpoint.toJSON();
        data.assignedGuardCount = await checkpoint.getAssignedGuardCount();
        data.withinGeofence = checkpoint.isWithinGeofence(latitude, longitude);
        data.distance = Math.round(data.distance);
        return data;
      })
    );

    res.json({
      success: true,
      data: {
        checkpoints: enhancedCheckpoints,
        userLocation: { latitude, longitude },
        searchRadius: radius,
        count: enhancedCheckpoints.length
      }
    });

  } catch (error) {
    console.error("Error in fallback nearby checkpoints:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching nearby checkpoints"
    });
  }
};

// Audit log retrieval
const getAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      entityType,
      action,
      userId,
      startDate,
      endDate
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (entityType) where.entityType = entityType;
    if (action) where.action = action;
    if (userId) where.userId = userId;
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    const { count, rows: auditLogs } = await AuditLog.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'role']
      }]
    });

    res.json({
      success: true,
      data: {
        auditLogs: auditLogs.map(log => ({
          ...log.toJSON(),
          details: JSON.parse(log.details || '{}')
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          totalRecords: count,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching audit logs"
    });
  }
};

// Cache statistics endpoint
const getCacheStats = async (req, res) => {
  try {
    const stats = checkpointCache.getStats();
    
    res.json({
      success: true,
      data: {
        cacheStats: stats,
        keys: checkpointCache.keys(),
        ttl: {
          remaining: checkpointCache.getTtl('active_checkpoints'),
          default: 300
        }
      }
    });

  } catch (error) {
    console.error("Error fetching cache stats:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching cache stats"
    });
  }
};

// Manual cache invalidation endpoint
const invalidateCache = async (req, res) => {
  try {
    const { key } = req.body;
    
    if (key) {
      checkpointCache.del(key);
      console.log(`Cache key '${key}' invalidated by ${req.user.email}`);
    } else {
      invalidateCheckpointCache();
      console.log(`All cache invalidated by ${req.user.email}`);
    }

    res.json({
      success: true,
      message: key ? `Cache key '${key}' invalidated` : "All cache invalidated"
    });

  } catch (error) {
    console.error("Error invalidating cache:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while invalidating cache"
    });
  }
};

module.exports = {
  bulkAssignCheckpoints,
  bulkUnassignCheckpoints,
  getActiveCheckpointsWithCache,
  getNearbyCheckpointsOptimized,
  getNearbyCheckpointsFallback,
  getAuditLogs,
  getCacheStats,
  invalidateCache,
  // Validation middleware
  bulkAssignValidation,
  // Utility functions
  logAuditAction,
  invalidateCheckpointCache,
  getCachedCheckpoints,
  setCachedCheckpoints
};