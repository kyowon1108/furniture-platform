/**
 * API client for backend communication.
 */

import axios from 'axios';
import type { User, Project, ProjectDetail, Layout, ValidationResult, TokenResponse } from '@/types/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8008/api/v1';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: async (email: string, password: string, full_name?: string) => {
    const response = await apiClient.post<User>('/auth/register', {
      email,
      password,
      full_name,
    });
    return response.data;
  },

  login: async (email: string, password: string) => {
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

  getMe: async () => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },
};

export const projectsAPI = {
  list: async () => {
    const response = await apiClient.get<Project[]>('/projects');
    return response.data;
  },

  create: async (data: {
    name: string;
    description?: string;
    room_width: number;
    room_height: number;
    room_depth: number;
  }) => {
    const response = await apiClient.post<Project>('/projects', data);
    return response.data;
  },

  get: async (id: number) => {
    const response = await apiClient.get<ProjectDetail>(`/projects/${id}`);
    return response.data;
  },

  update: async (id: number, data: Partial<Project>) => {
    const response = await apiClient.put<Project>(`/projects/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/projects/${id}`);
  },
};

export const layoutsAPI = {
  getCurrent: async (projectId: number) => {
    const response = await apiClient.get<Layout>(`/projects/${projectId}/layouts/current`);
    return response.data;
  },

  save: async (projectId: number, furniture_state: any) => {
    const response = await apiClient.post<Layout>(`/projects/${projectId}/layouts`, {
      furniture_state,
    });
    return response.data;
  },

  list: async (projectId: number) => {
    const response = await apiClient.get<Layout[]>(`/projects/${projectId}/layouts`);
    return response.data;
  },

  validate: async (furniture_state: any, room_dimensions: any) => {
    const response = await apiClient.post<ValidationResult>('/validate', {
      furniture_state,
      room_dimensions,
    });
    return response.data;
  },
};

export const filesAPI = {
  uploadPly: async (projectId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(`/files/upload-ply/${projectId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getPlyInfo: async (projectId: number) => {
    const response = await apiClient.get(`/files/ply-info/${projectId}`);
    return response.data;
  },

  deletePly: async (projectId: number) => {
    const response = await apiClient.delete(`/files/ply/${projectId}`);
    return response.data;
  },
};

export const catalogAPI = {
  getCatalog: async () => {
    const response = await apiClient.get('/catalog');
    return response.data;
  },

  uploadCatalog: async (items: any[]) => {
    const response = await apiClient.post('/catalog', items);
    return response.data;
  },

  uploadGlb: async (itemId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(`/catalog/glb/${itemId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getGlbUrl: async (itemId: string) => {
    const response = await apiClient.get(`/catalog/glb/${itemId}`);
    return response.data;
  },

  listGlbFiles: async () => {
    const response = await apiClient.get('/catalog/list-glb');
    return response.data;
  },

};

export default apiClient;
