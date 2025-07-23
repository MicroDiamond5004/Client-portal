import axios from 'axios';
import { getStore } from './storeRef';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token') ?? getStore().getState().auth.token;
  const cookie = localStorage.getItem('cookie') ?? getStore().getState().auth.cookie;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    config.headers.Cookie = cookie;
  }

  if (config.url === '/updateChange' && config.data?.type === 'order') {
    // console.log(config.data?.id);
  }

  return config;
});

export default api;
