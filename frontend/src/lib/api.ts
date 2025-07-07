import axios, { AxiosRequestConfig } from 'axios';
import { toast } from 'react-hot-toast';

export const api = axios.create({
  baseURL: process.env.VITE_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper functions for token management
const ACCESS_TOKEN_KEY = 'jwtToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string) {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// Helper to decode JWT and check expiration
function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const [, payload] = token.split('.');
    const decoded = JSON.parse(atob(payload));
    if (!decoded.exp) return true;
    // exp is in seconds
    return Date.now() >= decoded.exp * 1000;
  } catch {
    return true;
  }
}

// Helper to refresh token
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) return refreshPromise;
  isRefreshing = true;
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    isRefreshing = false;
    return null;
  }
  refreshPromise = api
    .post('/api/refresh', { refreshToken })
    .then(res => {
      const { token, refreshToken: newRefreshToken } = res.data;
      if (token) setAccessToken(token);
      if (newRefreshToken) setRefreshToken(newRefreshToken);
      isRefreshing = false;
      refreshPromise = null;
      return token;
    })
    .catch(() => {
      isRefreshing = false;
      refreshPromise = null;
      clearTokens();
      return null;
    });
  return refreshPromise;
}

// Add request interceptor to include JWT token in headers
api.interceptors.request.use(
  async config => {
    let token = getAccessToken();
    // If token is expired, try to refresh
    if (isTokenExpired(token)) {
      token = await refreshAccessToken();
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
  response => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      toast.error('An unknown error occurred.');
      return Promise.reject(error);
    }

    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    const errorMessage =
      error.response?.data?.message || error.response?.data?.error || error.message;
    const isAuthCheck = error.config?.url?.includes('/api/me');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthCheck) {
      originalRequest._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } else {
        clearTokens();
        toast.error('Session expired. Please log in again.');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

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
  const baseUrl = process.env.VITE_BASE_URL || '';

  const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws';

  const baseUrlWithoutProtocol = baseUrl.replace(/^https?:\/\//, '');

  return `${wsProtocol}://${baseUrlWithoutProtocol}${path}`;
};
