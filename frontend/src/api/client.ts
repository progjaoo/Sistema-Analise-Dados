import axios from "axios";

let accessToken: string | null = localStorage.getItem("maravilha_token");

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api", timeout: 30000 });
api.interceptors.request.use(async (config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});
export const setAccessToken = (token: string | null) => { accessToken = token; token ? localStorage.setItem("maravilha_token", token) : localStorage.removeItem("maravilha_token"); };
export const hasAccessToken = () => Boolean(accessToken);
export const errorMessage = (error: unknown) => axios.isAxiosError(error) ? error.response?.data?.error || error.message : error instanceof Error ? error.message : "Não foi possível concluir a operação.";
