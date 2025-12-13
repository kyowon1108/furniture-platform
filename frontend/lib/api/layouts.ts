/**
 * Layouts API endpoints.
 */

import { apiClient } from './client';
import type { Layout, ValidationResult, FurnitureState, RoomDimensions } from '@/types/api';

export const layoutsAPI = {
  getCurrent: async (projectId: number): Promise<Layout> => {
    const response = await apiClient.get<Layout>(`/projects/${projectId}/layouts/current`);
    return response.data;
  },

  save: async (projectId: number, furniture_state: FurnitureState): Promise<Layout> => {
    const response = await apiClient.post<Layout>(`/projects/${projectId}/layouts`, {
      furniture_state,
    });
    return response.data;
  },

  list: async (projectId: number): Promise<Layout[]> => {
    const response = await apiClient.get<Layout[]>(`/projects/${projectId}/layouts`);
    return response.data;
  },

  validate: async (furniture_state: FurnitureState, room_dimensions: RoomDimensions): Promise<ValidationResult> => {
    const response = await apiClient.post<ValidationResult>('/validate', {
      furniture_state,
      room_dimensions,
    });
    return response.data;
  },
};
