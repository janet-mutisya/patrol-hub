const { User } = require("../models");
const { Op } = require("sequelize");
const bcrypt = require("bcrypt");
const validator = require("validator");

// Add these imports for PDF and CSV exports
const PDFDocument = require('pdfkit'); // npm install pdfkit
const { Parser } = require('json2csv'); // npm install json2csv

// Validation helper
const validateUserInput = (data, isUpdate = false) => {
  const errors = [];

  if (!isUpdate || data.name) {
    if (!data.name || data.name.trim().length < 2) {
      errors.push("Name must be at least 2 characters long");
    }
  }

  if (!isUpdate || data.email) {
    if (!data.email || !validator.isEmail(data.email)) {
      errors.push("Valid email is required");
    }
  }

  if (!isUpdate || data.password) {
    if (!isUpdate && (!data.password || data.password.length < 6)) {
      errors.push("Password must be at least 6 characters long");
    }
    if (isUpdate && data.password && data.password.length < 6) {
      errors.push("Password must be at least 6 characters long");
    }
  }

  if (!isUpdate || data.role) {
    const validRoles = ["admin", "guard", "supervisor"]; // Added supervisor
    if (!isUpdate && (!data.role || !validRoles.includes(data.role))) {
      errors.push("Valid role is required (admin, guard, supervisor)");
    }
    if (isUpdate && data.role && !validRoles.includes(data.role)) {
      errors.push("Invalid role (admin, guard, supervisor)");
    }
  }

  return errors;
};

// Create user
const createUser = async (req, res) => {
  try {
    const { name, email, role, password } = req.body;

    // Validate input
    const validationErrors = validateUserInput(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: validationErrors 
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return res.status(409).json({ message: "Email already exists" });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role,
      password: hashedPassword,
    });

    // Remove password from response
    const { password: _, ...userResponse } = user.toJSON();

    res.status(201).json({
      message: "User created successfully",
      user: userResponse
    });
  } catch (error) {
    console.error("Error creating user:", error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        message: "Validation error",
        errors: error.errors.map(err => err.message)
      });
    }

    res.status(500).json({ message: "Failed to create user" });
  }
};

