import { axiosPrivate } from './api';

export const getDepartments = async () => {
  try {
    const response = await axiosPrivate.get('/api/departments/all');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getDepartment = async (id) => {
  try {
    const response = await axiosPrivate.get(`/api/departments/department/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createDepartment = async (departmentData) => {
  try {
    const response = await axiosPrivate.post('/api/departments/create', departmentData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateDepartment = async (id, departmentData) => {
  try {
    const response = await axiosPrivate.put(`/api/departments/update/${id}`, departmentData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteDepartment = async (id) => {
  try {
    const response = await axiosPrivate.delete(`/api/departments/delete/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};