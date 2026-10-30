import axios from 'axios';
import { supabase } from '@/lib/supabase';

const getApiBaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!envUrl) {
    return 'http://localhost:8000/api';
  }
  let url = envUrl.trim().replace(/\/+$/, '');
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }
  return url;
};

const API_BASE_URL = getApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for Auth Token
apiClient.interceptors.request.use(
  async (config) => {
    if (typeof window !== 'undefined') {
      let token = localStorage.getItem('access_token');
      if (!token) {
        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.access_token) {
            token = data.session.access_token;
            localStorage.setItem('access_token', token);
          }
        } catch {}
      }
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for Clean Error Format
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let detail = 'An unexpected network error occurred.';
    if (error.response?.data?.detail) {
      detail = typeof error.response.data.detail === 'string'
        ? error.response.data.detail
        : JSON.stringify(error.response.data.detail);
    } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      detail = 'The request timed out. The server might be processing a large task or waking up.';
    } else if (error.message === 'Network Error' || (error.isAxiosError && !error.response)) {
      detail = 'Cannot connect to backend server. The server may be waking up (Render free tier) or temporarily unreachable. Please retry in a few seconds.';
    } else if (error.message) {
      detail = error.message;
    }
    return Promise.reject(new Error(detail));
  }
);
