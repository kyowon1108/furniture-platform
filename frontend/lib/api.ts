/**
 * API client for backend communication.
 *
 * This file re-exports from the modular api/ directory for backward compatibility.
 * New code should import directly from '@/lib/api' which now points to the modular structure.
 */

export {
  apiClient,
  authAPI,
  projectsAPI,
  layoutsAPI,
  filesAPI,
  catalogAPI,
} from './api/index';

export type {
  CreateProjectData,
  PlyUploadResponse,
  PlyInfoResponse,
  CatalogResponse,
  GlbUploadResponse,
  GlbUrlResponse,
  GlbListResponse,
} from './api/index';

// Default export for backward compatibility
export { apiClient as default } from './api/index';
