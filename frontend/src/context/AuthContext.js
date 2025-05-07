import React, { createContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, logout as apiLogout, refresh, clearAuthData } from '../services/authService';

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

  // Standardize admin check to only use the role property
  // This ensures consistency with backend checks
  const isAdmin = auth?.user?.role === 'admin';
  
  // Remove excessive console logging in production
  if (process.env.NODE_ENV !== 'production') {
    console.log("Auth in context: ", { hasAuth: !!auth?.accessToken, hasUser: !!auth?.user });
    if (auth?.user) {
      console.log("User role:", auth.user.role, "isAdmin:", isAdmin);
    }
  }

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

  // On mount, always initialize auth from localStorage if not set
  useEffect(() => {
    if (!auth?.accessToken) {
      const storedAuth = localStorage.getItem('accessToken');
      const storedUser = localStorage.getItem('user');
      if (storedAuth && storedUser) {
        setAuth({ accessToken: storedAuth, user: JSON.parse(storedUser) });
      }
    }
  }, []);

  // Initial session verification - prevent auto-refresh for users who haven't explicitly logged in
  useEffect(() => {
    const verifyRefreshToken = async () => {
      try {
        setLoading(true);
        setError(null);

        const hasExplicitlyLoggedIn = localStorage.getItem('hasLoggedIn') === 'true';
        if (!hasExplicitlyLoggedIn) {
          clearAuthData(); 
          setLoading(false);
          return;
        }

        const hasRefreshToken = document.cookie.split(';').some(item => item.trim().startsWith('jwt='));

        // If we have no access token, but user has logged in before, try to refresh if possible
        if (!auth?.accessToken && hasExplicitlyLoggedIn) {
          if (hasRefreshToken) {
            try {
              const response = await refresh();
              if (response?.accessToken) {
                setAuth(response);
                return;
              }
            } catch (refreshError) {
              // Only clear auth if refresh fails (token expired or invalid)
              clearAuthData();
              localStorage.removeItem('hasLoggedIn');
              setAuth({});
              return;
            }
          } else {
            // If refresh token is missing, do not clear auth immediately. Wait for next auth-required action.
            // Optionally, you can set a flag to check again on next navigation or API call.
            // For now, just skip refresh and keep user state as is.
            console.warn('No refresh token cookie found. User will remain logged in until next auth-required action.');
          }
        }
      } catch (err) {
        setAuth({});
        clearAuthData();
        localStorage.removeItem('hasLoggedIn');
      } finally {
        setLoading(false);
      }
    };

    verifyRefreshToken();
  }, [auth?.accessToken]); // Run only once on component mount

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
        
        // Set the flag to indicate the user has explicitly logged in
        localStorage.setItem('hasLoggedIn', 'true');
        
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
