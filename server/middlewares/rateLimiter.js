const rateLimit = require("express-rate-limit");

// Limit user creation to avoid abuse
const createUserLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 create requests per IP
  message: "Too many accounts created from this IP, please try again later.",
});

module.exports = { createUserLimiter };
