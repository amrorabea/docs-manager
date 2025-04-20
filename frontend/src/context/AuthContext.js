import React, { createContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, logout as apiLogout, refresh, clearAuthData } from '../services/authService';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => {
    try {
      const storedAuth = localStorage.getItem('accessToken');
      const storedUser = localStorage.getItem('user');
      return storedAuth && storedUser ? {
        accessToken: storedAuth,
        user: JSON.parse(storedUser)
      } : {};
    } catch (error) {
      console.error('Error parsing stored auth:', error);
      return {};
    }
  });

  // Define loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // This should be dynamically determined based on the user's role
  const isAdmin = auth?.user?.role === 'admin';

  console.log("Auth in context: ", auth);

  // Store auth in localStorage whenever it changes
  useEffect(() => {
    try {
      if (auth?.accessToken) {
        localStorage.setItem('accessToken', auth.accessToken);
        localStorage.setItem('user', JSON.stringify(auth.user));  // Store user info
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');  // Remove user info on logout
      }
    } catch (error) {
      console.error('Error storing auth in localStorage:', error);
    }
  }, [auth]);

  // Initial session verification - prevent auto-refresh for users who haven't explicitly logged in
  useEffect(() => {
    const verifyRefreshToken = async () => {
      try {
        setLoading(true);
        setError(null);

        // First, check if the user has explicitly logged in before
        const hasExplicitlyLoggedIn = localStorage.getItem('hasLoggedIn') === 'true';
        
        if (!hasExplicitlyLoggedIn) {
          console.log('No previous login detected, skipping token refresh');
          // Force clear all auth data to be safe
          clearAuthData(); 
          setLoading(false);
          return;
        }

        // Check if there's a refresh token cookie before attempting to refresh
        const hasRefreshToken = document.cookie.split(';').some(item => item.trim().startsWith('jwt='));
        
        // Only try to refresh if we don't have a valid token but do have a refresh token cookie
        if (!auth?.accessToken && hasRefreshToken && hasExplicitlyLoggedIn) {
          console.log('Found refresh token cookie, attempting to refresh access token');
          
          try {
            const response = await refresh();
            if (response?.accessToken) {
              setAuth(response);
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            // Force clear all auth data on refresh error
            clearAuthData();
            localStorage.removeItem('hasLoggedIn');
          }
        } else if (!hasRefreshToken) {
          console.log('No refresh token cookie found, skipping token refresh');
          // Ensure any potential leftover data is cleared if no refresh token exists
          clearAuthData();
        }
      } catch (err) {
        console.error('Session verification error:', err);
        // Clear any potentially invalid auth state
        setAuth({});
        clearAuthData();
        localStorage.removeItem('hasLoggedIn');
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
        // Create auth state with user info from decoded token
        const authState = {
          accessToken: response.accessToken,
          user: response.user,
        };
  
        setAuth(authState);
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
