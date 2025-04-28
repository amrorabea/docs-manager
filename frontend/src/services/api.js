import axios from 'axios';

const BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://209.74.80.185:5000'
  : 'http://localhost:5000';

// Simple in-memory cache with size limit
const cache = new Map();
const MAX_CACHE_ENTRIES = 100;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const REQUEST_TIMEOUT = 30000; // 30 seconds timeout

// Create controller map for cancellation
const pendingControllers = new Map();

// For public endpoints (no auth required)
export const axiosPublic = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: REQUEST_TIMEOUT
});

// For protected endpoints (auth required)
export const axiosPrivate = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: REQUEST_TIMEOUT
});

// Initialize CSRF token on module load
(async function fetchInitialCSRFToken() {
  try {
    console.log('Fetching initial CSRF token on startup');
    const response = await axiosPublic.get('/api/security/csrf-token');
    const token = getCSRFToken();
    if (token) {
      console.log('Initial CSRF token obtained');
      localStorage.setItem('csrfToken', token);
    } else {
      console.warn('Failed to get CSRF token from cookie after request');
      // Try to extract from response headers as fallback
      const headerToken = response.headers['x-csrf-token'] || response.headers['x-xsrf-token'];
      if (headerToken) {
        console.log('Using CSRF token from response headers');
        document.cookie = `XSRF-TOKEN=${headerToken}; path=/; max-age=${24 * 60 * 60}`;
        localStorage.setItem('csrfToken', headerToken);
      }
    }
  } catch (error) {
    console.warn('Failed to fetch initial CSRF token:', error);
  }
})();

// Debounce mechanism for repeated requests
const pendingRequests = new Map();

// Token refresh state
let refreshPromise = null;
let isRedirecting = false;

// Local implementation to avoid circular dependencies
const clearAuthData = () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Auth failure: Clearing data');
  }
  
  // Clear local storage
  const knownAuthKeys = [
    'accessToken', 'user', 'isAdmin', 'lastLogin', 'authState', 'hasLoggedIn', 'csrfToken'
  ];
  
  [localStorage, sessionStorage].forEach(storage => {
    knownAuthKeys.forEach(key => storage.removeItem(key));
  });
  
  // Clear cookies
  ['jwt', 'XSRF-TOKEN', 'refresh_token'].forEach(name => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
  });
  
  // Clear cache
  cache.clear();
};

// Helper to get CSRF token from cookie
const getCSRFToken = () => {
  // Improved cookie parsing
  try {
    // Try from cookie first
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'XSRF-TOKEN') {
        return decodeURIComponent(value);
      }
    }
    
    // Try from localStorage fallback if we set it there
    const storedToken = localStorage.getItem('csrfToken');
    if (storedToken) {
      console.log('Using CSRF token from localStorage');
      return storedToken;
    }
    
    // If no token found, log a warning
    console.warn('CSRF token not found in cookies or localStorage');
    return null;
  } catch (error) {
    console.error('Error getting CSRF token:', error);
    return null;
  }
};

