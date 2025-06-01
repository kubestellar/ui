import axios, { AxiosError } from 'axios';
import { toast } from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:4000';

console.log('🌐 API Configuration:', {
  'VITE_BASE_URL': import.meta.env.VITE_BASE_URL,
  'API_BASE_URL': API_BASE_URL,
});

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  withCredentials: true, 
  headers: {
    'Content-Type': 'application/json',
  },
});

//  Request interceptor with correct token key and debugging
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('jwtToken'); 
    
    console.log('🔍 API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      fullURL: `${config.baseURL}${config.url}`,
      tokenExists: !!token,
      tokenPreview: token ? token.substring(0, 30) + '...' : null
    });
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ Authorization header added');
    } else {
      console.log('⚠️ No token found in localStorage');
    }
    
    return config;
  },
  error => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  response => {
    console.log('✅ Response:', {
      method: response.config.method?.toUpperCase(),
      url: response.config.url,
      status: response.status,
      statusText: response.statusText
    });
    return response;
  },
  (error: AxiosError<{ message: string; error: string }>) => {
    console.error('❌ Response error:', {
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });

    const errorMessage =
      error.response?.data?.message || error.response?.data?.error || error.message;

    //  FIX: Clear token on 401 errors
    if (error.response?.status === 401) {
      console.log('🚫 401 Unauthorized - clearing token');
      localStorage.removeItem('jwtToken');
    }

    // Don't show toast for auth verification endpoints
    const isAuthCheck = error.config?.url?.includes('/api/me');
    if (error.response?.status === 401 && isAuthCheck) {
      console.log('Auth verification failed, ignoring toast');
    } else {
      toast.error(errorMessage);
    }

    return Promise.reject(error);
  }
);

// Helper function to get WebSocket URL with proper protocol and base URL
export const getWebSocketUrl = (path: string): string => {
  const baseUrl = import.meta.env.VITE_BASE_URL || 'http://localhost:4000';

  const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
  const baseUrlWithoutProtocol = baseUrl.replace(/^https?:\/\//, '');

  return `${wsProtocol}://${baseUrlWithoutProtocol}${path}`;
};