import axiosInstance from '../lib/axiosInstance';

export const getAllServices = async () => {
  try {
    const response = await axiosInstance.get('/api/services');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to fetch services');
  }
};

export const createService = async (serviceData) => {
  try {
    const response = await axiosInstance.post('/api/services', serviceData);
    return response.data;
  } catch (error) {
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw new Error('Failed to create service');
  }
};

export const updateService = async (id, serviceData) => {
  try {
    const response = await axiosInstance.put(`/api/services/${id}`, serviceData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to update service');
  }
};

export const deleteService = async (id) => {
  try {
    await axiosInstance.delete(`/api/services/${id}`);
    return true;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to delete service');
  }
};