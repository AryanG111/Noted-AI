import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export const API_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Universal safe API response handler that converts HTTP status codes
 * and JSON/text payloads into user-friendly messages with zero raw stack traces.
 */
export const handleApiResponse = async (response, fallbackMsg = "There's something wrong on our side. Please try again in a moment.") => {
  if (response.ok) {
    if (response.status === 204) return null;
    return await response.json().catch(() => ({}));
  }

  let userFriendlyMsg = fallbackMsg;
  try {
    const errorData = await response.json();
    if (typeof errorData.detail === 'string') {
      userFriendlyMsg = errorData.detail;
    } else if (Array.isArray(errorData.detail)) {
      userFriendlyMsg = errorData.detail.map(d => d.msg || d.message).join('; ');
    } else if (errorData.message) {
      userFriendlyMsg = errorData.message;
    }
  } catch {
    if (response.status >= 500) {
      userFriendlyMsg = "There's something wrong on our side. Please try again in a moment.";
    } else if (response.status === 404) {
      userFriendlyMsg = "The requested item could not be found.";
    } else if (response.status === 401) {
      userFriendlyMsg = "Your session has expired. Please sign in again.";
    } else if (response.status === 403) {
      userFriendlyMsg = "You do not have permission to perform this action.";
    }
  }

  throw new Error(userFriendlyMsg);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [activeKernel, setActiveKernel] = useState(localStorage.getItem('activeKernel') || 'gemini');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data);
        } else {
          // Token expired or invalid
          logout();
        }
      } catch (error) {
        console.warn('Authentication validation notice:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [token]);

  const login = async (email, password) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password })
    });
    
    const data = await handleApiResponse(response, 'Incorrect email or password.');
    localStorage.setItem('token', data.access_token);
    setToken(data.access_token);
    return data;
  };

  const register = async (email, password, fullName, occupation, aiTone) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName?.trim() || null,
        occupation: occupation?.trim() || null,
        ai_tone: aiTone || 'balanced'
      })
    });
    
    return await handleApiResponse(response, 'Unable to complete registration. Please check your information.');
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateKernel = (kernelName) => {
    localStorage.setItem('activeKernel', kernelName);
    setActiveKernel(kernelName);
  };

  return (
    <AuthContext.Provider value={{ user, token, activeKernel, loading, login, register, logout, updateKernel }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
