
const API_BASE_URL = "http://localhost:5000/api"

const TokenManager = {
  get: () => localStorage.getItem("token"),
  set: (token, refreshToken) => {
    if (token) localStorage.setItem("token", token);
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
  },
  remove: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
  },
  getRefresh: () => localStorage.getItem("refreshToken"),
};

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(p => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

/**
 * Low-level apiCall that handles:
 * - Authorization header from TokenManager
 * - JSON body handling
 * - 401 token refresh with queueing
 * - Returns parsed JSON or throws Error with status and data
 */
export const apiCall = async (endpoint, options = {}) => {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const token = TokenManager.get();

  const config = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    // body will be set below if present
  };

  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }

  if (options.body !== undefined) {
    // allow sending already-stringified bodies (e.g. FormData or text)
    config.body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (fetchError) {
    console.error(`Network error for ${url}:`, fetchError);
    throw new Error(`Network error: Unable to reach server. Please check your connection.`);
  }

  // Handle 401 and attempt token refresh
  if (response.status === 401 && token && !endpoint.includes("/auth/")) {
    // queue while refreshing
    if (isRefreshing) {
      return new Promise((resolve, reject) =>
        failedQueue.push({ resolve, reject })
      ).then(newToken => {
        // retry the original request with new token
        config.headers["Authorization"] = `Bearer ${newToken}`;
        return fetch(url, config).then(async (res) => {
          if (!res.ok) {
            const errorData = await safeParseJSON(res).catch(() => ({}));
            const err = new Error(errorData.message || `HTTP ${res.status}`);
            err.status = res.status;
            err.data = errorData;
            throw err;
          }
          return safeParseJSON(res);
        });
      });
    }

    isRefreshing = true;

    try {
      const refreshToken = TokenManager.getRefresh();
      if (!refreshToken) {
        processQueue(new Error("No refresh token"));
        TokenManager.remove();
        window.location.href = "/login";
        throw new Error("Authentication failed: missing refresh token");
      }

      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken })
      });

      if (!refreshResponse.ok) {
        const errorTxt = await refreshResponse.text().catch(() => "");
        processQueue(new Error("Token refresh failed"));
        TokenManager.remove();
        window.location.href = "/login";
        throw new Error(`Token refresh failed: ${refreshResponse.status} ${errorTxt}`);
      }

      const refreshData = await safeParseJSON(refreshResponse);
      const { token: newToken, refreshToken: newRefresh } = (refreshData && (refreshData.data || refreshData)) || {};

      if (!newToken) {
        processQueue(new Error("Invalid refresh response"));
        TokenManager.remove();
        window.location.href = "/login";
        throw new Error("Invalid refresh response");
      }

      TokenManager.set(newToken, newRefresh || refreshToken);
      processQueue(null, newToken);

      // retry the original request with the new token
      config.headers["Authorization"] = `Bearer ${newToken}`;
      response = await fetch(url, config);
    } catch (err) {
      processQueue(err, null);
      TokenManager.remove();
      window.location.href = "/login";
      throw err;
    } finally {
      isRefreshing = false;
    }
  }

  // Handle non-OK responses (other than already handled 401)
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    let errorData = {};

    try {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } else {
        const textResponse = await response.text();
        console.warn(`Non-JSON response from ${url}:`, textResponse);
        errorMessage = `Server returned ${response.status}: ${response.statusText}`;
        errorData = { raw: textResponse };
      }
    } catch (parseError) {
      console.warn(`Error parsing response from ${url}:`, parseError);
    }

    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  // Parse JSON (if available)
  try {
    return await safeParseJSON(response);
  } catch (parseError) {
    console.error(`JSON parse error for ${url}:`, parseError);
    throw new Error("Invalid JSON response from server");
  }
};

// Safe JSON parsing helper that tolerates empty bodies
const safeParseJSON = async (response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    // If response is not JSON, return raw text
    return text;
  }
};

// ================================
// Safe API call wrapper for dashboard (returns .data when possible)
// ================================
export const safeApiCall = async (endpoint, options = {}) => {
  try {
    const result = await apiCall(endpoint, options);

    if (result && typeof result === 'object') {
      // If API returns { success: true, data: {...} } or similar
      if (result.data !== undefined) return result.data;
      if (result.success && result.data !== undefined) return result.data;
      return result;
    }
    return result;
  } catch (error) {
    console.warn(`Safe API call failed for ${endpoint}:`, error);

    // sensible fallbacks used by your dashboard
    if (endpoint.includes('/users')) return [];
    if (endpoint.includes('/checkpoints')) return [];
    if (endpoint.includes('/shifts')) return [];
    if (endpoint.includes('/patrols')) return [];
    if (endpoint.includes('/attendance')) return [];
    if (endpoint.includes('/reports')) return {};
    return null;
  }
};

