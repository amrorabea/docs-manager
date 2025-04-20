import React, { createContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, logout as apiLogout, refresh } from '../services/authService';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => {
    // Try to get initial auth state from localStorage
    try {
      const storedAuth = localStorage.getItem('auth');
      return storedAuth ? JSON.parse(storedAuth) : {};
    } catch (error) {
      console.error('Error parsing stored auth:', error);
      return {};
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is admin - helper function
  const isAdmin = auth?.user?.role === 'admin';

  // Store auth in localStorage whenever it changes
  useEffect(() => {
    try {
      if (auth?.accessToken) {
        localStorage.setItem('auth', JSON.stringify(auth));
      } else {
        localStorage.removeItem('auth');
      }
    } catch (error) {
      console.error('Error storing auth in localStorage:', error);
    }
  }, [auth]);

  // Initial session verification
  useEffect(() => {
    const verifyRefreshToken = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Only try to refresh if we don't have a valid token
        if (!auth?.accessToken) {
          const response = await refresh();
          if (response?.accessToken) {
            setAuth(response);
          }
        }
      } catch (err) {
        console.error('Refresh token error:', err);
        // Clear any potentially invalid auth state
        setAuth({});
      } finally {
        setLoading(false);
      }
    };

    verifyRefreshToken();
  }, []); // Run only once on component mount

  // Handle login - using useCallback to maintain function reference
  const handleLogin = useCallback(async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiLogin(credentials);
      
      if (response?.accessToken) {
        // Add logout method directly to the auth object
        const authWithLogout = {
          ...response,
          logout: handleLogout
        };
        
        setAuth(authWithLogout);
        return response;
      } else {
        throw new Error('Login failed: No access token received');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle logout - using useCallback to maintain function reference
  const handleLogout = useCallback(async () => {
    try {
      setLoading(true);
      
      if (auth?.accessToken) {
        await apiLogout();
      }
    } catch (err) {
      console.error('Logout error:', err);
      // Continue with logout even if API call fails
    } finally {
      // Always clear auth state on logout
      setAuth({});
      setLoading(false);
    }
  }, [auth?.accessToken]);

  // Add logout method directly to the auth object
  useEffect(() => {
    if (auth && !auth.logout) {
      setAuth(prevAuth => ({
        ...prevAuth,
        logout: handleLogout
      }));
    }
  }, [auth, handleLogout]);

  // Create the context value object
  const contextValue = {
    auth,
    setAuth,
    user: auth?.user || null,
    isAdmin,
    login: handleLogin,
    logout: handleLogout,
    loading,
    error
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {!loading ? children : <div className="loading-spinner">Loading...</div>}
    </AuthContext.Provider>
  );
};

export default AuthContext;