import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import authService from "../services/authService";

const AuthContext = createContext(null);

const TOKEN_KEY = "tiffintrack_token";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  // Normalize user object so both `user.id` and `user._id` are accessible
  const formatUser = (rawUser) => {
    if (!rawUser) return null;
    const id = rawUser.id || rawUser._id;
    return {
      id,
      _id: id,
      name: rawUser.name,
      email: rawUser.email
    };
  };

  // Restore authenticated session on application mount
  const checkAuth = useCallback(async () => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      const data = await authService.getMe();
      if (data.success && data.user) {
        setUser(formatUser(data.user));
        setToken(storedToken);
      } else {
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
        setToken(null);
      }
    } catch (err) {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Login handler
  const login = async (email, password) => {
    const data = await authService.login({ email, password });
    if (data.success && data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(formatUser(data.user));
      return data;
    }
    throw new Error(data.message || "Login failed");
  };

  // Register handler (automatic login on success)
  const register = async (name, email, password) => {
    const data = await authService.register({ name, email, password });
    if (data.success && data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(formatUser(data.user));
      return data;
    }
    throw new Error(data.message || "Registration failed");
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    window.location.href = "/login";
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    register,
    logout,
    checkAuth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
