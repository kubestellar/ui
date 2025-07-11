import axios, { AxiosError } from 'axios';
import { toast } from 'react-hot-toast';

export const api = axios.create({
  baseURL: process.env.VITE_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include JWT token in headers
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('jwtToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Add response interceptors with proper error typing
api.interceptors.response.use(
  response => response,
  (error: AxiosError<{ message: string; error: string }>) => {
    // Handle global error cases
    const errorMessage =
      error.response?.data?.message || error.response?.data?.error || error.message;

    console.error('API Error:', errorMessage);

    // Don't show toast for 401 errors on verification endpoint to prevent
    // unnecessary error messages during auth checks
    const isAuthCheck = error.config?.url?.includes('/api/me');
    if (error.response?.status === 401 && isAuthCheck) {
      console.log('Auth verification failed, ignoring toast');
    } else if (error.config?.url?.includes('/login') && error.response?.status === 401) {
      // Don't show global toast for login 401 errors - the login hook will handle this
      console.log('Login failed, letting login hook handle the error');
    } else if (error.response?.status === 401) {
      // For other 401 errors, show a user-friendly message
      const toastId = `api-error-401`;
      toast.error('Authentication required. Please log in again.', { id: toastId });
    } else {
      // For other errors, show toast but use a consistent ID to prevent duplicates
      const toastId = `api-error-${error.response?.status || 'unknown'}`;
      toast.error(errorMessage, { id: toastId });
    }

    return Promise.reject(error);
  }
);

// Helper function to get WebSocket URL with proper protocol and base URL
export const getWebSocketUrl = (path: string): string => {
  const baseUrl = process.env.VITE_BASE_URL || '';

  const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws';

  const baseUrlWithoutProtocol = baseUrl.replace(/^https?:\/\//, '');

  return `${wsProtocol}://${baseUrlWithoutProtocol}${path}`;
};
