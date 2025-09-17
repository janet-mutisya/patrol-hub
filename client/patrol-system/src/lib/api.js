// src/lib/api.js

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? "https://your-backend-domain.com/api"  // Replace with your actual backend URL
  : "http://localhost:5000/api";

// ================================
// Token Manager
// ================================
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
// Core API Caller
// ================================
export const apiCall = async (endpoint, options = {}) => {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const token = TokenManager.get();

  const config = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  };

  if (token) {
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
    throw new Error("Network error: Unable to reach server. Please check your connection.");
  }

  // ================================
  // Handle 401 → refresh token
  // ================================
  if (response.status === 401 && token && !endpoint.includes("/auth/")) {
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
      if (!refreshToken) {
        processQueue(new Error("No refresh token"));
        TokenManager.remove();
        window.location.href = "/login";
        throw new Error("Authentication failed: missing refresh token");
      }

      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!refreshResponse.ok) {
        processQueue(new Error("Token refresh failed"));
        TokenManager.remove();
        window.location.href = "/login";
        throw new Error("Token refresh failed");
      }

      const refreshData = await safeParseJSON(refreshResponse);
      const { token: newToken, refreshToken: newRefresh } =
        refreshData?.data || refreshData || {};

      if (!newToken) {
        processQueue(new Error("Invalid refresh response"));
        TokenManager.remove();
        window.location.href = "/login";
        throw new Error("Invalid refresh response");
      }

      TokenManager.set(newToken, newRefresh || refreshToken);
      processQueue(null, newToken);

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

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    let errorData = {};
    try {
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } else {
        const textResponse = await response.text();
        errorMessage = `Server returned ${response.status}: ${response.statusText}`;
        errorData = { raw: textResponse };
      }
    } catch (err) {
      console.warn(`Error parsing error response from ${url}:`, err);
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  return safeParseJSON(response);
};

