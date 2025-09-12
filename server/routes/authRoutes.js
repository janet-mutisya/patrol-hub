const express = require('express');
const router = express.Router();
const { auth, requireRole, fallbackToGuard } = require('../middlewares/auth');
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
} = require('../controllers/authController');

// ================================
// PUBLIC ROUTES (No authentication required)
// ================================

// Register new user (with rate limiting)
router.post('/register', 
  authLimiter,
  registerValidation,
  register
);

// Login user (with rate limiting)
router.post('/login', 
  authLimiter,
  loginValidation,
  login
);

// ================================
// PROTECTED ROUTES (Authentication required)
// ================================

// Get user profile (All authenticated users)
router.get('/profile', 
  auth,
  profile
);

// Update user profile (All authenticated users)
router.put('/profile', 
  auth,
  updateProfileValidation,
  updateProfile
);

// Change password (All authenticated users)
router.put('/change-password', 
  auth,
  changePasswordValidation,
  changePassword
);

// Refresh JWT token (All authenticated users)
router.post('/refresh-token', 
  auth,
  refreshToken
);

// Logout user (All authenticated users)
router.post('/logout', 
  auth,
  logout
);

// ================================
// ADMIN ONLY ROUTES
// ================================

// Create user accounts (Admin only)
router.post('/create-user', 
  auth,
  requireRole(['admin']),
  registerValidation,
  register
);

// ================================
// ROLE-SPECIFIC ROUTES
// ================================

// Guard-specific profile endpoint
router.get('/guard/profile', 
  auth,
  fallbackToGuard,
  requireRole(['guard']),
  profile
);

// Admin-specific profile endpoint
router.get('/admin/profile', 
  auth,
  requireRole(['admin']),
  profile
);

// ================================
// TOKEN VALIDATION ROUTE
// ================================

// Validate token (useful for frontend to check if token is still valid)
router.get('/validate-token', 
  auth,
  (req, res) => {
    res.json({
      success: true,
      message: "Token is valid",
      data: {
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          isActive: req.user.isActive
        }
      }
    });
  }
);

module.exports = router;
