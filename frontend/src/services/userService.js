import { axiosPrivate } from './api';
import axios from 'axios';

export const getAllUsers = async () => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Fetching all users');
    }
    const response = await axiosPrivate.get('/api/users/all');
    if (process.env.NODE_ENV !== 'production') {
      console.log('Users fetched successfully:', response.data.length);
    }
    return response.data;
  } catch (error) {
    // Skip error handling for canceled requests
    if (axios.isCancel(error) || (error.isCanceled)) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('User fetch request was canceled');
      }
      throw error;
    }
    console.error('Error fetching users:', error);
    throw error;
  }
};

export const getUserById = async (userId) => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Fetching user with ID: ${userId}`);
    }
    const response = await axiosPrivate.get(`/api/users/user/${userId}`);
    if (process.env.NODE_ENV !== 'production') {
      console.log('User fetched successfully');
    }
    return response.data;
  } catch (error) {
    // Skip error handling for canceled requests
    if (axios.isCancel(error) || (error.isCanceled)) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`User fetch request for ${userId} was canceled`);
      }
      throw error;
    }
    console.error(`Error fetching user ${userId}:`, error);
    throw error;
  }
};

export const registerUser = async (userData) => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Registering new user');
    }
    const response = await axiosPrivate.post('/api/users/register', userData);
    if (process.env.NODE_ENV !== 'production') {
      console.log('User registered successfully');
    }
    return response.data;
  } catch (error) {
    // Skip error handling for canceled requests
    if (axios.isCancel(error) || (error.isCanceled)) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('User registration request was canceled');
      }
      throw error;
    }
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
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Updating user ${userId}`);
    }
    const response = await axiosPrivate.put('/api/users/update', {
      id: userId,
      ...userData
    });
    if (process.env.NODE_ENV !== 'production') {
      console.log('User updated successfully');
    }
    return response.data;
  } catch (error) {
    // Skip error handling for canceled requests
    if (axios.isCancel(error) || (error.isCanceled)) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`User update request for ${userId} was canceled`);
      }
      throw error;
    }
    console.error(`Error updating user ${userId}:`, error);
    throw error;
  }
};

export const deleteUser = async (userId) => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Deleting user ${userId}`);
    }
    const response = await axiosPrivate.delete(`/api/users/delete/${userId}`);
    if (process.env.NODE_ENV !== 'production') {
      console.log('User deleted successfully');
    }
    return response.data;
  } catch (error) {
    // Skip error handling for canceled requests
    if (axios.isCancel(error) || (error.isCanceled)) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`User deletion request for ${userId} was canceled`);
      }
      throw error;
    }
    console.error(`Error deleting user ${userId}:`, error);
    throw error;
  }
};