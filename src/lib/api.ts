import axios from "axios";

export const api = axios.create({
  baseURL: process.env.VITE_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request/response interceptors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle global error cases
    console.error("API Error:", error);
    return Promise.reject(error);
  }
);