// ================================
// Axios-like simple wrapper (convenience)
// ================================
const api = {
  get: (endpoint) => apiCall(endpoint),
  post: (endpoint, data) => apiCall(endpoint, { method: "POST", body: data }),
  put: (endpoint, data) => apiCall(endpoint, { method: "PUT", body: data }),
  patch: (endpoint, data) => apiCall(endpoint, { method: "PATCH", body: data }),
  delete: (endpoint) => apiCall(endpoint, { method: "DELETE" }),
};

// ================================
// Dashboard endpoints (complete list)
// ================================
export const dashboardApi = {
  // Users
  getUsers: () => safeApiCall('/users'),
  createUser: (userData) => apiCall('/users', { method: 'POST', body: userData }),
  updateUser: (userId, userData) => apiCall(`/users/${userId}`, { method: 'PUT', body: userData }),
  deleteUser: (userId) => apiCall(`/users/${userId}`, { method: 'DELETE' }),

  // Checkpoints
  getCheckpoints: () => safeApiCall('/checkpoints'),
  createCheckpoint: (checkpointData) => apiCall('/checkpoints', { method: 'POST', body: checkpointData }),
 updateCheckpoint: (checkpointId, checkpointData) => apiCall(`/checkpoints/${checkpointId}`, { method: 'PUT', body: checkpointData }),
  deleteCheckpoint: (checkpointId) => apiCall(`/checkpoints/${checkpointId}`, { method: 'DELETE' }),

  // Robust nearby lookup:
  //
  // Usage:
  //   .getNearbyCheckpoints(lat, lng)           // tries POST then GET fallback
  //   dashboardApi.getNearbyCheckpoints({ latitude, longitude, radius, preferPost })
  //
  getNearbyCheckpoints: async (latOrObj, lng, radius = 1000, preferPost = false) => {
    // normalize arguments
    let latitude, longitude, usePost;
    if (typeof latOrObj === 'object') {
      const obj = latOrObj || {};
      latitude = obj.latitude ?? obj.lat ?? obj.latlng ?? obj.latLng;
      longitude = obj.longitude ?? obj.lng ?? obj.lon ?? obj.long;
      radius = obj.radius ?? radius;
      usePost = obj.preferPost ?? preferPost;
    } else {
      latitude = latOrObj;
      longitude = lng;
      usePost = preferPost;
    }

    if (latitude === undefined || longitude === undefined) {
      throw new Error("Latitude and longitude are required");
    }

    // try preferred method first, otherwise try POST then GET fallback
    const tryPost = async () => {
      try {
        // use POST with JSON body (some clients used POST previously)
        const res = await api.post('/checkpoints/nearby', { latitude, longitude, radius });
        return res;
      } catch (err) {
        // rethrow to let caller decide fallback
        throw err;
      }
    };

    const tryGet = async () => {
      // GET with query string; controller expects 'latitude' & 'longitude' per server code
      const q = `?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&radius=${encodeURIComponent(radius)}`;
      return await apiCall(`/checkpoints/nearby${q}`, { method: 'GET' });
    };

    // If prefer POST, try POST then GET fallback
    if (usePost) {
      try {
        return await tryPost();
      } catch (postErr) {
        // If 404 route not found or 405, try GET fallback
        if (postErr && (postErr.status === 404 || postErr.status === 405 || /not found/i.test(postErr.message))) {
          return tryGet();
        }
        throw postErr;
      }
    }

    // Default: try GET first (this matches typical REST usage)
    try {
      return await tryGet();
    } catch (getErr) {
      // fallback to POST if GET fails with 404/405
      if (getErr && (getErr.status === 404 || getErr.status === 405 || /not found/i.test(getErr.message))) {
        try {
          return await tryPost();
        } catch (postErr) {
          // both failed -> bubble the original errors
          // prefer the more descriptive error
          throw postErr.status ? postErr : getErr;
        }
      }
      throw getErr;
    }
  },

  // Attendance
  getAttendanceReport: () => safeApiCall('/attendance/daily-report'),
  getActiveGuards: () => safeApiCall('/attendance/active-guards'),

  // Patrols
  getPatrols: () => safeApiCall('/patrols'),

  // Shifts
  getShifts: () => safeApiCall('/shifts'),

  // Reports
  getSystemSummary: () => safeApiCall('/reports/summary'),
  exportData: (type, format) => apiCall(`/reports/export/${format}?type=${type}`),

  // Health
  healthCheck: () => safeApiCall('/health'),
};

// ================================
// Network status monitoring
// ================================
export const NetworkMonitor = {
  isOnline: () => typeof navigator !== 'undefined' ? navigator.onLine : true,

  onStatusChange: (callback) => {
    if (typeof window === 'undefined') return () => {};
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }
};

export default api;
export { TokenManager }; 