const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const { User } = require("../models");

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    message: "Too many authentication attempts, please try again later"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation middleware
const registerValidation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Name can only contain letters and spaces"),
  
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage("Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"),
  
  body("role")
    .optional()
    .isIn(["admin", "guard", "manager"])
    .withMessage("Role must be admin, guard, or manager")
];

const loginValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  
  body("password")
    .notEmpty()
    .withMessage("Password is required")
];

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      role: user.role,
      email: user.email 
    },
    process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production",
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || "24h",
      issuer: "security-system",
      audience: "security-app"
    }
  );
};

// Helper function to sanitize user data
const sanitizeUser = (user) => {
  const { password, ...sanitizedUser } = user.toJSON();
  return sanitizedUser;
};

// Register new user
const register = async (req, res) => {
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

    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists"
      });
    }

    // Create new user - let the model hook handle password hashing
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      password: password, // Don't hash here - model hook will handle it
      role: role || "guard",
      isActive: true,
      createdAt: new Date(),
      lastLogin: null
    });

    // Generate token
    const token = generateToken(user);

    // Log successful registration (without sensitive data)
    console.log(`New user registered: ${user.email} with role: ${user.role}`);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: sanitizeUser(user),
        token
      }
    });

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during registration"
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    console.log("Login attempt for:", req.body.email);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("Validation errors:", errors.array());
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    // Find user with password scope
    const user = await User.scope("withPassword").findOne({
      where: { email: email.toLowerCase() },
    });

    console.log("User found:", user ? "Yes" : "No");
    console.log("User active:", user ? user.isActive : "N/A");

    if (!user) {
      console.log("User not found for email:", email);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // If account inactive
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account has been deactivated. Please contact administrator.",
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log("Password valid:", isPasswordValid);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Update last login timestamp
    await user.update({ lastLoginAt: new Date() });
  
    // Generate JWT with consistent secret
    const token = generateToken(user);

    console.log(`User logged in: ${user.email} as ${user.role}`);
    
    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: sanitizeUser(user),
        role: user.role,
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || "24h",
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during login",
    });
  }
};
// Get user profile
const profile = async (req, res) => {
  try {
    // req.user is set by auth middleware
    const user = await User.findByPk(req.user.id, {
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
      data: {
        user: sanitizeUser(user)
      }
    });

  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching profile"
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const { name, email } = req.body;
    const userId = req.user.id;

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({
        where: { 
          email: email.toLowerCase(),
          id: { [require('sequelize').Op.ne]: userId }
        }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Email is already in use by another account"
        });
      }
    }

    // Update user
    const [updatedRowsCount] = await User.update(
      {
        ...(name && { name: name.trim() }),
        ...(email && { email: email.toLowerCase() })
      },
      { where: { id: userId } }
    );

    if (updatedRowsCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Fetch updated user
    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: sanitizeUser(updatedUser)
      }
    });

  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while updating profile"
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Find user with password
    const user = await User.scope("withPassword").findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    // Update password - let the model hook handle hashing
    await user.update({ password: newPassword });

    console.log(`Password changed for user: ${user.email}`);

    res.json({
      success: true,
      message: "Password changed successfully"
    });

  } catch (error) {
    console.error("Password change error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while changing password"
    });
  }
};

// Logout user (if using token blacklisting)
const logout = async (req, res) => {
  try {
    // In a production app, you might want to blacklist the token
    // For now, we'll just send a success response
    console.log(`User logged out: ${req.user.email}`);
    
    res.json({
      success: true,
      message: "Logged out successfully"
    });

  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during logout"
    });
  }
};

// Refresh token
const refreshToken = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: "User not found or inactive"
      });
    }

    // Generate new token
    const token = generateToken(user);

    res.json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || "24h"
      }
    });

  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while refreshing token"
    });
  }
};

// Validation for profile update
const updateProfileValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Name can only contain letters and spaces"),
  
  body("email")
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address")
];

// Validation for password change
const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage("New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character")
];

module.exports = {
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
};