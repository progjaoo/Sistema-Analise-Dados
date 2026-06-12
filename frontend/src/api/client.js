import axios from "axios";

let accessToken = null;

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

export const setAccessToken = (token) => {
  accessToken = token;
};

export const errorMessage = (error) =>
  error.response?.data?.error || error.message || "Não foi possível concluir a operação.";
