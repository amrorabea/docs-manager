import axios from 'axios';
import { clearAuthData } from './authService';

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
    
    // If error is 401 (Unauthorized) and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Use a single refresh promise to avoid multiple refresh requests
        if (!refreshPromise) {
          refreshPromise = axiosPublic.get('/refresh/handleRefreshToken');
        }
        
        const response = await refreshPromise;
        refreshPromise = null;
        
        // Store the new access token
        const newAccessToken = response.data.accessToken;
        if (newAccessToken) {
          localStorage.setItem('accessToken', newAccessToken);
          
          // Update the header for the original request
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          
          // Retry the original request
          return axiosPrivate(originalRequest);
        } else {
          handleAuthFailure();
          return Promise.reject(new Error('Authentication failed'));
        }
      } catch (refreshError) {
        refreshPromise = null;
        handleAuthFailure();
        return Promise.reject(refreshError);
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
  clearAuthData();
  
  if (!isRedirecting && !window.location.pathname.includes('/login')) {
    isRedirecting = true;
    
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

// Clear authentication
export const clearAuth = () => {
  clearAuthData();
  clearCache();
};

export default axiosPublic;