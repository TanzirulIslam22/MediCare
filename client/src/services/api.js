import axios from 'axios';

export const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let accessToken = null;
let refreshPromise = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function clearAccessToken() {
  accessToken = null;
}

API.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

async function refreshTokens() {
  const { data } = await API.post('/auth/refresh');
  return data.data;
}

API.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      !original._retried &&
      original.url !== '/auth/login' &&
      original.url !== '/auth/refresh'
    ) {
      original._retried = true;
      try {
        refreshPromise = refreshPromise || refreshTokens();
        const { accessToken: newToken, user } = await refreshPromise;
        refreshPromise = null;
        setAccessToken(newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return API(original);
      } catch (refreshError) {
        refreshPromise = null;
        clearAccessToken();
        window.dispatchEvent(new CustomEvent('auth:expired'));
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default API;
