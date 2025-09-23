// src/lib/api.js

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? "https://your-backend-domain.com/api"  // Replace with your actual backend URL
  : "http://localhost:5000/api";

// ================================
// Enhanced Token Manager
// ================================
const TokenManager = {
  get: () => {
    // Check both localStorage and sessionStorage for compatibility
    return localStorage.getItem("token") || 
           localStorage.getItem("authToken") || 
           sessionStorage.getItem("token") || 
           sessionStorage.getItem("authToken");
  },
  
  set: (token, refreshToken) => {
    if (token) {
      localStorage.setItem("token", token);
      localStorage.setItem("authToken", token); // For backward compatibility
    }
    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken);
    }
  },
  
  remove: () => {
    // Clear all possible token storage locations
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("authToken");
  },
  
  getRefresh: () => localStorage.getItem("refreshToken"),
  
  isValid: (token) => {
    if (!token) return false;
    
    try {
      // Check if it's a JWT token
      if (token.includes('.')) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const isExpired = payload.exp * 1000 < Date.now();
        return !isExpired;
      }
      // For non-JWT tokens, assume valid if exists
      return true;
    } catch (e) {
      console.warn('Token validation failed:', e);
      return false;
    }
  }
};

// ================================
// Token Refresh Queue
// ================================
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(p => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

// ================================
// Safe JSON parser
// ================================
const safeParseJSON = async (response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

// ================================
// Enhanced API Error Class
// ================================
class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// ================================
// Core API Caller with Better Error Handling
// ================================
export const apiCall = async (endpoint, options = {}) => {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const token = TokenManager.get();

  // Log the request for debugging
  console.log(`API Request: ${options.method || 'GET'} ${endpoint}`, {
    hasToken: !!token,
    tokenValid: TokenManager.isValid(token)
  });

  const config = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  };

  // Only add token if it exists and is valid
  if (token && TokenManager.isValid(token)) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }

  if (options.body !== undefined) {
    config.body =
      typeof options.body === "string"
        ? options.body
        : JSON.stringify(options.body);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (fetchError) {
    console.error(`Network error for ${url}:`, fetchError);
    throw new ApiError("Network error: Unable to reach server. Please check your connection.", 0);
  }

  // Log response status
  console.log(`API Response: ${endpoint} - ${response.status}`);

  // ================================
  // Handle 401 → refresh token or redirect
  // ================================
  if (response.status === 401) {
    console.warn(`401 Unauthorized for ${endpoint}`);
    
    // Don't try to refresh for auth endpoints or if already refreshing
    if (endpoint.includes("/auth/") || !token || isRefreshing) {
      TokenManager.remove();
      // Don't redirect immediately - let the component handle it
      throw new ApiError("Authentication required", 401);
    }

    // Try to refresh token
    if (TokenManager.getRefresh()) {
      if (isRefreshing) {
        return new Promise((resolve, reject) =>
          failedQueue.push({ resolve, reject })
        ).then((newToken) => {
          config.headers["Authorization"] = `Bearer ${newToken}`;
          return fetch(url, config).then(safeParseJSON);
        });
      }

      isRefreshing = true;
      try {
        const refreshToken = TokenManager.getRefresh();
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (!refreshResponse.ok) {
          throw new Error("Token refresh failed");
        }

        const refreshData = await safeParseJSON(refreshResponse);
        const { token: newToken, refreshToken: newRefresh } =
          refreshData?.data || refreshData || {};

        if (!newToken) {
          throw new Error("Invalid refresh response");
        }

        TokenManager.set(newToken, newRefresh || refreshToken);
        processQueue(null, newToken);

        // Retry original request
        config.headers["Authorization"] = `Bearer ${newToken}`;
        response = await fetch(url, config);
        
        console.log(`Retry after refresh: ${endpoint} - ${response.status}`);
        
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        processQueue(new ApiError("Session expired", 401), null);
        TokenManager.remove();
        throw new ApiError("Session expired. Please log in again.", 401);
      } finally {
        isRefreshing = false;
      }
    } else {
      // No refresh token available
      TokenManager.remove();
      throw new ApiError("Authentication required", 401);
    }
  }

  // Handle other HTTP errors
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorData = {};
    
    try {
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } else {
        const textResponse = await response.text();
        errorMessage = textResponse || errorMessage;
        errorData = { raw: textResponse };
      }
    } catch (parseError) {
      console.warn(`Error parsing error response from ${url}:`, parseError);
    }
    
    throw new ApiError(errorMessage, response.status, errorData);
  }

  return safeParseJSON(response);
};

// ================================
// Safe API Call Wrapper (Non-Throwing)
// ================================
export const safeApiCall = async (endpoint, options = {}) => {
  try {
    const result = await apiCall(endpoint, options);
    console.log(`Safe API success: ${endpoint}`);
    return result?.data !== undefined ? result.data : result;
  } catch (error) {
    console.warn(`Safe API call failed for ${endpoint}:`, error);
    
    // Don't log 401 errors as warnings since they're expected
    if (error.status !== 401) {
      console.error(`API Error for ${endpoint}:`, error.message);
    }
    
    // Return sensible defaults based on endpoint type
    if (endpoint.includes("/users")) return [];
    if (endpoint.includes("/checkpoints")) return [];
    if (endpoint.includes("/shifts")) return [];
    if (endpoint.includes("/patrols")) return [];
    if (endpoint.includes("/attendance")) return {};
    if (endpoint.includes("/reports")) return {};
    return null;
  }
};

