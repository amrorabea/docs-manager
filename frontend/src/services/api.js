import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Simple in-memory cache
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// For public endpoints (no auth required)
export const axiosPublic = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true  // Needed for cookies (refresh token)
});

// For protected endpoints (auth required)
export const axiosPrivate = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true
});

// Debounce mechanism for repeated requests
const pendingRequests = new Map();

// Token refresh state
let refreshPromise = null;
let isRedirecting = false;

// Function to clear auth data (used for auth failures)
const clearAuthData = () => {
  // Clear local storage
  const storageTypes = [localStorage, sessionStorage];
  storageTypes.forEach(storage => {
    storage.removeItem('accessToken');
    storage.removeItem('user');
    storage.removeItem('isAdmin');
    storage.removeItem('lastLogin');
    storage.removeItem('authState');
    storage.removeItem('hasLoggedIn');
  });

  // Basic cookie clearing (for basic handling of auth failures)
  document.cookie = 'jwt=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;';
  
  // Clear cache
  cache.clear();
};

// Add request interceptor to attach the access token to all private requests
axiosPrivate.interceptors.request.use(
  config => {
    // Get the token from localStorage
    const accessToken = localStorage.getItem('accessToken');
    
    if (accessToken) {
      // Add Authorization header with the token
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // Handle caching for GET requests
    if (config.method === 'get' && config.cache !== false) {
      const cacheKey = `${config.url}${JSON.stringify(config.params || {})}`;
      const cachedResponse = cache.get(cacheKey);
      
      if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_DURATION) {
        // Return cached response as a promise
        config.adapter = () => {
          return Promise.resolve({
            data: cachedResponse.data,
            status: 200,
            statusText: 'OK',
            headers: cachedResponse.headers,
            config: config,
            cached: true
          });
        };
      }
    }

    // Implement request debouncing
    if (config.debounce) {
      const requestKey = `${config.method}:${config.url}:${JSON.stringify(config.data || {})}`;
      
      if (pendingRequests.has(requestKey)) {
        const controller = new AbortController();
        config.signal = controller.signal;
        controller.abort('Request debounced');
      }
      
      pendingRequests.set(requestKey, true);
      setTimeout(() => pendingRequests.delete(requestKey), 500);
    }
    
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token refresh
axiosPrivate.interceptors.response.use(
  response => {
    // Cache GET responses
    if (response.config.method === 'get' && !response.cached && response.config.cache !== false) {
      const cacheKey = `${response.config.url}${JSON.stringify(response.config.params || {})}`;
      cache.set(cacheKey, {
        data: response.data,
        headers: response.headers,
        timestamp: Date.now()
      });
    }
    return response;
  },
  async error => {
    // Don't retry aborted requests
    if (error.message === 'Request debounced' || axios.isCancel(error)) {
      return Promise.reject(error);
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
        const newAccessToken = response.data.accessToken;
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
      } else {
        // User is not logged in, redirect to login
        console.error('User is not logged in and access is forbidden');
        handleAuthFailure();
      }
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

// Handle authentication failures
const handleAuthFailure = () => {
  console.log('Authentication failure detected, clearing data and redirecting');
  clearAuthData();
  
  if (!isRedirecting && !window.location.pathname.includes('/login')) {
    isRedirecting = true;
    
    // Show a user-friendly message
    alert('انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.');
    
    setTimeout(() => {
      window.location.href = '/login';
      setTimeout(() => {
        isRedirecting = false;
      }, 500);
    }, 0);
  }
};

// Check if we have a valid token
export const hasValidToken = () => {
  return !!localStorage.getItem('accessToken');
};

// Export the default axios instance for public routes
export default axiosPublic;