// File: frontend/src/api.js
import axios from 'axios';

// Vite provides environment variables to know if we are in development or production
const isDevelopment = import.meta.env.DEV;

const api = axios.create({
  baseURL: isDevelopment ? 'http://localhost:3001' : '/',
});

export default api;