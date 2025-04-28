import axios from 'axios';

const BASE_URL = process.env.NODE_ENV === 'production'
  ? 'http://209.74.80.185:5000'
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
    'accessToken', 'user', 'isAdmin', 'lastLogin', 'authState', 'hasLoggedIn'
  ];
  
  [localStorage, sessionStorage].forEach(storage => {
    knownAuthKeys.forEach(key => storage.removeItem(key));
  });
  
  // Clear cookies
  ['jwt', 'refresh_token'].forEach(name => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
  });
  
  // Clear cache
  cache.clear();
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
  async config => {
    try {
      // Generate a unique request ID based on URL and method
      const requestId = `${config.method}-${config.url}`;
      
      // Don't cancel GET requests for resources that might change frequently
      // This prevents excessive cancellations during navigation
      const shouldCancelDuplicates = config.cancelDuplicates !== false && 
        !(config.method === 'get' && config.url.includes('/api/notifications'));
      
      // Cancel any previous identical requests to avoid race conditions
      if (shouldCancelDuplicates) {
        cancelPreviousRequests(requestId);
      }
      
      // Create an AbortController for this request
      const controller = new AbortController();
      config.signal = controller.signal;
      pendingControllers.set(requestId, controller);
      
      // Set up automatic cancellation after timeout
      const timeoutId = setTimeout(() => {
        if (pendingControllers.has(requestId)) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`Request timed out: ${requestId}`);
          }
          controller.abort();
          pendingControllers.delete(requestId);
        }
      }, config.timeout || REQUEST_TIMEOUT);
      
      // Store the timeout ID for cleanup
      controller._timeoutId = timeoutId;
      
      // Debounce frequently called endpoints
      if (config.debounce && pendingRequests.has(requestId)) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Debouncing request: ${requestId}`);
        }
        controller.abort('Request debounced');
        return Promise.reject(new axios.Cancel('Request debounced'));
      }
      
      if (config.debounce) {
        pendingRequests.set(requestId, Date.now());
        setTimeout(() => {
          pendingRequests.delete(requestId);
        }, config.debounce);
      }
      
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
        
        if (cachedResponse && Date.now() - cachedResponse.timestamp < (config.cacheDuration || CACHE_DURATION)) {
          // Return cached response as a promise
          config.adapter = () => {
            // Clean up the controller and timeout for cached responses
            clearTimeout(controller._timeoutId);
            pendingControllers.delete(requestId);
            
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
      
      return config;
    } catch (err) {
      console.error('Request setup error:', err.message);
      return Promise.reject(err);
    }
  },
  error => {
    console.error('Request interceptor error:', error);
    // Debug auth status on request errors
    console.log('Auth status on request error:');
    debugAuthStatus();
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

// Special login function that ensures CSRF token handling
export const loginRequest = async (email, password) => {
  try {
    // Use only headers that are allowed by the backend CORS configuration
    const headers = {
      'Content-Type': 'application/json',
    };
    
    const data = { 
      email, 
      password
    };
    
    console.log('Sending login request');
    
    // Create a custom axios instance for this specific request
    const loginAxios = axios.create({
      baseURL: BASE_URL,
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
      timeout: REQUEST_TIMEOUT
    });
    
    const response = await loginAxios.post('/auth/handleLogin', data, { headers });
    return response.data;
  } catch (error) {
    // Provide more detailed error for debugging
    if (error.message === 'Network Error') {
      console.error('Login request failed (CORS issue):', error);
      throw new Error('Unable to connect to the server. This may be a CORS issue.');
    } else {
      console.error('Login request failed:', error);
      throw error;
    }
  }
};

// API request function
const apiRequest = async (url, method = 'GET', data = null) => {
  try {
    // Use only standard headers to avoid CORS preflight issues
    const headers = {
      'Content-Type': 'application/json',
    };

    // Add Authorization header with the token if available
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const options = {
      method,
      headers,
      credentials: 'include', // Important for cookies
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    // Create AbortController for fetch
    const controller = new AbortController();
    options.signal = controller.signal;
    
    // Set a timeout for the request
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT);

    try {
      const response = await fetch(`${BASE_URL}${url}`, options);
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      // If the response indicates a CSRF error, log it clearly
      if (response.status === 403) {
        const responseData = await response.json();
        throw new Error(responseData.error || 'Forbidden');
      }

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      // Try to parse JSON response safely
      try {
        return await response.json();
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        return { success: true, message: 'Operation completed successfully' };
      }
    } catch (fetchError) {
      // Clean up timeout on error
      clearTimeout(timeoutId);
      
      // Handle cancellation
      if (fetchError.name === 'AbortError') {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Request to ${url} was aborted/timed out`);
        }
        throw new Error('Request was canceled or timed out');
      }
      
      throw fetchError;
    }
  } catch (error) {
    // Provide more detailed error for debugging
    if (error.message === 'Failed to fetch' || error.message.includes('NetworkError')) {
      console.error('API request network error:', error);
      throw new Error('Unable to connect to the server. Please check your internet connection.');
    } else if (error.message.includes('canceled') || error.message.includes('aborted')) {
      // Don't log cancellation errors in production
      if (process.env.NODE_ENV !== 'production') {
        console.log('API request canceled:', error.message);
      }
      // Return a standardized cancel error
      throw {
        isCanceled: true,
        message: 'Request was canceled',
        originalError: error
      };
    } else {
      console.error('API request error:', error);
      throw error;
    }
  }
};

// Add request interceptors to axiosPublic as well for login/register endpoints
axiosPublic.interceptors.request.use(
  async (config) => {
    try {
      // Special handling for auth endpoints
      if (config.url?.includes('/auth/')) {
        // Only set standard headers that don't trigger CORS preflight
        config.headers['Content-Type'] = 'application/json';
      }
      
      // Add Authorization header with the token if available
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        config.headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      return config;
    } catch (err) {
      console.error('Request setup error:', err.message);
      return Promise.reject(err);
    }
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add request interceptors to axiosPrivate
axiosPrivate.interceptors.request.use(
  async (config) => {
    try {
      // Do not set Content-Type for FormData objects - the browser handles this automatically
      const isFormData = config.data instanceof FormData;
      
      if (isFormData) {
        // Delete Content-Type header if it exists to let the browser set it with correct boundary
        delete config.headers['Content-Type'];
        console.log('FormData detected: Content-Type header removed to allow browser to set it correctly');
      }
      
      // Add Authorization header with the token if available
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        config.headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      return config;
    } catch (err) {
      console.error('Request setup error:', err.message);
      return Promise.reject(err);
    }
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Ensure apiRequest is exported
export { apiRequest };

// Add this function at the end of the file
export const debugAuthStatus = () => {
  try {
    const authData = {
      accessToken: !!localStorage.getItem('accessToken'),
      refreshToken: document.cookie.includes('refresh_token'),
      user: localStorage.getItem('user'),
      isAdmin: localStorage.getItem('isAdmin') === 'true',
      cookies: document.cookie
    };
    
    console.log('Auth Debug Info:', authData);
    return authData;
  } catch (err) {
    console.error('Error debugging auth status:', err);
    return { error: err.message };
  }
};

// Add a helper function to increase timeout for specific API calls
export const withExtendedTimeout = (config = {}) => {
  return {
    ...config,
    timeout: 60000 // 60 seconds for operations that might take longer
  };
};