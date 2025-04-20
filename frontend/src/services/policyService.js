import { axiosPrivate } from './api';

export const getPolicies = async () => {
  try {
    const response = await axiosPrivate.get('/api/policies/all');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getPolicy = async (id) => {
  try {
    const response = await axiosPrivate.get(`/api/policies/policy/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createPolicy = async (policyData) => {
  try {
    const response = await axiosPrivate.post('/api/policies/create', policyData, {
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
    const response = await axiosPrivate.put(`/api/policies/update/${id}`, policyData, {
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
    const response = await axiosPrivate.delete(`/api/policies/delete/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};