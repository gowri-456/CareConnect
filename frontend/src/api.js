import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cc_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function request(config) {
  try {
    const response = await api(config);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.response?.data?.error || error.message || "Something went wrong";
    throw new Error(message, { cause: error });
  }
}

export default api;