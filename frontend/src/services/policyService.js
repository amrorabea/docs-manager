import { axiosPrivate, debugAuthStatus, withExtendedTimeout } from './api';
import axios from 'axios';

// Add a direct fetch function for policies that bypasses interceptors
const directFetch = async (url) => {
  try {
    // Always get the token from localStorage
    const token = localStorage.getItem('accessToken');
    const directAxios = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
      timeout: 60000, // Long timeout
      withCredentials: true
    });
    // Always add the auth token if available
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    
    console.log(`[Direct fetch] Requesting: ${url}`);
    const response = await directAxios.get(url, { headers });
    console.log(`[Direct fetch] Success for: ${url}`);
    
    return response.data;
  } catch (error) {
    console.error(`[Direct fetch] Error fetching ${url}:`, error);
    throw error;
  }
};

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
    console.log(`Fetching policy with ID: ${id}`);
    
    // Try the direct approach first
    try {
      console.log('Attempting direct fetch...');
      const data = await directFetch(`/api/policies/policy/${id}`);
      
      console.log('Successfully retrieved policy via direct fetch:', {
        id: data._id,
        name: data.name,
        approvalDate: data.approvalDate,
        department: data.department?.name
      });
      
      return data;
    } catch (directError) {
      console.error('Direct fetch failed, falling back to standard method:', directError);
      // Fall back to the standard method if direct fails
      const response = await axiosPrivate.get(`/api/policies/policy/${id}`, withExtendedTimeout({
        // Add signal: false to prevent abort controller from being attached
        signal: undefined,
        // Add cancelToken: null to prevent axios from adding its own token
        cancelToken: undefined
      }));
      
      console.log('Successfully retrieved policy via fallback:', {
        id: response.data._id,
        name: response.data.name,
        approvalDate: response.data.approvalDate,
        department: response.data.department?.name
      });
      
      return response.data;
    }
  } catch (error) {
    console.error('Error fetching policy:', error);
    // Provide more context about the error
    if (error.isCanceled || error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
      console.error('Request was canceled - this might be due to timeout or navigation away from the page');
    } else if (error.response) {
      console.error('Server response error:', error.response.status, error.response.data);
    }
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

export const searchPolicyContent = async (query) => {
  try {
    const response = await axiosPrivate.get('/api/policies/content-search', {
      params: { query }
    });
    return response.data;
  } catch (error) {
    console.error('Content search error:', error);
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
    console.log('Creating policy with data:', {
      name: policyData.get('name'),
      department: policyData.get('department'),
      approvalDate: policyData.get('approvalDate'),
      reviewCycleYears: policyData.get('reviewCycleYears'),
      approvalValidity: policyData.get('approvalValidity'),
      status: policyData.get('status'),
      hasWordFile: policyData.has('wordFile'),
      hasPdfFile: policyData.has('pdfFile')
    });
    
    // Check authentication status before making the request
    console.log('Authentication status before policy creation:');
    debugAuthStatus();
    
    // When sending FormData, DO NOT set the Content-Type header
    // Let the browser set it automatically with the correct boundary
    const response = await axiosPrivate.post('/api/policies/create', policyData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 10 * 60 * 1000 // 10 minutes
    });
    return response.data;
  } catch (error) {
    console.error('Policy creation error details:', error, error.config);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      console.error('Error message:', error.response.data?.message);
      console.error('Field with error:', error.response.data?.field);
      console.error('Details:', error.response.data?.details);
      
      // Log complete request headers
      console.log('Request headers:', error.config?.headers);
    }
    throw error;
  }
};

export const updatePolicy = async (id, policyData) => {
  try {
    // When sending FormData, DO NOT set the Content-Type header
    // Let the browser set it automatically with the correct boundary
    const response = await axiosPrivate.put(`/api/policies/update/${id}`, policyData, withExtendedTimeout({
      // Remove the Content-Type header - the browser will set it correctly
      headers: {
        // 'Content-Type': 'multipart/form-data' - DO NOT SET THIS
      }
    }));
    return response.data;
  } catch (error) {
    console.error('Policy update error details:', error.response?.data || error.message);
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

export const downloadPolicyFile = async (id, fileType) => {
  try {
    // Use the backend proxy endpoint to download the file
    const response = await axiosPrivate.get(`/api/policies/download/${id}/${fileType}`, {
      responseType: 'blob'
    });
    
    // Create a blob URL from the response
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    
    // Get the filename from Content-Disposition header if available
    let filename = fileType === 'word' ? 'document.docx' : 'document.pdf';
    
    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
        // Decode the filename if it's URI encoded
        try {
          filename = decodeURIComponent(filename);
        } catch (e) {
          console.error('Error decoding filename:', e);
        }
      }
    }
    
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error(`Error downloading ${fileType} file:`, error);
    alert(`حدث خطأ أثناء محاولة تنزيل الملف. يرجى المحاولة مرة أخرى.`);
  }
};