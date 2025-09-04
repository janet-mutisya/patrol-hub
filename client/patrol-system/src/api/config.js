// src/api/config.js
const API_URL = "http://localhost:5000/api"; // or your server URL

export const apiCall = async (endpoint, options = {}) => {
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  return res.json();
};

export default API_URL;