// ================================
// Navigation Safe API Call (For Components)
// ================================
export const navigationSafeApiCall = async (endpoint, options = {}) => {
  try {
    return await apiCall(endpoint, options);
  } catch (error) {
    // For navigation components, we don't want to throw 401 errors
    // Instead, we'll let the component handle authentication state
    if (error.status === 401) {
      console.warn(`Authentication required for ${endpoint} - component should handle this`);
      return null;
    }
    throw error;
  }
};

// ================================
// Simple Axios-like API
// ================================
const api = {
  get: (endpoint) => apiCall(endpoint),
  post: (endpoint, data) => apiCall(endpoint, { method: "POST", body: data }),
  put: (endpoint, data) => apiCall(endpoint, { method: "PUT", body: data }),
  patch: (endpoint, data) => apiCall(endpoint, { method: "PATCH", body: data }),
  delete: (endpoint) => apiCall(endpoint, { method: "DELETE" }),
};

// ================================
// Dashboard Endpoints (Updated)
// ================================
export const dashboardApi = {
  // ================================
  // Users - Basic CRUD
  // ================================
  getUsers: () => safeApiCall("/users"),
  createUser: (data) => api.post("/users", data),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),

  // ================================
  // Users - Extended Endpoints
  // ================================
  getMyProfile: () => navigationSafeApiCall("/users/me"),
  getMyDutyStatus: () => navigationSafeApiCall("/users/me/duty-status"),
  toggleMyDutyStatus: (data = {}) => api.post("/users/me/duty-status", data),

  // Attendance endpoints
  checkIn: (data) => api.post("/attendance/check-in", data),
  checkOut: (data) => api.post("/attendance/check-out", data),
  getAttendanceStatus: () => navigationSafeApiCall("/attendance/status"),

  // User Assignment
  getAssignedGuards: () => safeApiCall("/users/assigned"),
  getUnassignedGuards: () => safeApiCall("/users/unassigned"),
  getGuardsByCheckpoint: (checkpointId) => safeApiCall(`/users/checkpoint/${checkpointId}/guards`),

  // ================================
  // Checkpoints
  // ================================
  getCheckpoints: () => navigationSafeApiCall("/checkpoints"),
  getNearbyCheckpoints: (data) => navigationSafeApiCall("/checkpoints/nearby", { method: "POST", body: data }),
  createCheckpoint: (data) => api.post("/checkpoints", data),
  updateCheckpoint: (id, data) => api.put(`/checkpoints/${id}`, data),
  deleteCheckpoint: (id) => api.delete(`/checkpoints/${id}`),

  // ================================
  // Shifts
  // ================================
  getShifts: () => navigationSafeApiCall("/shifts"),
  getCurrentShift: () => navigationSafeApiCall("/shifts/current"),
  getShift: (id) => navigationSafeApiCall(`/shifts/${id}`),
  
  // ================================
  // Patrol Logs
  // ================================
  getMyPatrolLogs: () => navigationSafeApiCall("/patrollogs/my-logs"),
  getPatrolLogs: () => safeApiCall("/patrol-logs"),
  
  // ================================
  // Reports
  // ================================
  getReportsSummary: () => navigationSafeApiCall("/reports/summary"),
  getMyPerformance: () => navigationSafeApiCall("/reports/my-performance"),

  // ================================
  // Health & System
  // ================================
  healthCheck: () => safeApiCall("/health"),
};

// ================================
// User-specific API (for guards/users)
// ================================
// src/lib/api.js (bottom part where userApi is defined)

export const userApi = {
  // Profile
  getProfile: () => dashboardApi.getMyProfile(),
  updateProfile: (data) => api.put("/users/me", data),

  // Duty Status & Attendance
  getDutyStatus: () => dashboardApi.getMyDutyStatus(),
  getAttendanceStatus: () => dashboardApi.getAttendanceStatus(),

  checkIn: (data) => {
    const checkpoint_id = localStorage.getItem("checkpoint_id");
    if (!checkpoint_id) {
      throw new Error("No checkpoint selected for check-in");
    }
    return dashboardApi.checkIn({ ...data, checkpoint_id });
  },

  checkOut: (data) => {
    const checkpoint_id = localStorage.getItem("checkpoint_id");
    if (!checkpoint_id) {
      throw new Error("No checkpoint selected for check-out");
    }
    return dashboardApi.checkOut({ ...data, checkpoint_id });
  },

  // Checkpoints & Patrols
  getCheckpoints: () => dashboardApi.getCheckpoints(),
  getNearbyCheckpoints: (data) => dashboardApi.getNearbyCheckpoints(data),
  getMyPatrolLogs: () => dashboardApi.getMyPatrolLogs(),

  // Performance & Reports
  getMyPerformance: () => dashboardApi.getMyPerformance(),
  getReportsSummary: () => dashboardApi.getReportsSummary(),

  // Current shift
  getCurrentShift: () => dashboardApi.getCurrentShift(),
};

// ================================
// Authentication Helper
// ================================
export const authHelper = {
  isLoggedIn: () => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!token || !storedUser) return false;

    try {
      const user = JSON.parse(storedUser);
      return !!(user.role && token); // true if role + token exist
    } catch (e) {
      console.error("Invalid user data in localStorage:", e);
      return false;
    }
  },

  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },
};

// ================================
// Network Monitor
// ================================
export const NetworkMonitor = {
  isOnline: () => (typeof navigator !== "undefined" ? navigator.onLine : true),
  onStatusChange: (callback) => {
    if (typeof window === "undefined") return () => {};
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  },
};

// ================================
// Convenience Exports
// ================================
export default api;
export { TokenManager, ApiError };