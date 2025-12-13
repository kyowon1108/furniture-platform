/**
 * Central export for all API modules.
 *
 * Usage:
 *   import { authAPI, projectsAPI } from '@/lib/api';
 *   // or
 *   import { apiClient } from '@/lib/api';
 */

export { apiClient } from './client';
export { authAPI } from './auth';
export { projectsAPI, type CreateProjectData } from './projects';
export { layoutsAPI } from './layouts';
export { filesAPI, type PlyUploadResponse, type PlyInfoResponse } from './files';
export { catalogAPI, type CatalogResponse, type GlbUploadResponse, type GlbUrlResponse, type GlbListResponse } from './catalog';

// Default export for backward compatibility
export { apiClient as default } from './client';
