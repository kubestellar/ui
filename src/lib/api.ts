import axios, { AxiosError } from "axios";
import { toast } from 'react-hot-toast';

export const api = axios.create({
  baseURL: process.env.VITE_BASE_URL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request/response interceptors with proper error typing
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message: string }>) => {
    // Handle global error cases
    const errorMessage = error.response?.data?.message || error.message;
    console.error("API Error:", errorMessage);
    toast.error(errorMessage);
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