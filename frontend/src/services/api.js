import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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
  withCredentials: true  // Needed for cookies (refresh token)
});

// Flag to prevent multiple redirects
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
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token refresh
axiosPrivate.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    // If error is 401 (Unauthorized) and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Call your refresh token endpoint
        const response = await axiosPublic.get('/refresh/handleRefreshToken');
        
        // Store the new access token
        const newAccessToken = response.data.accessToken;
        if (newAccessToken) {
          localStorage.setItem('accessToken', newAccessToken);
          
          // Update the header for the original request
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          
          // Retry the original request
          return axiosPrivate(originalRequest);
        } else {
          // If no token received, handle auth failure
          console.error('No token received during refresh');
          handleAuthFailure();
          return Promise.reject(new Error('Authentication failed'));
        }
      } catch (refreshError) {
        // If refresh fails, handle auth failure
        console.error('Token refresh failed:', refreshError);
        handleAuthFailure();
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Handle authentication failures without causing infinite loops
const handleAuthFailure = () => {
  // Clear the token
  localStorage.removeItem('accessToken');
  
  // Only redirect if we're not already in the process of redirecting
  // and we're not already on the login page
  if (!isRedirecting && !window.location.pathname.includes('/login')) {
    isRedirecting = true;
    
    // Use a timeout to prevent potential race conditions
    setTimeout(() => {
      window.location.href = '/login';
      // Reset the flag after navigation starts
      setTimeout(() => {
        isRedirecting = false;
      }, 500);
    }, 0);
  }
};

// Add a method to check if we have a valid token
export const hasValidToken = () => {
  return !!localStorage.getItem('accessToken');
};

// Add a method to clear authentication
export const clearAuth = () => {
  localStorage.removeItem('accessToken');
};

export default axiosPublic;