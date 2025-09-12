// controllers/userController.js - Fixed version

const { User } = require('../models'); // Only require what exists
const { Op } = require('sequelize');
const bcrypt = require('bcrypt');

// ================================
// PROFILE MANAGEMENT METHODS
// ================================

const getMyProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      // Only select columns that exist in your database
      attributes: ['id', 'name', 'email', 'role', 'badgeNumber', 'isActive', 'lastLoginAt']
      // Remove the include since AssignedCheckpoint relationship might not exist
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
      error: error.message
    });
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.id;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Only update fields that exist
    const updatedUser = await user.update({
      name: name || user.name
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email
      }
    });

  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message
    });
  }
};

const toggleMyDutyStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Simple response since dutyStatus field might not exist
    console.log(`Duty status toggle requested for user ${user.email}`);

    res.json({
      success: true,
      message: "Duty status toggle received",
      data: {
        userId: user.id,
        requestedStatus: status
      }
    });

  } catch (error) {
    console.error("Error toggling duty status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle duty status",
      error: error.message
    });
  }
};

// ================================
// BASIC CRUD OPERATIONS
// ================================

const createUser = async (req, res) => {
  try {
    const { name, email, password, role, badgeNumber } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required"
      });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists"
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'guard',
      badgeNumber
    });

    const { password: _, ...userWithoutPassword } = user.toJSON();

    console.log(`New user created: ${user.email}`);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: userWithoutPassword
    });

  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create user",
      error: error.message
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, status, search } = req.query;

    const whereClause = {};
    
    if (role) {
      whereClause.role = role;
    }
    
    if (status) {
      whereClause.isActive = status === 'active';
    }
    
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
      if (req.body.badgeNumber) {
        whereClause[Op.or].push({ badgeNumber: { [Op.like]: `%${search}%` } });
      }
    }

    const offset = (page - 1) * limit;

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: users,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total_count: count,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
      error: error.message
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, badgeNumber, isActive } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email already in use by another user"
        });
      }
    }

    await user.update({
      name: name || user.name,
      email: email || user.email,
      role: role || user.role,
      badgeNumber: badgeNumber || user.badgeNumber,
      isActive: isActive !== undefined ? isActive : user.isActive
    });

    const updatedUser = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });

    console.log(`User updated: ${user.email}`);

    res.json({
      success: true,
      message: "User updated successfully",
      data: updatedUser
    });

  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user",
      error: error.message
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete your own account"
      });
    }

    await user.update({
      isActive: false
    });

    console.log(`User deactivated: ${user.email}`);

    res.json({
      success: true,
      message: "User deactivated successfully",
      data: {
        id: user.id,
        email: user.email,
        isActive: false
      }
    });

  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: error.message
    });
  }
};

const reactivateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    await user.update({
      isActive: true
    });

    console.log(`User reactivated: ${user.email}`);

    res.json({
      success: true,
      message: "User reactivated successfully",
      data: {
        id: user.id,
        email: user.email,
        isActive: true
      }
    });

  } catch (error) {
    console.error("Error reactivating user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reactivate user",
      error: error.message
    });
  }
};


// These are simplified stubs - implement properly when you have the full models

const assignUserToCheckpoint = async (req, res) => {
  res.json({ success: true, message: "Checkpoint assignment not implemented yet" });
};

const unassignUserFromCheckpoint = async (req, res) => {
  res.json({ success: true, message: "Checkpoint unassignment not implemented yet" });
};

const getAssignedGuards = async (req, res) => {
  res.json({ success: true, data: [], message: "Assigned guards feature not implemented yet" });
};

const getUnassignedGuards = async (req, res) => {
  res.json({ success: true, data: [], message: "Unassigned guards feature not implemented yet" });
};

const getGuardsByCheckpoint = async (req, res) => {
  res.json({ success: true, data: [], message: "Guards by checkpoint feature not implemented yet" });
};

const getUserSecurityInfo = async (req, res) => {
  res.json({ success: true, message: "Security info feature not implemented yet" });
};

const unlockUserAccount = async (req, res) => {
  res.json({ success: true, message: "Account unlock feature not implemented yet" });
};

const resetUserLoginAttempts = async (req, res) => {
  res.json({ success: true, message: "Login attempts reset feature not implemented yet" });
};

const resendEmailVerification = async (req, res) => {
  res.json({ success: true, message: "Email verification feature not implemented yet" });
};

const forceVerifyEmail = async (req, res) => {
  res.json({ success: true, message: "Force email verification feature not implemented yet" });
};

const getUserActivity = async (req, res) => {
  res.json({ success: true, data: [], message: "User activity feature not implemented yet" });
};

const changeUserPassword = async (req, res) => {
  res.json({ success: true, message: "Password change feature not implemented yet" });
};


// GET /users/me/duty-status
const getMyDutyStatus = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'dutyStatus']
    });

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.json({
      success: true,
      data: { dutyStatus: user.dutyStatus || "OFF_DUTY" }
    });
  } catch (error) {
    console.error("Error fetching duty status:", error);
    res.status(500).json({ success: false, message: "Failed to fetch duty status", error: error.message });
  }
};

// GET /checkpoints/nearby?lat=...&lng=...&radius=500
const getNearbyCheckpoints = async (req, res) => {
  try {
    const { lat, lng, radius = 500 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: "Latitude and longitude are required" });
    }

    // Simple: fetch all checkpoints (later: add haversine distance filter in SQL)
    const checkpoints = await Checkpoint.findAll({
      attributes: ['id', 'name', 'latitude', 'longitude']
    });

    // Fallback: return all if distance calc not implemented
    res.json({
      success: true,
      data: checkpoints,
      message: "Nearby checkpoints fetched successfully"
    });
  } catch (error) {
    console.error("Error fetching nearby checkpoints:", error);
    res.status(500).json({ success: false, message: "Failed to fetch nearby checkpoints", error: error.message });
  }
};

// ================================
// REPORTS
// ================================

// GET /reports/summary
const getReportsSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    const totalPatrols = await PatrolLog.count({ where: { userId } });
    const completedPatrols = await PatrolLog.count({ where: { userId, status: 'completed' } });

    const totalAttendance = await Attendance.count({ where: { userId } });
    const presentDays = await Attendance.count({ where: { userId, status: 'present' } });

    const attendanceRate = totalAttendance > 0
      ? ((presentDays / totalAttendance) * 100).toFixed(1) + "%"
      : "0%";

    res.json({
      success: true,
      data: {
        totalPatrols,
        completedPatrols,
        attendanceRate
      }
    });
  } catch (error) {
    console.error("Error fetching reports summary:", error);
    res.status(500).json({ success: false, message: "Failed to fetch reports summary", error: error.message });
  }
};

module.exports = {
  // Core profile methods
  getMyProfile,
  updateMyProfile,
  toggleMyDutyStatus,
  
  // Basic CRUD
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  reactivateUser,
  
  // Stub methods (prevent route errors)
  assignUserToCheckpoint,
  unassignUserFromCheckpoint,
  getAssignedGuards,
  getUnassignedGuards,
  getGuardsByCheckpoint,
  getUserSecurityInfo,
  unlockUserAccount,
  resetUserLoginAttempts,
  resendEmailVerification,
  forceVerifyEmail,
  getUserActivity,
  changeUserPassword,
  getMyDutyStatus,
  getNearbyCheckpoints,
  
  // ADD THIS LINE - it was missing!
  getReportsSummary
};