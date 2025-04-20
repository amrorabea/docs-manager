import axios from './api';
import { jwtDecode } from 'jwt-decode';

// Utility function to clear all authentication-related data
export const clearAuthData = () => {
  console.log('Clearing all authentication data');
  
  // Clear both localStorage and sessionStorage
  const storageTypes = [localStorage, sessionStorage];
  
  storageTypes.forEach(storage => {
    // Clear all known auth-related storage items
    storage.removeItem('accessToken');
    storage.removeItem('user');
    storage.removeItem('isAdmin');
    storage.removeItem('lastLogin');
    storage.removeItem('authState');
    storage.removeItem('hasLoggedIn');
    
    // Find and clear any other items that might contain auth data
    const authRelatedKeys = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && (
        key.toLowerCase().includes('token') || 
        key.toLowerCase().includes('auth') || 
        key.toLowerCase().includes('user') ||
        key.toLowerCase().includes('login') ||
        key.toLowerCase().includes('session')
      )) {
        authRelatedKeys.push(key);
      }
    }
    
    // Remove all identified auth-related items
    authRelatedKeys.forEach(key => storage.removeItem(key));
  });
  
  // Super aggressive cookie clearing - clear cookies on all possible paths and domains
  const cookieNames = ['jwt', 'token', 'refresh_token', 'access_token', 'id_token', 'auth', 'session'];
  const pathsToTry = ['/', '/api', '/auth', '', '/refresh', '/logout'];
  const domainsToTry = [
    window.location.hostname,
    `.${window.location.hostname}`,
    window.location.hostname.split('.').slice(1).join('.'),
    ''
  ];
  
  cookieNames.forEach(cookieName => {
    // Standard approach
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
    
    // Try clearing with various combinations of path and domain
    pathsToTry.forEach(path => {
      domainsToTry.forEach(domain => {
        if (domain) {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; domain=${domain};`;
        } else {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path};`;
        }
        
        // Also try with secure and httpOnly (though httpOnly can only be cleared by server)
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; secure;`;
        if (domain) {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; domain=${domain}; secure;`;
        }
        
        // Try with SameSite variations
        ['Strict', 'Lax', 'None'].forEach(sameSite => {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; SameSite=${sameSite};`;
          if (domain) {
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; domain=${domain}; SameSite=${sameSite};`;
          }
          if (sameSite === 'None') {
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; SameSite=None; secure;`;
            if (domain) {
              document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; domain=${domain}; SameSite=None; secure;`;
            }
          }
        });
      });
    });
  });
  
  // Also try the traditional approach for all cookies
  const cookies = document.cookie.split(";");
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i];
    const eqPos = cookie.indexOf("=");
    const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname};`;
  }
  
  console.log('All authentication data cleared');
};

// Function to check and clear auth data on page load
const checkAndClearOnLoad = () => {
  // Check if user has explicitly logged in
  const hasExplicitlyLoggedIn = localStorage.getItem('hasLoggedIn') === 'true';
  
  // If no explicit login, clear everything to prevent auto-refresh attempts
  if (!hasExplicitlyLoggedIn) {
    console.log('No explicit login detected on page load - clearing all auth cookies');
    clearAuthData();
  }
};

// Immediately run the check function
checkAndClearOnLoad();

export const login = async (credentials) => {
  try {
    const response = await axios.post('/auth/handleLogin', credentials);

    if (response.data && response.data.accessToken) {
      const accessToken = response.data.accessToken;

      // Decode the token to extract user info
      const decodedUser = jwtDecode(accessToken);

      console.log('Decoded user:', decodedUser);

      // Store token and user info in localStorage
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('user', JSON.stringify(decodedUser));
      
      // Set the flag to indicate explicit login
      localStorage.setItem('hasLoggedIn', 'true');

      return {
        accessToken,
        user: decodedUser
      };
    } else {
      console.warn('No access token received in login response');
      return {};
    }
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    throw error;
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
    const response = await axios.get('/refresh/handleRefreshToken');
    
    if (response.data && response.data.accessToken) {
      const accessToken = response.data.accessToken;
      console.log('New access token received, updating localStorage');
      localStorage.setItem('accessToken', accessToken);

      // Decode the token to get user info
      const decoded = jwtDecode(accessToken);
      localStorage.setItem('user', JSON.stringify(decoded));

      return {
        ...response.data,
        user: decoded
      };
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
    await axios.get('/logout/handleLogout');
    
    // Clear all auth data
    clearAuthData();
    
  } catch (error) {
    console.error('Logout error:', error.response?.data || error.message);
    
    // Still clear all auth data even if the API call fails
    clearAuthData();
    
    throw error;
  }
};

// Helper function to check if user is logged in
export const isAuthenticated = () => {
  return !!localStorage.getItem('accessToken');
};

// Helper function to get the current token
export const getAccessToken = () => {
  return localStorage.getItem('accessToken');
};