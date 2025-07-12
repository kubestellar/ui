// Token and refresh logic moved from src/lib/api.ts
import { AxiosInstance } from 'axios';

const REFRESH_ENDPOINT = process.env.VITE_REFRESH_ENDPOINT || '/api/refresh';
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

export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const [, payload] = token.split('.');
    const decoded = JSON.parse(atob(payload));
    if (!decoded.exp) return true;
    return Date.now() >= decoded.exp * 1000;
  } catch {
    return true;
  }
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(api: AxiosInstance): Promise<string | null> {
  if (isRefreshing && refreshPromise) return refreshPromise;
  isRefreshing = true;
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    isRefreshing = false;
    return null;
  }
  refreshPromise = api
    .post(REFRESH_ENDPOINT, { refreshToken })
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
