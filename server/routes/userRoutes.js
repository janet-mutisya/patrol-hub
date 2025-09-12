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
  getMyProfile,
  updateMyProfile,
  toggleMyDutyStatus,
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
  getReportsSummary
} = require("../controllers/userController");

// DEBUG: Check which functions are undefined
console.log("=== DEBUGGING IMPORTED FUNCTIONS ===");
const imports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  reactivateUser,
  getMyProfile,
  updateMyProfile,
  toggleMyDutyStatus,
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
  getReportsSummary
};

Object.entries(imports).forEach(([name, func]) => {
  if (typeof func !== 'function') {
    console.log(`❌ ${name} is ${typeof func} (${func})`);
  } else {
    console.log(`✅ ${name} is a function`);
  }
});
console.log("=== END DEBUG ===");

// Import middleware
const { auth, requireRole } = require("../middlewares/auth");

// Test route
router.get("/test", (req, res) => {
  res.json({ success: true, message: "User routes are working!", timestamp: new Date() });
});

// Profile routes - MUST come before /:id routes (available to authenticated users)
router.get("/me", auth, getMyProfile);
router.patch("/me", auth, updateMyProfile);
router.patch("/me/duty-status", auth, toggleMyDutyStatus);
router.get("/me/duty-status", auth, getMyDutyStatus);

// Reports & Checkpoints - Available to authenticated users
router.get("/checkpoints/nearby", auth, getNearbyCheckpoints);
router.get("/reports/summary", auth, getReportsSummary);

// Admin-only management routes (before /:id)
router.get("/assigned", auth, requireRole(['admin']), getAssignedGuards);
router.get("/unassigned", auth, requireRole(['admin']), getUnassignedGuards);
router.get("/checkpoint/:checkpointId/guards", auth, requireRole(['admin']), getGuardsByCheckpoint);

// Basic CRUD routes - Admin only
router.get("/", auth, requireRole(['admin']), getAllUsers);
router.post("/", auth, requireRole(['admin']), createUser);

// Individual user routes - Admin only (MUST come last due to /:id pattern)
router.get("/:id/security", auth, requireRole(['admin']), getUserSecurityInfo);
router.get("/:id/activity", auth, requireRole(['admin']), getUserActivity);
router.get("/:id", auth, requireRole(['admin']), getUserById);
router.patch("/:id", auth, requireRole(['admin']), updateUser);
router.delete("/:id", auth, requireRole(['admin']), deleteUser);
router.patch("/:id/reactivate", auth, requireRole(['admin']), reactivateUser);
router.patch("/:id/assign-checkpoint", auth, requireRole(['admin']), assignUserToCheckpoint);
router.patch("/:id/unassign-checkpoint", auth, requireRole(['admin']), unassignUserFromCheckpoint);
router.patch("/:id/unlock", auth, requireRole(['admin']), unlockUserAccount);
router.patch("/:id/reset-login-attempts", auth, requireRole(['admin']), resetUserLoginAttempts);
router.patch("/:id/change-password", auth, requireRole(['admin']), changeUserPassword);
router.post("/:id/resend-verification", auth, requireRole(['admin']), resendEmailVerification);
router.patch("/:id/force-verify", auth, requireRole(['admin']), forceVerifyEmail);

module.exports = router;