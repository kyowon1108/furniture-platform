/**
 * Catalog API endpoints for furniture catalog management.
 */

import { apiClient } from './client';
import type { FurnitureCatalogItem } from '@/types/catalog';

export interface CatalogResponse {
  items: FurnitureCatalogItem[];
  total: number;
}

export interface GlbUploadResponse {
  message: string;
  glb_url: string;
}

export interface GlbUrlResponse {
  glb_url: string | null;
}

export interface GlbListResponse {
  files: string[];
}

export const catalogAPI = {
  getCatalog: async (): Promise<CatalogResponse> => {
    const response = await apiClient.get<CatalogResponse>('/catalog');
    return response.data;
  },

  uploadCatalog: async (items: FurnitureCatalogItem[]): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/catalog', items);
    return response.data;
  },

  uploadGlb: async (itemId: string, file: File): Promise<GlbUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<GlbUploadResponse>(`/catalog/glb/${itemId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getGlbUrl: async (itemId: string): Promise<GlbUrlResponse> => {
    const response = await apiClient.get<GlbUrlResponse>(`/catalog/glb/${itemId}`);
    return response.data;
  },

  listGlbFiles: async (): Promise<GlbListResponse> => {
    const response = await apiClient.get<GlbListResponse>('/catalog/list-glb');
    return response.data;
  },
};
