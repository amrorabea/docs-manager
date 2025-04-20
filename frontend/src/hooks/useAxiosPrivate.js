import { useEffect } from 'react';
import { axiosPrivate } from '../services/api';
import useAuth from './useAuth';
import { useNavigate } from 'react-router-dom';

const useAxiosPrivate = () => {
  const { auth, setAuth, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Request interceptor - adds the token to all requests
    const requestIntercept = axiosPrivate.interceptors.request.use(
      config => {
        // Log request details for debugging
        console.log(`Making ${config.method.toUpperCase()} request to: ${config.url}`);
        
        // If Authorization header isn't already set, add it from auth context
        if (!config.headers['Authorization'] && auth?.accessToken) {
          console.log('Adding Authorization header with token');
          config.headers['Authorization'] = `Bearer ${auth.accessToken}`;
        }
        
        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor - handles token refresh on 401/403 errors
    const responseIntercept = axiosPrivate.interceptors.response.use(
      response => {
        // Log successful responses for debugging
        console.log(`Response from ${response.config.url}:`, {
          status: response.status,
          statusText: response.statusText
        });
        return response;
      },
      async (error) => {
        // Log error responses for debugging
        console.error(`Error response from ${error.config?.url}:`, {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
        
        const prevRequest = error?.config;
        
        // Handle 401 (Unauthorized) or 403 (Forbidden) errors
        if ((error?.response?.status === 401 || error?.response?.status === 403) && 
            !prevRequest?._retry) {
          
          console.log('Token expired or invalid, attempting to refresh...');
          prevRequest._retry = true;
          
          try {
            // Call the refresh token endpoint
            const response = await axiosPrivate.get('/refresh/handleRefreshToken');
            
            if (!response.data?.accessToken) {
              console.error('No access token received from refresh endpoint');
              throw new Error('Failed to refresh token');
            }
            
            console.log('Token refreshed successfully');
            
            // Update auth context with new token
            setAuth(prev => ({
              ...prev,
              accessToken: response.data.accessToken
            }));
            
            // Update the Authorization header for the original request
            prevRequest.headers['Authorization'] = `Bearer ${response.data.accessToken}`;
            
            // Retry the original request with the new token
            return axiosPrivate(prevRequest);
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            
            // If refresh fails, log the user out and redirect to login
            logout();
            navigate('/login', { state: { from: window.location.pathname } });
            
            return Promise.reject(refreshError);
          }
        }
        
        // For other errors, just reject the promise
        return Promise.reject(error);
      }
    );

    // Clean up interceptors when the component unmounts
    return () => {
      axiosPrivate.interceptors.request.eject(requestIntercept);
      axiosPrivate.interceptors.response.eject(responseIntercept);
    };
  }, [auth, setAuth, logout, navigate]);

  return axiosPrivate;
};

export default useAxiosPrivate;