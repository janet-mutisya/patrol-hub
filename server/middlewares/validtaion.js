// Create this as middlewares/validations.js

/**
 * Validation middleware for attendance operations
 */

console.log('Validations middleware loading...');

const validateCheckIn = (req, res, next) => {
  const { latitude, longitude } = req.body;

  // Validate required fields
  if (!latitude || !longitude) {
    return res.status(400).json({
      success: false,
      error: 'Latitude and longitude are required',
      code: 'MISSING_LOCATION'
    });
  }

  // Validate coordinate format
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid coordinate format',
      code: 'INVALID_COORDINATES'
    });
  }

  // Validate coordinate ranges
  if (lat < -90 || lat > 90) {
    return res.status(400).json({
      success: false,
      error: 'Latitude must be between -90 and 90',
      code: 'INVALID_LATITUDE'
    });
  }

  if (lng < -180 || lng > 180) {
    return res.status(400).json({
      success: false,
      error: 'Longitude must be between -180 and 180',
      code: 'INVALID_LONGITUDE'
    });
  }

  // Add parsed values to request
  req.body.latitude = lat;
  req.body.longitude = lng;

  next();
};

const validateCheckOut = (req, res, next) => {
  const { latitude, longitude } = req.body;

  // Validate required fields
  if (!latitude || !longitude) {
    return res.status(400).json({
      success: false,
      error: 'Latitude and longitude are required for check-out',
      code: 'MISSING_LOCATION'
    });
  }

  // Validate coordinate format
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid coordinate format',
      code: 'INVALID_COORDINATES'
    });
  }

  // Validate coordinate ranges
  if (lat < -90 || lat > 90) {
    return res.status(400).json({
      success: false,
      error: 'Latitude must be between -90 and 90',
      code: 'INVALID_LATITUDE'
    });
  }

  if (lng < -180 || lng > 180) {
    return res.status(400).json({
      success: false,
      error: 'Longitude must be between -180 and 180',
      code: 'INVALID_LONGITUDE'
    });
  }

  // Add parsed values to request
  req.body.latitude = lat;
  req.body.longitude = lng;

  next();
};

const validateMarkOff = (req, res, next) => {
  const { guard_id, shift_id } = req.body;

  // Validate required fields
  if (!guard_id) {
    return res.status(400).json({
      success: false,
      error: 'Guard ID is required',
      code: 'MISSING_GUARD_ID'
    });
  }

  if (!shift_id) {
    return res.status(400).json({
      success: false,
      error: 'Shift ID is required',
      code: 'MISSING_SHIFT_ID'
    });
  }

  // Validate IDs are numeric
  if (isNaN(parseInt(guard_id))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid guard ID format',
      code: 'INVALID_GUARD_ID'
    });
  }

  if (isNaN(parseInt(shift_id))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid shift ID format',
      code: 'INVALID_SHIFT_ID'
    });
  }

  next();
};

const validateDateRange = (req, res, next) => {
  const { date_from, date_to } = req.query;

  if (date_from) {
    const fromDate = new Date(date_from);
    if (isNaN(fromDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date_from format. Use YYYY-MM-DD',
        code: 'INVALID_DATE_FROM'
      });
    }
  }

  if (date_to) {
    const toDate = new Date(date_to);
    if (isNaN(toDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date_to format. Use YYYY-MM-DD',
        code: 'INVALID_DATE_TO'
      });
    }
  }

  if (date_from && date_to) {
    const fromDate = new Date(date_from);
    const toDate = new Date(date_to);
    
    if (fromDate > toDate) {
      return res.status(400).json({
        success: false,
        error: 'date_from cannot be later than date_to',
        code: 'INVALID_DATE_RANGE'
      });
    }

    // Limit date range to prevent huge queries
    const daysDiff = Math.floor((toDate - fromDate) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      return res.status(400).json({
        success: false,
        error: 'Date range cannot exceed 365 days',
        code: 'DATE_RANGE_TOO_LARGE'
      });
    }
  }

  next();
};

const validatePaginationParams = (req, res, next) => {
  const { page, limit } = req.query;

  if (page) {
    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        error: 'Page must be a positive integer',
        code: 'INVALID_PAGE'
      });
    }
    req.query.page = pageNum;
  } else {
    req.query.page = 1;
  }

  if (limit) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be between 1 and 100',
        code: 'INVALID_LIMIT'
      });
    }
    req.query.limit = limitNum;
  } else {
    req.query.limit = 20;
  }

  next();
};

module.exports = {
  validateCheckIn,
  validateCheckOut,
  validateMarkOff,
  validateDateRange,
  validatePaginationParams
};