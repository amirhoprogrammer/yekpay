import axios from "axios";
import type { ApiError } from "../types/exchange";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("flowpay_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("flowpay_token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export function getApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error) && error.response?.data) {
    const data = error.response.data as Partial<ApiError>;
    return {
      message: data.message ?? "Something went wrong.",
      code: data.code ?? "UNKNOWN_ERROR",
      errors: data.errors ?? null,
    };
  }
  return {
    message: error instanceof Error ? error.message : "Network error.",
    code: "NETWORK_ERROR",
    errors: null,
  };
}