// Function to cancel previous identical requests
const cancelPreviousRequests = (requestId) => {
  if (pendingControllers.has(requestId)) {
    const controller = pendingControllers.get(requestId);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Cancelling duplicate request: ${requestId}`);
    }
    controller.abort();
    pendingControllers.delete(requestId);
  }
};

// Limit cache size
const addToCache = (key, value) => {
  // If cache is full, remove oldest entry
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
  cache.set(key, value);
};

// Add request interceptor to handle cancellation and timeouts
axiosPrivate.interceptors.request.use(
  config => {
    const auth = JSON.parse(localStorage.getItem('auth')) || {};
    if (!config.headers['Authorization'] && auth.accessToken) {
      config.headers['Authorization'] = `Bearer ${auth.accessToken}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Debug helper for auth status
export const debugAuthStatus = async () => {
  try {
    const token = localStorage.getItem('accessToken');
    const csrfToken = localStorage.getItem('csrfToken');
    return {
      hasToken: !!token,
      tokenExpiry: token ? JSON.parse(atob(token.split('.')[1])).exp : null,
      hasCsrfToken: !!csrfToken,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Auth debug error:', error);
    return { error: error.message };
  }
};

// Handle authentication failures
const handleAuthFailure = () => {
  if (process.env.NODE_ENV !== 'production') {
    debugAuthStatus();
  }
  
  clearAuthData();
  
  if (!isRedirecting && !window.location.pathname.includes('/login')) {
    isRedirecting = true;
    window.location.href = '/login';
    setTimeout(() => {
      isRedirecting = false;
    }, 500);
  }
};

// Modify the error interceptor
axiosPrivate.interceptors.response.use(
  response => response,
  async error => {
    // Clean up on error
    if (error.config) {
      const requestId = `${error.config.method}-${error.config.url}`;
      if (pendingControllers.has(requestId)) {
        const controller = pendingControllers.get(requestId);
        clearTimeout(controller._timeoutId);
        pendingControllers.delete(requestId);
      }
    }

    // Handle authentication errors
    if (error.response?.status === 401) {
      handleAuthFailure();
    }

    return Promise.reject(error);
  }
);

// Clean up on response
axiosPrivate.interceptors.response.use(
  response => {
    const requestId = `${response.config.method}-${response.config.url}`;
    
    // Clear the controller and timeout
    if (pendingControllers.has(requestId)) {
      const controller = pendingControllers.get(requestId);
      clearTimeout(controller._timeoutId);
      pendingControllers.delete(requestId);
    }
    
    // Cache GET responses
    if (response.config.method === 'get' && !response.cached && response.config.cache !== false) {
      const cacheKey = `${response.config.url}${JSON.stringify(response.config.params || {})}`;
      addToCache(cacheKey, {
        data: response.data,
        headers: response.headers,
        timestamp: Date.now()
      });
    }
    
    return response;
  },
  async error => {
    // Clean up on error too
    if (error.config) {
      const requestId = `${error.config.method}-${error.config.url}`;
      if (pendingControllers.has(requestId)) {
        const controller = pendingControllers.get(requestId);
        clearTimeout(controller._timeoutId);
        pendingControllers.delete(requestId);
      }
    }
    
    // Don't log or propagate cancellation errors unless in development
    if (axios.isCancel(error)) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Request canceled: ${error.message}`);
      }
      // Return a rejected promise but with a recognizable format
      return Promise.reject({
        isCanceled: true,
        message: 'Request was canceled',
        originalError: error
      });
    }

    const originalRequest = error.config;
    
    // Add code to detect network errors and transform them to a more user-friendly format
    if (error.message && error.message.includes('Network Error')) {
      console.error('Network error detected:', error);
      return Promise.reject({
        ...error,
        response: {
          status: 0,
          data: { message: 'لا يمكن الاتصال بالخادم. تحقق من اتصالك بالإنترنت.' }
        }
      });
    }
    
    // Handle CSRF errors
    if (error.response?.status === 403 && error.response?.data?.message?.includes('CSRF')) {
      console.error('CSRF validation failed:', error);
      // Refresh CSRF token instead of reloading the page
      await refreshCSRFToken();
      if (originalRequest) {
        // Retry the request with new token
        const token = getCSRFToken();
        if (token) {
          originalRequest.headers['X-CSRF-Token'] = token;
          originalRequest.headers['X-XSRF-TOKEN'] = token;
          return axiosPrivate(originalRequest);
        }
      }
      return Promise.reject(error);
    }
    
    // Handle error cases where error.config is undefined
    if (!originalRequest) {
      console.error('Request config missing in error object:', error);
      return Promise.reject(error);
    }
    
    // If error is 401 (Unauthorized) and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Use a single refresh promise to avoid multiple refresh requests
        if (!refreshPromise) {
          console.log('Attempting to refresh token');
          refreshPromise = axiosPublic.get('/refresh/handleRefreshToken');
        }
        
        const response = await refreshPromise;
        refreshPromise = null;
        
        // Store the new access token
        const newAccessToken = response.data?.accessToken;
        if (newAccessToken) {
          console.log('Token refresh successful, retrying original request');
          localStorage.setItem('accessToken', newAccessToken);
          
          // Update the header for the original request
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          
          // Retry the original request
          return axiosPrivate(originalRequest);
        } else {
          console.error('Token refresh succeeded but no token was returned');
          handleAuthFailure();
          return Promise.reject(new Error('Authentication failed'));
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        refreshPromise = null;
        handleAuthFailure();
        return Promise.reject(refreshError);
      }
    }
    
    // If we have a 403 error (Forbidden)
    if (error.response?.status === 403) {
      console.log('Forbidden access detected, checking if user is logged in');
      if (localStorage.getItem('accessToken')) {
        // User is logged in but doesn't have permission
        console.error('User is logged in but access is forbidden');
        
        // Log security event
        try {
          const securityEvent = {
            type: 'FORBIDDEN_ACCESS',
            details: {
              url: originalRequest.url,
              method: originalRequest.method
            }
          };
          // Use a new axios instance to avoid circular refreshing
          axios.post(`${BASE_URL}/api/security/log-event`, securityEvent, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
          }).catch(() => {/* Silently fail */});
        } catch (e) {/* Ignore errors */}
      } else {
        // User is not logged in, redirect to login
        console.error('User is not logged in and access is forbidden');
        handleAuthFailure();
      }
    }
    
    // If it's an auth error (401 or 403), log auth debug info
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.log('Auth error detected. Debug info:');
      debugAuthStatus();
    }
    
    return Promise.reject(error);
  }
);

// Clear cache based on URL pattern
export const clearCache = (urlPattern) => {
  if (!urlPattern) {
    cache.clear();
    return;
  }
  
  cache.forEach((value, key) => {
    if (key.includes(urlPattern)) {
      cache.delete(key);
    }
  });
};

// Check if we have a valid token
export const hasValidToken = () => {
  return !!localStorage.getItem('accessToken');
};

// Add a method to refresh CSRF token
export const refreshCSRFToken = async () => {
  try {
    await axiosPublic.get('/api/security/csrf-token');
    return true;
  } catch (error) {
    console.error('Failed to refresh CSRF token:', error);
    return false;
  }
};

// Ensure CSRF token is available before auth requests
export const ensureCSRFToken = async () => {
  const csrfToken = getCSRFToken();
  if (!csrfToken) {
    console.log('No CSRF token found, fetching a new one');
    try {
      // Try multiple endpoint variations to ensure we get a token
      const endpoints = [
        '/api/security/csrf-token',
        '/api/security/csrf',
        '/' // If the server generates CSRF tokens for all requests
      ];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying to fetch CSRF token from ${endpoint}`);
          const response = await axiosPublic.get(endpoint);
          console.log(`CSRF token response from ${endpoint}:`, response.status);
          
          // Check if we got a token after this request
          const token = getCSRFToken();
          if (token) {
            console.log('Successfully obtained CSRF token');
            localStorage.setItem('csrfToken', token);
            return token;
          }
          
          // If there's a token in headers, use that
          const headerToken = response.headers['x-xsrf-token'];
          if (headerToken) {
            console.log('Using CSRF token from response headers');
            localStorage.setItem('csrfToken', headerToken);
            return headerToken;
          }
        } catch (endpointError) {
          console.warn(`Failed to fetch CSRF token from ${endpoint}:`, endpointError);
          // Continue to next endpoint
        }
      }
      
      console.error('Failed to fetch CSRF token from any endpoint');
      return null;
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
      return null;
    }
  }
  return csrfToken;
};

// Export the default axios instance for public routes
export default axiosPublic;

// Special login function that ensures CSRF token handling
export const loginRequest = async (credentials) => {
    try {
        const response = await axiosPublic.post('/auth/handleLogin', credentials, {
            withCredentials: true,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.data?.accessToken) {
            localStorage.setItem('accessToken', response.data.accessToken);
            return response.data;
        }
        
        throw new Error('No access token received');
    } catch (error) {
        if (error.response?.status === 401) {
            throw new Error('Invalid credentials');
        }
        throw error;
    }
};

// Add timeout wrapper for long-running requests
export const withExtendedTimeout = async (apiCall) => {
  try {
    const response = await Promise.race([
      apiCall,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      )
    ]);
    return response;
  } catch (error) {
    if (error.message === 'Request timeout') {
      throw new Error('Request took too long to complete');
    }
    throw error;
  }
};