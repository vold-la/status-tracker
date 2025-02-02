import axiosInstance from '../lib/axiosInstance';

export const getAllIncidents = async () => {
  const response = await axiosInstance.get('/api/incidents');
  return response.data;
};

export const createIncident = async (incidentData) => {
  const response = await axiosInstance.post('/api/incidents', incidentData);
  return response.data;
};

export const getIncidentDetails = async (incidentId) => {
  const response = await axiosInstance.get(`/api/incidents/${incidentId}`);
  return response.data;
};

export const updateIncident = async (incidentId, incidentData) => {
  const response = await axiosInstance.put(`/api/incidents/${incidentId}`, incidentData);
  return response.data;
};

export const deleteIncident = async (incidentId) => {
  const response = await axiosInstance.delete(`/api/incidents/${incidentId}`);
  return response.data;
};

export const getIncidentsByService = async (serviceId) => {
  const response = await axiosInstance.get(`/api/services/${serviceId}/incidents`);
  return response.data;
};