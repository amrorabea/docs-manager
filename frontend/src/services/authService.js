import axios from './api';
import { jwtDecode } from 'jwt-decode';


export const login = async (credentials) => {
  try {
    const response = await axios.post('/auth/handleLogin', credentials);

    if (response.data && response.data.accessToken) {
      const accessToken = response.data.accessToken;

      // Decode the token to extract user info (like email, role)
      const decodedUser = jwtDecode(accessToken); // Ensure 'role' is in the decoded data

      console.log('Decoded user:', decodedUser);  // Verify that 'role' is present

      // Store token and user info in localStorage
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('user', JSON.stringify(decodedUser));  // Store full user info, including role

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

      // Decode the token to get user info (like email, role)
      const decoded = jwtDecode(accessToken);
      localStorage.setItem('user', JSON.stringify(decoded));  // Store the updated user info

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
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
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