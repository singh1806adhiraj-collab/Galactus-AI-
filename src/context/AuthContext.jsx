/* Galactus AI - Authentication Context (Backend Connected) */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const API_BASE = '/api/auth';

const initialAuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isGuest: false,
};

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(initialAuthState);

  // Initialize auth state by verifying token with backend
  useEffect(() => {
    verifyAuth();
  }, []);

  const verifyAuth = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/verify`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          setAuthState({
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
            isGuest: data.user.isGuest || false,
          });
          return;
        }
      }

      // Not authenticated
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isGuest: false,
      });
    } catch (error) {
      console.error('Auth verification failed:', error);
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isGuest: false,
      });
    }
  }, []);

  const login = useCallback(async (email, password, rememberMe = false) => {
    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = {};
      }

      if (!response.ok) {
        throw new Error(data.error || `Login failed (${response.status})`);
      }

      setAuthState({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        isGuest: false,
      });

      return { success: true };
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { success: false, error: error.message };
    }
  }, []);

  const signup = useCallback(async (name, email, password) => {
    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = {};
      }

      if (!response.ok) {
        throw new Error(data.error || `Registration failed (${response.status})`);
      }

      setAuthState({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        isGuest: false,
      });

      return { success: true };
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { success: false, error: error.message };
    }
  }, []);

  const continueAsGuest = useCallback(async () => {
    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch(`${API_BASE}/guest`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = {};
      }

      if (!response.ok) {
        throw new Error(data.error || `Guest login failed (${response.status})`);
      }

      setAuthState({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        isGuest: true,
      });

      return { success: true };
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { success: false, error: error.message };
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      await fetch(`${API_BASE}/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isGuest: false,
      });
    }
  }, []);

  const updateUser = useCallback((userData) => {
    setAuthState(prev => ({
      ...prev,
      user: { ...prev.user, ...userData },
    }));
  }, []);

  const value = {
    ...authState,
    login,
    logout,
    signup,
    continueAsGuest,
    updateUser,
    verifyAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}