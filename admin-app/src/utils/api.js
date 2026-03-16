import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api'
});

// Add token to requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Admin Auth APIs
export const adminLogin = (email, password) =>
  API.post('/admin/auth/login', { email, password });

export const adminGetProfile = () =>
  API.get('/admin/auth/profile');

export const adminLogout = () =>
  API.post('/admin/auth/logout');

// Admin Dashboard APIs
export const getDashboard = () =>
  API.get('/admin/dashboard');

// User Management APIs
export const getAllUsers = (page = 1, limit = 20, role = '', search = '') =>
  API.get('/admin/users', { params: { page, limit, role, search } });

export const getUserDetails = (userId) =>
  API.get(`/admin/users/${userId}`);

export const updateUserStatus = (userId, isActive, reason) =>
  API.put(`/admin/users/${userId}/status`, { isActive, reason });

export const deleteUser = (userId) =>
  API.delete(`/admin/users/${userId}`);

// Project Management APIs
export const getAllProjects = (page = 1, limit = 20, status = '', search = '') =>
  API.get('/admin/projects', { params: { page, limit, status, search } });

export const updateProjectStatus = (projectId, status, reason) =>
  API.put(`/admin/projects/${projectId}/status`, { status, reason });

export const deleteProject = (projectId) =>
  API.delete(`/admin/projects/${projectId}`);

// Reports APIs
export const getReports = () =>
  API.get('/admin/reports');

export default API;
