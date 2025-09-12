// utils/geofencing.js
// 📌 INTEGRATION PROMPT:
// Create a utils/ directory in your project root if it doesn't exist
// Add this file to handle location-based validation for attendance

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude 1
 * @param {number} lng1 - Longitude 1
 * @param {number} lat2 - Latitude 2
 * @param {number} lng2 - Longitude 2
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lng2-lng1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

/**
 * Check if guard is within allowed radius of checkpoint
 * @param {number} guardLat - Guard's latitude
 * @param {number} guardLng - Guard's longitude
 * @param {number} checkpointLat - Checkpoint latitude
 * @param {number} checkpointLng - Checkpoint longitude
 * @param {number} radius - Allowed radius in meters (default: 100)
 * @returns {boolean}
 */
function isWithinGeofence(guardLat, guardLng, checkpointLat, checkpointLng, radius = 100) {
  const distance = calculateDistance(guardLat, guardLng, checkpointLat, checkpointLng);
  return distance <= radius;
}

module.exports = {
  calculateDistance,
  isWithinGeofence
};