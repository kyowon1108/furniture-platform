/**
 * Base API client configuration with axios.
 * Handles authentication tokens and error responses.
 */

import axios from 'axios';
import { getAuthToken, removeAuthToken } from '@/lib/authToken';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8008/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        // Don't redirect on auth pages
        const isAuthPage = window.location.pathname.startsWith('/auth/');
        if (!isAuthPage) {
          removeAuthToken();
          window.location.href = '/auth/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
