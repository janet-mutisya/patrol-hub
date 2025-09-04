// src/lib/api.js - Standalone API client (no env needed)
const API_BASE_URL = "http://localhost:5000/api"; // <-- hardcoded

// Token management utilities
const TokenManager = {
  get: () => {
    try {
      return localStorage.getItem("token");
    } catch (error) {
      console.warn("Failed to get token from localStorage:", error);
      return null;
    }
  },

  set: (token, refreshToken) => {
    try {
      if (token) localStorage.setItem("token", token);
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
    } catch (error) {
      console.warn("Failed to set token in localStorage:", error);
    }
  },

  remove: () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    } catch (error) {
      console.warn("Failed to remove tokens from localStorage:", error);
    }
  },

  getRefresh: () => {
    try {
      return localStorage.getItem("refreshToken");
    } catch (error) {
      console.warn("Failed to get refresh token:", error);
      return null;
    }
  }
};

// Token refresh queue
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// Base API function
export const apiCall = async (endpoint, options = {}) => {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    const token = TokenManager.get();
    if (token) config.headers["Authorization"] = `Bearer ${token}`;

    let response = await fetch(url, config);

    // Handle 401 token refresh
    if (response.status === 401 && token && !endpoint.includes('/auth/')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          const newToken = TokenManager.get();
          if (newToken) {
            config.headers["Authorization"] = `Bearer ${newToken}`;
            return fetch(url, config).then(res => res.json());
          }
          throw new Error('No token after refresh');
        });
      }

      isRefreshing = true;

      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: TokenManager.getRefresh() }),
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          const { token: newToken, refreshToken: newRefresh } = refreshData.data;
          TokenManager.set(newToken, newRefresh);

          processQueue(null, newToken);
          config.headers["Authorization"] = `Bearer ${newToken}`;
          response = await fetch(url, config);
        } else {
          processQueue(new Error('Token refresh failed'), null);
          TokenManager.remove();
          window.location.href = '/login';
          throw new Error('Authentication failed');
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        TokenManager.remove();
        window.location.href = '/login';
        throw refreshError;
      } finally {
        isRefreshing = false;
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API error:", error);
    throw error;
  }
};

// Axios-like wrapper
const api = {
  post: (endpoint, data) => apiCall(endpoint, { method: "POST", body: JSON.stringify(data) }),
  get: (endpoint) => apiCall(endpoint),
  put: (endpoint, data) => apiCall(endpoint, { method: "PUT", body: JSON.stringify(data) }),
  delete: (endpoint) => apiCall(endpoint, { method: "DELETE" }),
  patch: (endpoint, data) => apiCall(endpoint, { method: "PATCH", body: JSON.stringify(data) }),
};

export default api;
export { TokenManager };
