import axios from './api';
import { jwtDecode } from 'jwt-decode';
import { loginRequest } from './api';

// Optimized utility function to clear all authentication-related data
export const clearAuthData = () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Clearing authentication data');
  }
  
  // Clear both localStorage and sessionStorage
  const storageTypes = [localStorage, sessionStorage];
  
  // Define known auth keys to remove
  const knownAuthKeys = [
    'accessToken',
    'user',
    'isAdmin',
    'lastLogin',
    'authState',
    'hasLoggedIn',
    'csrfToken'
  ];
  
  storageTypes.forEach(storage => {
    // Clear all known auth-related storage items
    knownAuthKeys.forEach(key => storage.removeItem(key));
  });
  
  // Simplified cookie clearing - focus on the most important cookies
  const authCookies = ['jwt', 'XSRF-TOKEN', 'refresh_token', 'app.sid', 'connect.sid'];
  const paths = ['/', '/api'];
  
  // Expire all auth cookies
  authCookies.forEach(cookieName => {
    paths.forEach(path => {
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path};`;
    });
  });
  
  // Clear any other cookie that might exist
  const cookies = document.cookie.split(";");
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i];
    const eqPos = cookie.indexOf("=");
    const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
    if (name) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
    }
  }
};

// Check token validity
const isTokenValid = (token) => {
  if (!token) return false;
  
  try {
    const decoded = jwtDecode(token);
    // Check if token is expired
    return decoded.exp * 1000 > Date.now();
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
};

// Set a last activity timestamp to detect idle sessions
const updateLastActivity = () => {
  localStorage.setItem('lastActivity', Date.now().toString());
};

// Check if the session is idle (no activity for X minutes)
export const isSessionIdle = (maxIdleMinutes = 30) => {
  const lastActivity = localStorage.getItem('lastActivity');
  if (!lastActivity) return false;
  
  const idleTime = Date.now() - parseInt(lastActivity);
  return idleTime > maxIdleMinutes * 60 * 1000;
};

// Set up listeners for idle detection
export const setupIdleDetection = () => {
  updateLastActivity();
  
  // Update activity timestamp on user interaction
  ['mousedown', 'keydown', 'touchstart', 'scroll'].forEach(event => {
    window.addEventListener(event, updateLastActivity, { passive: true });
  });
  
  // Check for idle session every minute
  setInterval(() => {
    if (isSessionIdle()) {
      console.log('Session idle detected, logging out');
      logout();
    }
  }, 60 * 1000);
};

// Function to check and clear auth data on page load
const checkAndClearOnLoad = () => {
  // Check if user has explicitly logged in
  const hasExplicitlyLoggedIn = localStorage.getItem('hasLoggedIn') === 'true';
  
  // Check if token is still valid
  const accessToken = localStorage.getItem('accessToken');
  const isValid = isTokenValid(accessToken);
  
  // If no explicit login or invalid token, clear everything
  if (!hasExplicitlyLoggedIn || !isValid) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Auth data cleared: ${!hasExplicitlyLoggedIn ? 'No explicit login' : 'Invalid token'}`);
    }
    clearAuthData();
  }
};

// Immediately run the check function
checkAndClearOnLoad();

export const login = async (credentials) => {
  try {
    // Use the specialized login function for better CSRF token handling
    const data = await loginRequest(credentials.email, credentials.password);

    if (data && data.accessToken) {
      const accessToken = data.accessToken;
      
      // Use the user object directly from the API response
      // instead of decoding the JWT, which might not include all user data
      const user = data.user;

      // Store token and user info in localStorage
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Set the flag to indicate explicit login
      localStorage.setItem('hasLoggedIn', 'true');
      
      // Set last activity timestamp
      updateLastActivity();
      
      // Setup idle detection after login
      setupIdleDetection();

      return {
        accessToken,
        user
      };
    } else {
      console.warn('No access token received in login response');
      return {};
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Login failed';
    console.error('Login error:', errorMessage);
    throw new Error(errorMessage);
  }
};

export const register = async (userData) => {
  try {
    console.log('Registering new user:', { ...userData, password: '[REDACTED]' });
    const response = await axios.post('/register/handleNewUser', userData);
    console.log('Registration successful');
    return response.data;
  } catch (error) {
    console.error('Registration error:', error.response?.data || error.message);
    throw error;
  }
};

export const refresh = async () => {
  try {
    console.log('Attempting to refresh token');
    
    // Only attempt refresh if we have a valid refresh token cookie
    if (!document.cookie.includes('jwt=')) {
      throw new Error('No refresh token available');
    }
    
    const response = await axios.get('/refresh/handleRefreshToken');
    
    if (response.data && response.data.accessToken) {
      const accessToken = response.data.accessToken;
      console.log('New access token received, updating localStorage');
      localStorage.setItem('accessToken', accessToken);

      // Update last activity timestamp
      updateLastActivity();

      // Use the user object from the response if available
      if (response.data.user) {
        console.log('User data from refresh:', response.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        return {
          accessToken,
          user: response.data.user
        };
      } else {
        // Fall back to decoding the token if no user object is provided
        console.warn('No user object in refresh response, falling back to token decoding');
        const decoded = jwtDecode(accessToken);
        localStorage.setItem('user', JSON.stringify(decoded));
        return {
          accessToken,
          user: decoded
        };
      }
    } else {
      console.warn('No access token received in refresh response');
      return null;
    }
  } catch (error) {
    console.error('Token refresh error:', error.response?.data || error.message);
    clearAuthData();
    throw error;
  }
};

export const logout = async () => {
  try {
    console.log('Logging out user');
    
    // Only make the logout call if we have a token (to avoid unnecessary API errors)
    if (localStorage.getItem('accessToken')) {
      await axios.get('/logout/handleLogout');
    }
    
    // Clear all auth data
    clearAuthData();
    
  } catch (error) {
    console.error('Logout error:', error.response?.data || error.message);
    
    // Still clear all auth data even if the API call fails
    clearAuthData();
    
    throw error;
  } finally {
    // Navigate to login page
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }
};

// Helper function to check if user is logged in
export const isAuthenticated = () => {
  const token = localStorage.getItem('accessToken');
  return isTokenValid(token);
};

// Helper function to get the current token
export const getAccessToken = () => {
  return localStorage.getItem('accessToken');
};

// Helper function to get user info
export const getUserInfo = () => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error parsing user info:', error);
    return null;
  }
};

// Helper function to check if user is admin
export const isAdmin = () => {
  const user = getUserInfo();
  return user && user.role === 'admin';
};