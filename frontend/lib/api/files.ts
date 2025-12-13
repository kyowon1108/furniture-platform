/**
 * Files API endpoints for 3D file management.
 */

import { apiClient } from './client';

export interface PlyUploadResponse {
  message: string;
  file_path: string;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
}

export interface PlyInfoResponse {
  has_ply: boolean;
  file_path?: string;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
}

export const filesAPI = {
  uploadPly: async (projectId: number, file: File): Promise<PlyUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<PlyUploadResponse>(`/files/upload-ply/${projectId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getPlyInfo: async (projectId: number): Promise<PlyInfoResponse> => {
    const response = await apiClient.get<PlyInfoResponse>(`/files/ply-info/${projectId}`);
    return response.data;
  },

  deletePly: async (projectId: number): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/files/ply/${projectId}`);
    return response.data;
  },
};
