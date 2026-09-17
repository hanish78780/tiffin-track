import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  },
  timeout: 10000
});

// Request interceptor: attach JWT Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("tiffintrack_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 unauthenticated
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token
      localStorage.removeItem("tiffintrack_token");
      
      // If not already on public auth page, redirect to login
      const currentPath = window.location.pathname;
      const isPublicPath = currentPath === "/login" || currentPath === "/register" || currentPath === "/";
      if (!isPublicPath) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
