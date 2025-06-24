import axios, { AxiosError } from 'axios';
import { toast } from 'react-hot-toast';
import React from 'react';
import { useNetworkError } from '../context/NetworkErrorContext';

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
    } else {
      // Only show toast if not a network error
      if (!isNetworkError(error)) {
        toast.error(errorMessage);
      }
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

// Add this utility to detect network errors
function isNetworkError(error: unknown): boolean {
  if (!error) return false;
  if (typeof window !== 'undefined' && window.navigator && !window.navigator.onLine) return true;
  if (typeof error === 'object' && error !== null) {
    if ('isAxiosError' in error && (error as any).isAxiosError) {
      if (!(error as any).response && (error as any).message && (error as any).message.includes('Network Error')) {
        return true;
      }
    }
    if ('message' in error && typeof (error as any).message === 'string' && (error as any).message.includes('Network Error')) {
      return true;
    }
  }
  return false;
}

export const useApiNetworkErrorInterceptor = () => {
  const { showNetworkError, hideNetworkError } = useNetworkError();
  React.useEffect(() => {
    const interceptor = api.interceptors.response.use(
      response => {
        // On any successful response, hide the network error banner
        hideNetworkError();
        return response;
      },
      error => {
        if (isNetworkError(error)) {
          showNetworkError();
        }
        return Promise.reject(error);
      }
    );
    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, [showNetworkError, hideNetworkError]);
};
