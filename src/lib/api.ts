import axios, { AxiosError } from "axios";
import { toast } from 'react-hot-toast';

export const api = axios.create({
  baseURL: process.env.VITE_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request/response interceptors with proper error typing
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message: string }>) => {
    const isAuthEndpoint = error.config?.url === '/protected';
    const is401Error = error.response?.status === 401;
    
    if (!(isAuthEndpoint && is401Error)) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error("API Error:", errorMessage);
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