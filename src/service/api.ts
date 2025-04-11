import axios from 'axios';

// Get the base URL from environment or use localhost:4000 for desktop app
// Extend the Window interface to include the electron property
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    electron?: any;
  }
}

const getBaseUrl = () => {
  // If running in Electron context
  if (window.electron) {
    return 'http://localhost:4000';
  }
  
  // Otherwise use the environment variable
  return import.meta.env.VITE_BASE_URL || 'http://localhost:4000';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;