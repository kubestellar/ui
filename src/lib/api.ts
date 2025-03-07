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
    // Handle global error cases
    const errorMessage = error.response?.data?.message || error.message;
    console.error("API Error:", errorMessage);
    toast.error(errorMessage);
    return Promise.reject(error);
  }
);