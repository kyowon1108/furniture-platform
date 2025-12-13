/**
 * Authentication API endpoints.
 */

import { apiClient } from './client';
import type { User, TokenResponse } from '@/types/api';

export const authAPI = {
  register: async (email: string, password: string, full_name?: string): Promise<User> => {
    const response = await apiClient.post<User>('/auth/register', {
      email,
      password,
      full_name,
    });
    return response.data;
  },

  login: async (email: string, password: string): Promise<TokenResponse> => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await apiClient.post<TokenResponse>('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },
};
