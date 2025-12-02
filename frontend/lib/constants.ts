/**
 * Centralized constants for the furniture platform
 * This file contains all magic numbers and configuration values
 * to make them easier to maintain and modify
 */

// =============================================================================
// GRID AND TILE SETTINGS
// =============================================================================

/** Size of each tile in meters (used in room builder and free build mode) */
export const TILE_SIZE = 0.5;

/** Default wall height in meters */
export const WALL_HEIGHT = 2.5;

/** Grid snap distance for furniture placement */
export const GRID_SNAP_DISTANCE = 0.1;

// =============================================================================
// COLLISION DETECTION
// =============================================================================

/**
 * Factor to reduce collision box size (0.95 = 5% smaller)
 * This allows furniture to be placed closer together
 */
export const COLLISION_FACTOR = 0.95;

/**
 * Minimum penetration threshold to consider as collision
 * Values below this are ignored to prevent false positives
 */
export const PENETRATION_THRESHOLD = 0.005;

/**
 * Penetration threshold for furniture-to-furniture collision
 */
export const FURNITURE_PENETRATION_THRESHOLD = 0.02;

/** Margin from walls in meters */
export const WALL_MARGIN = 0.05;

/** Maximum boundary for PLY files without dimensions */
export const PLY_MAX_BOUNDARY = 50;

/** Temporary boundary while waiting for GLB dimension detection */
export const TEMP_BOUNDARY = 20;

// =============================================================================
// TRANSFORM AND ROTATION
// =============================================================================

/** Rotation threshold in degrees for detecting significant rotation change */
export const ROTATION_THRESHOLD = 0.1;

/** Cooldown for rotation toast messages in milliseconds */
export const ROTATION_TOAST_COOLDOWN = 2000;

// =============================================================================
// NETWORK AND WEBSOCKET
// =============================================================================

/** Throttle interval for furniture move events (ms) */
export const MOVE_THROTTLE_MS = 200;

/** Presigned URL expiration time in seconds */
export const PRESIGNED_URL_TTL = 3600;

// =============================================================================
// UI AND DISPLAY
// =============================================================================

/** Toast notification duration in milliseconds */
export const TOAST_DURATION = 3000;

/** Maximum items in undo/redo history */
export const MAX_HISTORY_SIZE = 30;

/** Shadow map resolution */
export const SHADOW_MAP_SIZE = 2048;

// =============================================================================
// CAMERA SETTINGS
// =============================================================================

/** Default camera position */
export const DEFAULT_CAMERA_POSITION = { x: 5, y: 5, z: 5 };

/** Default camera target */
export const DEFAULT_CAMERA_TARGET = { x: 0, y: 1, z: 0 };

/** Minimum polar angle for orbit controls */
export const MIN_POLAR_ANGLE = 0;

/** Maximum polar angle for orbit controls */
export const MAX_POLAR_ANGLE = Math.PI / 2.1;

/** Minimum camera distance */
export const MIN_CAMERA_DISTANCE = 2;

/** Maximum camera distance */
export const MAX_CAMERA_DISTANCE = 20;

// =============================================================================
// FURNITURE PLACEMENT
// =============================================================================

/** Default Y position for wall-mounted items */
export const WALL_MOUNT_DEFAULT_Y = 1.5;

/** Default Y position for surface items */
export const SURFACE_MOUNT_DEFAULT_Y = 0.5;

// =============================================================================
// LIGHTING CONFIGURATIONS
// =============================================================================

export const LIGHTING_CONFIG = {
  morning: {
    position: [10, 10, 5] as [number, number, number],
    intensity: 1.2,
    color: '#FFFACD',
    ambient: 0.6,
  },
  afternoon: {
    position: [0, 10, 0] as [number, number, number],
    intensity: 1.5,
    color: '#FFFFFF',
    ambient: 0.7,
  },
  evening: {
    position: [-10, 5, 5] as [number, number, number],
    intensity: 0.8,
    color: '#FFB347',
    ambient: 0.5,
  },
  night: {
    position: [0, 5, 0] as [number, number, number],
    intensity: 0.3,
    color: '#4169E1',
    ambient: 0.3,
  },
} as const;

export type TimeOfDay = keyof typeof LIGHTING_CONFIG;

// =============================================================================
// COLORS
// =============================================================================

/** Background color for 3D scene */
export const SCENE_BACKGROUND_COLOR = '#09090b';

/** Measurement point color */
export const MEASURE_POINT_COLOR = '#ef4444';

/** Grid colors */
export const GRID_COLOR_PRIMARY = '#333333';
export const GRID_COLOR_SECONDARY = '#222222';

// =============================================================================
// API ENDPOINTS (fallback values)
// =============================================================================

export const DEFAULT_API_URL = 'http://localhost:8008/api/v1';
export const DEFAULT_SOCKET_URL = 'http://localhost:8008';
