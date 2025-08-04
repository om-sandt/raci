import apiService from './api';

const endpoint = '/divisions';

const divisionService = {
  createDivision: (data) => apiService.post(endpoint, data),
  updateDivision: (id, data) => apiService.put(`${endpoint}/${id}`, data),
  getDivisions: () => apiService.get(endpoint),
  getDivisionById: (id) => apiService.get(`${endpoint}/${id}`),
  deleteDivision: (id) => apiService.delete(`${endpoint}/${id}`),
};

export default divisionService; 