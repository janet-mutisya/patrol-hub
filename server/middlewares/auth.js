const jwt = require("jsonwebtoken");
const { User } = require("../models");

// Verify JWT token and attach user to request
const auth = async (req, res, next) => {
  console.log("Incoming auth header:", req.headers.authorization);
  
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // Get JWT secret - remove the fallback that might cause confusion
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error("JWT_SECRET environment variable is not set!");
      return res.status(500).json({ message: "Server configuration error" });
    }

    console.log("Using JWT_SECRET:", JWT_SECRET.substring(0, 10) + "...");
    console.log("Token to verify:", token.substring(0, 50) + "...");

    // First decode without verification to see token contents for debugging
    const decodedPayload = jwt.decode(token);
    console.log("Token payload (unverified):", {
      id: decodedPayload?.id,
      email: decodedPayload?.email,
      role: decodedPayload?.role,
      iat: decodedPayload?.iat,
      exp: decodedPayload?.exp,
      iss: decodedPayload?.iss,
      aud: decodedPayload?.aud
    });

    // Check token age
    if (decodedPayload?.iat) {
      const tokenAgeHours = Math.floor((Date.now() / 1000 - decodedPayload.iat) / 3600);
      console.log("Token age (hours):", tokenAgeHours);
    }

    // Now verify with the secret
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("✅ Token verified successfully");

    // Find user in database
    const user = await User.findByPk(decoded.id);

    if (!user) {
      console.log("❌ User not found for ID:", decoded.id);
      return res.status(401).json({ message: "User not found" });
    }

    if (!user.isActive) {
      console.log("User account is inactive:", user.email);
      return res.status(403).json({ message: "Account deactivated" });
    }

    console.log("User authenticated:", user.email, "Role:", user.role);
    req.user = user; // attach full user object
    next();
    
  } catch (error) {
    console.error("Auth error:", error.name, "-", error.message);
    
    // Enhanced error debugging
    if (error.name === 'JsonWebTokenError') {
      console.error("JWT Error Details:", error.message);
      
      // Try to identify what secret might have been used
      const token = req.headers.authorization?.split(" ")[1];
      if (token) {
        // Test common secrets that might have been used previously
        const testSecrets = [
          'secretkey',
          'secret', 
          'jwtsecret',
          'supersecretkey',
          'defaultsecret'
        ];
        
        console.log("Testing alternative secrets to identify the issue...");
        
        for (const testSecret of testSecrets) {
          try {
            jwt.verify(token, testSecret);
            console.log(`FOUND: Token was signed with secret: "${testSecret}"`);
            console.log("Your current JWT_SECRET is:", process.env.JWT_SECRET);
            console.log("Solution: User needs to login again to get a token with the current secret");
            break;
          } catch (e) {
            // Secret didn't work, continue testing
          }
        }
      }
      
      return res.status(401).json({ 
        message: "Invalid token - please login again",
        error: "INVALID_TOKEN"
      });
    } else if (error.name === 'TokenExpiredError') {
      console.error("Token expired at:", new Date(error.expiredAt));
      return res.status(401).json({ 
        message: "Token expired - please login again",
        error: "TOKEN_EXPIRED"
      });
    } else if (error.name === 'NotBeforeError') {
      return res.status(401).json({ 
        message: "Token not active yet",
        error: "TOKEN_NOT_ACTIVE"
      });
    } else {
      console.error("Unexpected auth error:", error);
      return res.status(401).json({ 
        message: "Authentication failed - please login again",
        error: "AUTH_FAILED"
      });
    }
  }
};

// Role-based middleware
const requireRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    // Convert single role to array for consistency
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      console.log(`Access denied. User role: ${req.user.role}, Required: ${allowedRoles.join(', ')}`);
      return res.status(403).json({ 
        message: "Forbidden: Insufficient permissions",
        required: allowedRoles,
        current: req.user.role
      });
    }
    
    console.log(`Role check passed. User: ${req.user.email}, Role: ${req.user.role}`);
    next();
  };
};
// Middleware: fallback all non-admins to 'guard'
const fallbackToGuard = (req, res, next) => {
  if (req.user.role !== 'admin') {
    req.user.role = 'guard';
    console.log(`Role fallback applied. User is now treated as guard.`);
  }
  next();
};

module.exports = { auth, requireRole, fallbackToGuard };