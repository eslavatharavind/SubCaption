import axios from 'axios';
import { supabase } from '@/lib/supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
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
    } else if (error.message) {
      detail = error.message;
    }
    return Promise.reject(new Error(detail));
  }
);
