import { axiosPrivate } from './api';

export const getDepartments = async () => {
  try {
    console.log('Fetching departments');
    const response = await axiosPrivate.get('/api/departments/all');
    console.log('Departments fetched successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching departments:', error);
    throw error;
  }
};

export const createDepartment = async (departmentData) => {
  try {
    console.log('Creating department with data:', departmentData);
    const response = await axiosPrivate.post('/api/departments/create', departmentData);
    console.log('Department created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating department:', error);
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

export const updateDepartment = async (id, departmentData) => {
  try {
    console.log(`Updating department ${id} with data:`, departmentData);
    const response = await axiosPrivate.put(`/api/departments/update/${id}`, departmentData);
    console.log('Department updated successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error(`Error updating department ${id}:`, error);
    throw error;
  }
};

export const deleteDepartment = async (id) => {
  try {
    console.log(`Deleting department ${id}`);
    const response = await axiosPrivate.delete(`/api/departments/delete/${id}`);
    console.log('Department deleted successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error(`Error deleting department ${id}:`, error);
    throw error;
  }
};