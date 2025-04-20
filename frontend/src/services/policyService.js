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

export const searchPolicies = async (query, departmentId = null) => {
  try {
    console.log(`Service: Searching for "${query}" with departmentId: ${departmentId || 'none'}`);
    const params = { query };
    if (departmentId) {
      params.departmentId = departmentId;
    }
    
    const response = await axiosPrivate.get('/api/policies/search', { params });
    console.log(`Service: Search returned ${response.data.length} results`);
    return response.data;
  } catch (error) {
    console.error('Error in searchPolicies service:', error.message);
    throw error;
  }
};

export const getPolicyStats = async (departmentId = null) => {
  try {
    const params = departmentId ? { departmentId } : {};
    const response = await axiosPrivate.get('/api/policies/stats', { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updatePolicyStatuses = async () => {
  try {
    const response = await axiosPrivate.post('/api/policies/update-statuses');
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

export const downloadPolicyFile = (id, fileType) => {
  // For file downloads, we'll use a direct link rather than handling it in JavaScript
  const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  const downloadUrl = `${baseUrl}/api/policies/download/${id}/${fileType}`;
  
  // Open the download in a new window/tab
  window.open(downloadUrl, '_blank');
};