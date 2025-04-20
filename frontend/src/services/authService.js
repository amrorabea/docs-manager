import axios from './api';

export const login = async (credentials) => {
  try {
    // The actual endpoint is /auth/handleLogin according to your backend
    console.log(credentials);
    const response = await axios.post('/auth/handleLogin', credentials);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const register = async (userData) => {
  try {
    // The actual endpoint is /register/handleNewUser according to your backend
    const response = await axios.post('/register/handleNewUser', userData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const refresh = async () => {
  try {
    // The actual endpoint is /refresh/handleRefreshToken according to your backend
    const response = await axios.get('/refresh/handleRefreshToken');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const logout = async () => {
  try {
    // The actual endpoint is /logout/handleLogout according to your backend
    await axios.get('/logout/handleLogout');
  } catch (error) {
    throw error;
  }
};