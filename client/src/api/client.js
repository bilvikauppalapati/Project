import axios from 'axios';

export const API_ORIGIN = import.meta.env.VITE_API_URL || '';
export const TOKEN_KEY = 'pawshare_token';

const api = axios.create({ baseURL: `${API_ORIGIN}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const status = err.response?.status;
    const message = err.response?.data?.message || (err.request ? 'Cannot reach the server. Is the backend running?' : err.message);
    if (status === 401 && localStorage.getItem(TOKEN_KEY)) {
      window.dispatchEvent(new Event('pawshare:unauthorized'));
    }
    return Promise.reject(Object.assign(new Error(message), { status, details: err.response?.data?.details }));
  }
);

export function toFormData(values) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      if (value.length && value[0] instanceof File) value.forEach((f) => fd.append(key, f));
      else fd.append(key, JSON.stringify(value));
    } else if (value instanceof File) fd.append(key, value);
    else fd.append(key, String(value));
  }
  return fd;
}

export default api;