// Get all users (with filters & pagination)
const getAllUsers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      role, 
      search, 
      sortBy = "createdAt", 
      sortOrder = "DESC",
      status 
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const where = {};

    // Role filter
    if (role) {
      const validRoles = ["admin", "guard", "supervisor"];
      if (validRoles.includes(role)) {
        where.role = role;
      }
    }

    // Status filter (if you have isActive field)
    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    // Search filter
    if (search && search.trim()) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search.trim()}%` } },
        { email: { [Op.iLike]: `%${search.trim()}%` } },
      ];
    }

    const validSortFields = ["name", "email", "role", "createdAt", "updatedAt"];
    const validSortOrders = ["ASC", "DESC"];
    
    const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
    const sortDirection = validSortOrders.includes(sortOrder.toUpperCase()) 
      ? sortOrder.toUpperCase() 
      : "DESC";

    const users = await User.findAndCountAll({
      where,
      offset: (pageNum - 1) * limitNum,
      limit: limitNum,
      order: [[sortField, sortDirection]],
      attributes: { exclude: ['password'] },
    });

    res.json({
      message: "Users retrieved successfully",
      pagination: {
        total: users.count,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(users.count / limitNum),
      },
      data: users.rows,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

// Get single user
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || (isNaN(id) && !validator.isUUID(id))) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "User retrieved successfully",
      user
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || (isNaN(id) && !validator.isUUID(id))) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const validationErrors = validateUserInput(req.body, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: validationErrors 
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const updateData = { ...req.body };

    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await User.findOne({ 
        where: { 
          email: updateData.email.toLowerCase(),
          id: { [Op.ne]: id }
        } 
      });
      
      if (existingUser) {
        return res.status(409).json({ message: "Email already exists" });
      }
      updateData.email = updateData.email.toLowerCase().trim();
    }

    if (updateData.password) {
      const saltRounds = 12;
      updateData.password = await bcrypt.hash(updateData.password, saltRounds);
    }

    if (updateData.name) {
      updateData.name = updateData.name.trim();
    }

    await user.update(updateData);

    const { password: _, ...userResponse } = user.toJSON();

    res.json({
      message: "User updated successfully",
      user: userResponse
    });
  } catch (error) {
    console.error("Error updating user:", error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        message: "Validation error",
        errors: error.errors.map(err => err.message)
      });
    }

    res.status(500).json({ message: "Failed to update user" });
  }
};

// Soft delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || (isNaN(id) && !validator.isUUID(id))) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isActive !== undefined) {
      await user.update({ isActive: false });
      res.json({ 
        message: "User deactivated successfully",
        user: { id: user.id, isActive: false }
      });
    } else {
      await user.destroy();
      res.json({ 
        message: "User deleted successfully",
        deletedUserId: id
      });
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
};

// Reactivate user
const reactivateUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || (isNaN(id) && !validator.isUUID(id))) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.update({ isActive: true });

    const { password: _, ...userResponse } = user.toJSON();

    res.json({
      message: "User reactivated successfully",
      user: userResponse
    });
  } catch (error) {
    console.error("Error reactivating user:", error);
    res.status(500).json({ message: "Failed to reactivate user" });
  }
};

// Bulk operations
const bulkUpdateUsers = async (req, res) => {
  try {
    const { userIds, updateData } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "Valid user IDs array is required" });
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "Update data is required" });
    }

    const validationErrors = validateUserInput(updateData, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: validationErrors 
      });
    }

    const [updatedCount] = await User.update(updateData, {
      where: { id: { [Op.in]: userIds } }
    });

    res.json({
      message: "Bulk update completed",
      updatedCount
    });
  } catch (error) {
    console.error("Error in bulk update:", error);
    res.status(500).json({ message: "Failed to perform bulk update" });
  }
};

// Search users
const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const users = await User.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.iLike]: `%${query.trim()}%` } },
          { email: { [Op.iLike]: `%${query.trim()}%` } }
        ]
      },
      attributes: { exclude: ['password'] },
      limit: 20
    });

    res.json({
      message: "Search completed successfully",
      data: users
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Search failed" });
  }
};

// Filter users
const filterUsers = async (req, res) => {
  try {
    const { role, isActive, createdAfter, createdBefore } = req.query;
    const where = {};

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (createdAfter) {
      where.createdAt = { [Op.gte]: new Date(createdAfter) };
    }

    if (createdBefore) {
      if (where.createdAt) {
        where.createdAt = { 
          ...where.createdAt,
          [Op.lte]: new Date(createdBefore) 
        };
      } else {
        where.createdAt = { [Op.lte]: new Date(createdBefore) };
      }
    }

    const users = await User.findAll({
      where,
      attributes: { exclude: ['password'] }
    });

    res.json({
      message: "Filter applied successfully",
      data: users
    });
  } catch (error) {
    console.error("Filter error:", error);
    res.status(500).json({ message: "Filter operation failed" });
  }
};

// Get inactive users
const getInactiveUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      where: { isActive: false },
      attributes: { exclude: ['password'] }
    });

    res.json({
      message: "Inactive users retrieved successfully",
      data: users
    });
  } catch (error) {
    console.error("Error fetching inactive users:", error);
    res.status(500).json({ message: "Failed to fetch inactive users" });
  }
};

// Export users as CSV
const exportUsersCSV = async (req, res) => {
  try {
    const users = await User.findAll({ 
      attributes: { exclude: ['password'] } 
    });

    const fields = ['id', 'name', 'email', 'role', 'isActive', 'createdAt'];
    const parser = new Parser({ fields });
    const csv = parser.parse(users.map(u => u.toJSON()));

    res.header('Content-Type', 'text/csv');
    res.attachment('users.csv');
    return res.send(csv);
  } catch (error) {
    console.error('CSV Export error:', error);
    res.status(500).json({ message: 'Failed to export users as CSV' });
  }
};

// Export Users as PDF
const exportUsersPDF = async (req, res) => {
  try {
    const users = await User.findAll({ 
      attributes: { exclude: ['password'] } 
    });

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=users.pdf');

    doc.pipe(res);
    doc.fontSize(18).text('User List', { align: 'center' });
    doc.moveDown();

    users.forEach(u => {
      const userData = u.toJSON();
      doc.fontSize(12).text(
        `Name: ${userData.name}, Email: ${userData.email}, Role: ${userData.role}, Active: ${userData.isActive || 'N/A'}`
      );
      doc.moveDown(0.5);
    });

    doc.end();
  } catch (error) {
    console.error('PDF Export error:', error);
    res.status(500).json({ message: 'Failed to export users as PDF' });
  }
};

// Get user statistics
const getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { isActive: true } });
    const inactiveUsers = totalUsers - activeUsers;
    const admins = await User.count({ where: { role: 'admin' } });
    const guards = await User.count({ where: { role: 'guard' } });
    const supervisors = await User.count({ where: { role: 'supervisor' } });

    res.json({
      message: 'User stats retrieved successfully',
      data: { 
        totalUsers, 
        activeUsers, 
        inactiveUsers, 
        admins, 
        guards,
        supervisors 
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Failed to fetch user stats' });
  }
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  reactivateUser,
  bulkUpdateUsers,
  searchUsers,
  filterUsers,
  getInactiveUsers,
  exportUsersCSV,
  exportUsersPDF,
  getUserStats,
};