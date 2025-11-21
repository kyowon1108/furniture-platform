/**
 * Type definitions for API requests and responses.
 */

import { FurnitureItem } from './furniture';

export interface User {
  id: number;
  email: string;
  full_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface Project {
  id: number;
  owner_id: number;
  name: string;
  description?: string;
  room_width: number;
  room_height: number;
  room_depth: number;
  has_ply_file?: boolean;
  ply_file_path?: string;
  ply_file_size?: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectDetail extends Project {
  current_layout?: {
    furnitures: FurnitureItem[];
  };
}

export interface Layout {
  id: number;
  project_id: number;
  version: number;
  furniture_state: {
    furnitures: FurnitureItem[];
  };
  is_current: boolean;
  created_at: string;
}

export interface ValidationResult {
  valid: boolean;
  collisions: Array<{
    id1: string;
    id2: string;
  }>;
  out_of_bounds: string[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}
