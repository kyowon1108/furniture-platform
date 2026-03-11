/**
 * Projects API endpoints.
 */

import { apiClient } from './client';
import type { Project, ProjectDetail } from '@/types/api';

export interface CreateProjectData {
  name: string;
  description?: string;
  room_width: number;
  room_height: number;
  room_depth: number;
}

export const projectsAPI = {
  list: async (): Promise<Project[]> => {
    const response = await apiClient.get<Project[]>('/projects');
    return response.data;
  },

  create: async (data: CreateProjectData): Promise<Project> => {
    const response = await apiClient.post<Project>('/projects', data);
    return response.data;
  },

  get: async (id: number): Promise<ProjectDetail> => {
    const response = await apiClient.get<ProjectDetail>(`/projects/${id}`);
    return response.data;
  },

  update: async (id: number, data: Partial<Project>): Promise<Project> => {
    const response = await apiClient.put<Project>(`/projects/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/projects/${id}`);
  },

  toggleShare: async (id: number, share: boolean): Promise<Project> => {
    const response = await apiClient.post<Project>(`/projects/${id}/share?share=${share}`);
    return response.data;
  },
};
