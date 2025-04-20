import { axiosPrivate } from './api';

export const getPolicies = async () => {
  try {
    const response = await axiosPrivate.get('/api/policies');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getPolicy = async (id) => {
  try {
    const response = await axiosPrivate.get(`/api/policies/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createPolicy = async (policyData) => {
  try {
    const response = await axiosPrivate.post('/api/policies', policyData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updatePolicy = async (id, policyData) => {
  try {
    const response = await axiosPrivate.put(`/api/policies/${id}`, policyData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deletePolicy = async (id) => {
  try {
    const response = await axiosPrivate.delete(`/api/policies/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};