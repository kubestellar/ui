import axios, { AxiosRequestConfig } from 'axios';
import { toast } from 'react-hot-toast';
import { setGlobalNetworkError } from '../utils/networkErrorUtils';
import { isOnLoginPage } from '../utils/routeUtils';
import {
  getAccessToken,
  clearTokens,
  isTokenExpired,
  refreshAccessToken,
} from '../components/login/tokenUtils';

export const api = axios.create({
  baseURL: process.env.VITE_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include JWT token in headers
api.interceptors.request.use(
  async config => {
    let token = getAccessToken();
    // If token is expired, try to refresh
    if (isTokenExpired(token)) {
      token = await refreshAccessToken(api);
    }
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
  response => {
    console.log('Axios Interceptor: Successful response. Clearing network error.');
    setGlobalNetworkError(false);
    return response;
  },
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      console.error('Axios Interceptor: An unknown error occurred.', error);
      toast.error('An unknown error occurred.');
      return Promise.reject(error);
    }

    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    const errorMessage =
      error.response?.data?.message || error.response?.data?.error || error.message;
    const isAuthCheck = error.config?.url?.includes('/api/me');

    // Don't try to refresh token for login endpoint - 401 means wrong credentials
    const isLoginEndpoint = error.config?.url?.includes('/login');

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthCheck &&
      !isLoginEndpoint
    ) {
      console.warn('Axios Interceptor: 401 Unauthorized. Attempting token refresh.');
      originalRequest._retry = true;
      const newToken = await refreshAccessToken(api);
      if (newToken) {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } else {
        console.error('Axios Interceptor: Token refresh failed. Redirecting to login.');
        clearTokens();

        // Only show toast if user is not already on login page
        if (!isOnLoginPage()) {
          toast.error('Session expired. Please log in again.');
        }

        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    if (!error.response) {
      console.error(
        'Axios Interceptor: Network error (no response). Setting global network error.'
      );
      setGlobalNetworkError(true);
    } else {
      console.error('Axios Interceptor: API error response.', error.response);
      // Don't show error toast for:
      // - 401 responses from auth checks (/api/me) when on login page (we don't want "Invalid Token" there)
      // - Login endpoint errors (handled by useLogin hook)
      const isLoginEndpoint = error.config?.url?.includes('/login');
      const shouldSuppressToast = (error.response.status === 401 && isAuthCheck) || isLoginEndpoint;

      if (!shouldSuppressToast) {
        // For other errors, show toast but use a consistent ID to prevent duplicates
        const toastId = `api-error-${error.response?.status || 'unknown'}`;
        toast.error(errorMessage, { id: toastId });
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
