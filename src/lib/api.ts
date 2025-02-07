import axios from "axios";
import { BASE_URL } from "../utils/credentials";

export const api = axios.create({
  baseURL: BASE_URL,
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
