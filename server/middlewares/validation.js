const { body, validationResult } = require("express-validator");

// Validation rules for creating a user
const validateUser = [
  body("name").notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("role")
    .optional()
    .isIn(["admin", "guard"])
    .withMessage("Invalid role provided"),
];

