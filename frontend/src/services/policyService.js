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

export const downloadPolicyFile = async (id, fileType) => {
  try {
    // Get the policy to access the direct Cloudinary URL
    const policy = await getPolicy(id);
    
    // Get the direct Cloudinary URL based on file type
    let fileUrl;
    if (fileType === 'word') {
      fileUrl = policy.wordFileUrl;
    } else if (fileType === 'pdf') {
      fileUrl = policy.pdfFileUrl;
      
      // For PDFs, modify the Cloudinary URL to properly display in browser
      // Change 'raw/upload' to 'image/view' for PDFs to render correctly
      fileUrl = fileUrl.replace('/raw/upload/', '/image/view/');
    }
    
    if (!fileUrl) {
      throw new Error(`No ${fileType} file available for this policy`);
    }
    
    // Open the Cloudinary URL directly in a new window/tab
    window.open(fileUrl, '_blank');
  } catch (error) {
    console.error(`Error downloading ${fileType} file:`, error);
    alert(`حدث خطأ أثناء محاولة فتح الملف. يرجى المحاولة مرة أخرى.`);
  }
};