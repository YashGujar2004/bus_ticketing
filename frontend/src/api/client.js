/**
 * Axios HTTP client configured for the FastAPI backend.
 * Automatically attaches JWT auth tokens to requests.
 */
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';

const client = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// ── Request Interceptor: attach JWT token ───────────────────────────────
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response Interceptor: handle 401 (expired token) ────────────────────
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;

// ── API Endpoint Helpers ────────────────────────────────────────────────
export const authAPI = {
  register: (data) => client.post('/auth/register', data),
  login: (data) => client.post('/auth/login', data),
  me: () => client.get('/auth/me'),
};

export const busAPI = {
  list: (params) => client.get('/buses', { params }),
  get: (id) => client.get(`/buses/${id}`),
  aiSearch: (query) => client.post('/buses/ai-search', { query }),
  create: (data) => client.post('/buses', data),
  update: (id, data) => client.put(`/buses/${id}`, data),
  delete: (id) => client.delete(`/buses/${id}`),
};

export const bookingAPI = {
  create: (data) => client.post('/bookings', data),
  myBookings: () => client.get('/bookings/my-bookings'),
  cancel: (id) => client.post(`/bookings/${id}/cancel`),
};

export const adminAPI = {
  dashboard: () => client.get('/admin/dashboard'),
  routeDemand: () => client.get('/admin/route-demand'),
  busOccupancy: () => client.get('/admin/bus-occupancy'),
};
