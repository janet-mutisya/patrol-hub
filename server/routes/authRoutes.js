// server/routes/authRoutes.js
const express = require("express");
const router = express.Router();
const {
  register,
  login,
  profile,
  updateProfile,
  changePassword,
  logout,
  refreshToken,
  authLimiter,
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation
} = require("../controllers/authController");

// Import auth middleware
const { auth } = require("../middlewares/auth");

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post("/register", authLimiter, registerValidation, register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post("/login", authLimiter, loginValidation, login);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get("/profile", auth, profile);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put("/profile", auth, updateProfileValidation, updateProfile);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put("/change-password", auth, changePasswordValidation, changePassword);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post("/logout", auth, logout);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh JWT token
 * @access  Private
 */
router.post("/refresh-token", auth, refreshToken);

console.log("📁 authRoutes.js loaded");
console.log("✅ Auth routes defined successfully");

module.exports = router;