// ================================
// Safe API Call Wrapper
// ================================
export const safeApiCall = async (endpoint, options = {}) => {
  try {
    const result = await apiCall(endpoint, options);
    if (result?.data !== undefined) return result.data;
    return result;
  } catch (error) {
    console.warn(`Safe API call failed for ${endpoint}:`, error);
    if (endpoint.includes("/users")) return [];
    if (endpoint.includes("/checkpoints")) return [];
    if (endpoint.includes("/shifts")) return [];
    if (endpoint.includes("/patrols")) return [];
    if (endpoint.includes("/attendance")) return [];
    if (endpoint.includes("/reports")) return {};
    return null;
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
// Dashboard Endpoints
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
  // Profile & Status
  getMyProfile: () => safeApiCall("/users/me"),
  getMyDutyStatus: () => safeApiCall("/users/me/duty-status"),
  toggleMyDutyStatus: (data = {}) => api.post("/users/me/duty-status", data),

  // User Assignment
  getAssignedGuards: () => safeApiCall("/users/assigned"),
  getUnassignedGuards: () => safeApiCall("/users/unassigned"),
  getGuardsByCheckpoint: (checkpointId) => safeApiCall(`/users/checkpoint/${checkpointId}/guards`),

  // User Details & Security
  getUserSecurityInfo: (id) => safeApiCall(`/users/${id}/security`),
  getUserActivity: (id) => safeApiCall(`/users/${id}/activity`),

  // User Management Actions
  reactivateUser: (id, data = {}) => api.post(`/users/${id}/reactivate`, data),
  assignUserToCheckpoint: (id, data) => api.post(`/users/${id}/assign-checkpoint`, data),
  unassignUserFromCheckpoint: (id, data = {}) => api.post(`/users/${id}/unassign-checkpoint`, data),
  unlockUserAccount: (id, data = {}) => api.post(`/users/${id}/unlock`, data),
  resetUserLoginAttempts: (id, data = {}) => api.post(`/users/${id}/reset-login-attempts`, data),
  changeUserPassword: (id, data) => api.post(`/users/${id}/change-password`, data),
  resendEmailVerification: (id, data = {}) => api.post(`/users/${id}/resend-verification`, data),
  forceVerifyEmail: (id, data = {}) => api.post(`/users/${id}/force-verify`, data),

  // ================================
  // Checkpoints
  // ================================
  getCheckpoints: () => safeApiCall("/checkpoints"),
  createCheckpoint: (data) => api.post("/checkpoints", data),
  updateCheckpoint: (id, data) => api.put(`/checkpoints/${id}`, data),
  deleteCheckpoint: (id) => api.delete(`/checkpoints/${id}`),

  // ================================
  // Attendance
  // ================================
  getAttendanceReport: () => safeApiCall("/attendance/daily-report"),
  getActiveGuards: () => safeApiCall("/attendance/active-guards"),

  // ================================
  // Patrols
  // ================================
  getPatrolLogs: () => safeApiCall("/patrol-logs"),

  // ================================
  // Shifts - Extended Endpoints
  // ================================
  getShifts: () => safeApiCall("/shifts"),
  getCurrentShift: () => safeApiCall("/shifts/current"),
  getShift: (id) => safeApiCall(`/shifts/${id}`),
  getShiftStats: (id) => safeApiCall(`/shifts/${id}/stats`),
  toggleShift: (id, data = {}) => api.post(`/shifts/${id}/toggle`, data),
  setupDefaultShifts: (data) => api.post("/shifts/setup-defaults", data),

  // ================================
  // Reports - Extended Endpoints
  // ================================
  getSystemSummary: () => safeApiCall("/reports/summary"),
  getMyPerformance: () => safeApiCall("/reports/my-performance"),
  getMissedVisits: () => safeApiCall("/reports/missed-visits"),
  getCheckpointReports: () => safeApiCall("/reports/checkpoints"),
  getGuardReports: () => safeApiCall("/reports/guards"),
  getGuardReport: (id) => safeApiCall(`/reports/guards/${id}`),
  exportData: (type, format) =>
    api.get(`/reports/export/${format}?type=${type}`),

  // ================================
  // Health & System
  // ================================
  healthCheck: () => safeApiCall("/health"),
};

// ================================
// User-specific API (for guards/users)
// ================================
export const userApi = {
  // Profile
  getProfile: () => dashboardApi.getMyProfile(),
  updateProfile: (data) => api.put("/users/me", data),

  // Duty Status
  getDutyStatus: () => dashboardApi.getMyDutyStatus(),
  toggleDutyStatus: (data) => dashboardApi.toggleMyDutyStatus(data),

  // Performance
  getMyPerformance: () => dashboardApi.getMyPerformance(),
  getMissedVisits: () => dashboardApi.getMissedVisits(),

  // Current shift
  getCurrentShift: () => dashboardApi.getCurrentShift(),
};

// ================================
// Admin-specific API
// ================================
export const adminApi = {
  // User Management
  users: {
    getAll: () => dashboardApi.getUsers(),
    create: (data) => dashboardApi.createUser(data),
    update: (id, data) => dashboardApi.updateUser(id, data),
    delete: (id) => dashboardApi.deleteUser(id),
    getAssigned: () => dashboardApi.getAssignedGuards(),
    getUnassigned: () => dashboardApi.getUnassignedGuards(),
    getByCheckpoint: (checkpointId) => dashboardApi.getGuardsByCheckpoint(checkpointId),
    getSecurity: (id) => dashboardApi.getUserSecurityInfo(id),
    getActivity: (id) => dashboardApi.getUserActivity(id),
    reactivate: (id, data) => dashboardApi.reactivateUser(id, data),
    assignCheckpoint: (id, data) => dashboardApi.assignUserToCheckpoint(id, data),
    unassignCheckpoint: (id, data) => dashboardApi.unassignUserFromCheckpoint(id, data),
    unlock: (id, data) => dashboardApi.unlockUserAccount(id, data),
    resetLoginAttempts: (id, data) => dashboardApi.resetUserLoginAttempts(id, data),
    changePassword: (id, data) => dashboardApi.changeUserPassword(id, data),
    resendVerification: (id, data) => dashboardApi.resendEmailVerification(id, data),
    forceVerify: (id, data) => dashboardApi.forceVerifyEmail(id, data),
  },

  // Checkpoint Management
  checkpoints: {
    getAll: () => dashboardApi.getCheckpoints(),
    create: (data) => dashboardApi.createCheckpoint(data),
    update: (id, data) => dashboardApi.updateCheckpoint(id, data),
    delete: (id) => dashboardApi.deleteCheckpoint(id),
  },

  // Shift Management
  shifts: {
    getAll: () => dashboardApi.getShifts(),
    getCurrent: () => dashboardApi.getCurrentShift(),
    get: (id) => dashboardApi.getShift(id),
    getStats: (id) => dashboardApi.getShiftStats(id),
    toggle: (id, data) => dashboardApi.toggleShift(id, data),
    setupDefaults: (data) => dashboardApi.setupDefaultShifts(data),
  },

  // Reports
  reports: {
    getSystemSummary: () => dashboardApi.getSystemSummary(),
    getCheckpoints: () => dashboardApi.getCheckpointReports(),
    getGuards: () => dashboardApi.getGuardReports(),
    getGuard: (id) => dashboardApi.getGuardReport(id),
    getMissedVisits: () => dashboardApi.getMissedVisits(),
    export: (type, format) => dashboardApi.exportData(type, format),
  },

  // System
  system: {
    healthCheck: () => dashboardApi.healthCheck(),
    getAttendanceReport: () => dashboardApi.getAttendanceReport(),
    getActiveGuards: () => dashboardApi.getActiveGuards(),
    getPatrolLogs: () => dashboardApi.getPatrolLogs(),
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
export { TokenManager };