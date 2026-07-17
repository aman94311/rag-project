import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');

  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const resData = await response.json();

        if (resData.success) {
          setUser(resData.data);
        } else {
          // Token expired or invalid
          logout();
        }
      } catch (err) {
        console.error('Auth verification failed:', err);
        logout();
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      const resData = await response.json();

      if (resData.success) {
        localStorage.setItem('token', resData.data.token);
        setToken(resData.data.token);
        setUser({
          _id: resData.data._id,
          name: resData.data.name,
          email: resData.data.email
        });
        return { success: true };
      } else {
        return { success: false, message: resData.message };
      }
    } catch (err) {
      return { success: false, message: 'Server connection error. Please try again.' };
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password })
      });
      const resData = await response.json();

      if (resData.success) {
        localStorage.setItem('token', resData.data.token);
        setToken(resData.data.token);
        setUser({
          _id: resData.data._id,
          name: resData.data.name,
          email: resData.data.email
        });
        return { success: true };
      } else {
        return { success: false, message: resData.message };
      }
    } catch (err) {
      return { success: false, message: 'Server connection error. Please try again.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    API_URL
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
