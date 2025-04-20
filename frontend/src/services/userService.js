import { axiosPrivate } from './api';

export const getAllUsers = async () => {
  try {
    console.log('Fetching all users');
    const response = await axiosPrivate.get('/api/users/all');
    console.log('Users fetched successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

export const getUserById = async (userId) => {
  try {
    console.log(`Fetching user with ID: ${userId}`);
    const response = await axiosPrivate.get(`/api/users/user/${userId}`);
    console.log('User fetched successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
    throw error;
  }
};

export const registerUser = async (userData) => {
  try {
    console.log('Registering new user with data:', userData);
    const response = await axiosPrivate.post('/api/users/register', userData);
    console.log('User registered successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error registering user:', error);
    // Log detailed error information
    if (error.response) {
      console.error('Server response:', {
        status: error.response.status,
        data: error.response.data
      });
    }
    throw error;
  }
};

export const updateUser = async (userId, userData) => {
  try {
    console.log(`Updating user ${userId} with data:`, userData);
    const response = await axiosPrivate.put('/api/users/update', {
      id: userId,
      ...userData
    });
    console.log('User updated successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error(`Error updating user ${userId}:`, error);
    throw error;
  }
};

export const deleteUser = async (userId) => {
  try {
    console.log(`Deleting user ${userId}`);
    const response = await axiosPrivate.delete(`/api/users/delete/${userId}`);
    console.log('User deleted successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error(`Error deleting user ${userId}:`, error);
    throw error;
  }
};