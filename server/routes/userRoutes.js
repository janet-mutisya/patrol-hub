// server/routes/userRoutes.js
const express = require("express");
const router = express.Router();

// Import controllers
const {
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
  getUserStats
} = require("../controllers/userController");

// Import middleware
const { auth, requireRole } = require("../middlewares/auth");

/**
 * @route   POST /api/users
 * @desc    Create a new user
 * @access  Private (Admin only)
 */
router.post("/", auth, requireRole(['admin']), createUser);

/**
 * @route   GET /api/users
 * @desc    Get all users with pagination and filters
 * @access  Private (Admin and Supervisor)
 */
router.get("/", auth, requireRole(['admin', 'supervisor']), getAllUsers);

/**
 * @route   GET /api/users/stats
 * @desc    Get user statistics
 * @access  Private (Admin and Supervisor)
 */
router.get("/stats", auth, requireRole(['admin', 'supervisor']), getUserStats);

/**
 * @route   GET /api/users/search
 * @desc    Search users
 * @access  Private (Admin and Supervisor)
 */
router.get("/search", auth, requireRole(['admin', 'supervisor']), searchUsers);

/**
 * @route   GET /api/users/filter
 * @desc    Filter users
 * @access  Private (Admin and Supervisor)
 */
router.get("/filter", auth, requireRole(['admin', 'supervisor']), filterUsers);

/**
 * @route   GET /api/users/inactive
 * @desc    Get inactive users
 * @access  Private (Admin only)
 */
router.get("/inactive", auth, requireRole(['admin']), getInactiveUsers);

/**
 * @route   GET /api/users/export/csv
 * @desc    Export users as CSV
 * @access  Private (Admin only)
 */
router.get("/export/csv", auth, requireRole(['admin']), exportUsersCSV);

/**
 * @route   GET /api/users/export/pdf
 * @desc    Export users as PDF
 * @access  Private (Admin only)
 */
router.get("/export/pdf", auth, requireRole(['admin']), exportUsersPDF);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin, Supervisor, or own profile)
 */
router.get("/:id", auth, requireRole(['admin', 'supervisor', 'guard']), (req, res, next) => {
  // Guards can only view their own profile
  if (req.user.role === 'guard' && req.user.id.toString() !== req.params.id) {
    return res.status(403).json({ error: "Guards can only view their own profile" });
  }
  next();
}, getUserById);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private (Admin or own profile with restrictions)
 */
router.put("/:id", auth, requireRole(['admin', 'supervisor', 'guard']), (req, res, next) => {
  // Guards can only update their own profile and can't change role
  if (req.user.role === 'guard') {
    if (req.user.id.toString() !== req.params.id) {
      return res.status(403).json({ error: "Guards can only update their own profile" });
    }
    // Remove role from update data for guards
    if (req.body.role) {
      delete req.body.role;
    }
  }
  
  // Supervisors can't promote users to admin
  if (req.user.role === 'supervisor' && req.body.role === 'admin') {
    return res.status(403).json({ error: "Supervisors cannot create admin users" });
  }
  
  next();
}, updateUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete/deactivate user
 * @access  Private (Admin only)
 */
router.delete("/:id", auth, requireRole(['admin']), (req, res, next) => {
  // Prevent self-deletion
  if (req.user.id.toString() === req.params.id) {
    return res.status(400).json({ error: "Cannot delete your own account" });
  }
  next();
}, deleteUser);

/**
 * @route   PATCH /api/users/:id/reactivate
 * @desc    Reactivate user
 * @access  Private (Admin only)
 */
router.patch("/:id/reactivate", auth, requireRole(['admin']), reactivateUser);

/**
 * @route   POST /api/users/bulk-update
 * @desc    Bulk update users
 * @access  Private (Admin only)
 */
router.post("/bulk-update", auth, requireRole(['admin']), bulkUpdateUsers);

console.log("📁 userRoutes.js loaded");
module.exports = router;