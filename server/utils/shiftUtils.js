// utils/shiftUtils.js
// 📌 INTEGRATION PROMPT:
// Add this to your utils/ directory to handle shift timing logic and status calculations

/**
 * Determine current shift based on time
 * @returns {string} 'Day' or 'Night'
 */
function getCurrentShift() {
  const now = new Date();
  const hour = now.getHours();
  
  if (hour >= 6 && hour < 18) {
    return 'Day';
  } else {
    return 'Night';
  }
}

/**
 * Get shift times
 * @param {string} shiftName - 'Day' or 'Night'
 * @returns {object} {startHour, endHour}
 */
function getShiftTimes(shiftName) {
  if (shiftName === 'Day') {
    return { startHour: 6, endHour: 18 };
  } else {
    return { startHour: 18, endHour: 6 }; // Night shift crosses midnight
  }
}

/**
 * Calculate if check-in is on time, late, or too late
 * @param {Date} checkInTime - Check-in timestamp
 * @param {string} shiftName - 'Day' or 'Night'
 * @returns {string} 'Present', 'Late', or 'TooLate'
 */
function calculateAttendanceStatus(checkInTime, shiftName) {
  const { startHour } = getShiftTimes(shiftName);
  const checkInHour = checkInTime.getHours();
  
  let shiftStartTime;
  if (shiftName === 'Day') {
    shiftStartTime = new Date(checkInTime);
    shiftStartTime.setHours(startHour, 0, 0, 0);
  } else {
    // Night shift - handle midnight crossover
    shiftStartTime = new Date(checkInTime);
    if (checkInHour >= 18) {
      // Same day
      shiftStartTime.setHours(startHour, 0, 0, 0);
    } else {
      // Next day after midnight
      shiftStartTime.setDate(shiftStartTime.getDate() - 1);
      shiftStartTime.setHours(startHour, 0, 0, 0);
    }
  }
  
  const timeDiff = checkInTime - shiftStartTime;
  const minutesDiff = timeDiff / (1000 * 60);
  
  if (minutesDiff <= 30) {
    return 'Present';
  } else if (minutesDiff <= 60) {
    return 'Late';
  } else {
    return 'TooLate';
  }
}

/**
 * Get today's date in YYYY-MM-DD format
 * @returns {string}
 */
function getTodayDate() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

module.exports = {
  getCurrentShift,
  getShiftTimes,
  calculateAttendanceStatus,
  getTodayDate
};