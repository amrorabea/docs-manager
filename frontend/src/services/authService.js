import axios from './api';

export const login = async (credentials) => {
  try {
    console.log('Login credentials:', credentials);
    const response = await axios.post('/auth/handleLogin', credentials);
    
    // Store the access token in localStorage when login is successful
    if (response.data && response.data.accessToken) {
      console.log('Access token received, storing in localStorage');
      localStorage.setItem('accessToken', response.data.accessToken);
    } else {
      console.warn('No access token received in login response');
    }
    
    return response.data;
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
    
    // Update the stored access token with the new one
    if (response.data && response.data.accessToken) {
      console.log('New access token received, updating localStorage');
      localStorage.setItem('accessToken', response.data.accessToken);
    } else {
      console.warn('No access token received in refresh response');
    }
    
    return response.data;
  } catch (error) {
    console.error('Token refresh error:', error.response?.data || error.message);
    // If refresh fails, clear the token to force re-login
    localStorage.removeItem('accessToken');
    throw error;
  }
};

export const logout = async () => {
  try {
    console.log('Logging out user');
    await axios.get('/logout/handleLogout');
    
    // Always clear the access token on logout
    localStorage.removeItem('accessToken');
    console.log('User logged out, token removed');
  } catch (error) {
    console.error('Logout error:', error.response?.data || error.message);
    // Still remove the token even if the logout API call fails
    localStorage.removeItem('accessToken');
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