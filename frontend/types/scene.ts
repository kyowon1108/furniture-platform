/**
 * Type definitions for 3D scene components
 */

import type { Dimensions3D } from './furniture';

/**
 * Room structure for free build mode
 * Contains tile information and bounds for custom room shapes
 */
export interface RoomStructure {
  mode: 'free_build';
  tileSize: number;
  floorTiles: Array<{ gridX: number; gridZ: number }>;
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
  /** GLB geometry center for accurate coordinate transformation */
  glbCenter?: {
    x: number;
    z: number;
  };
}

/**
 * Pre-computed tile data for O(1) collision detection
 */
export interface TileData {
  tileSize: number;
  glbCenterX: number;
  glbCenterZ: number;
  /** Set for O(1) tile lookup using "gridX,gridZ" keys */
  tileSet: Set<string>;
  /** Pre-computed X range for each gridZ row */
  xRangeByGridZ: Map<number, { minGridX: number; maxGridX: number }>;
  /** Pre-computed Z range for each gridX column */
  zRangeByGridX: Map<number, { minGridZ: number; maxGridZ: number }>;
  /** World bounds for quick rejection */
  worldMinX: number;
  worldMaxX: number;
  worldMinZ: number;
  worldMaxZ: number;
  bounds: RoomStructure['bounds'];
}

/**
 * Props for the main Scene component
 */
export interface SceneProps {
  projectId?: number;
  hasPlyFile?: boolean;
  plyFilePath?: string;
  fileType?: 'ply' | 'glb' | null;
  roomDimensions?: Dimensions3D;
  onRoomDimensionsChange?: (dims: Dimensions3D) => void;
  buildMode?: 'template' | 'free_build';
  roomStructure?: RoomStructure;
}

/**
 * AABB (Axis-Aligned Bounding Box) for collision detection
 */
export interface AABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * Valid range for furniture placement
 */
export interface ValidRange {
  min: number;
  max: number;
}

/**
 * Result of position clamping operation
 */
export interface ClampResult {
  x: number;
  z: number;
  wasAdjusted: boolean;
}
