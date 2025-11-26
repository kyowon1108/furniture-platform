/**
 * Type definitions for furniture and 3D scene objects.
 */

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export type FurnitureType = 'bed' | 'desk' | 'chair' | 'wardrobe' | 'table' | 'sofa' | 'shelf' | 'wall-lamp' | 'wall-tv' | 'wall-art' | 'desk-lamp' | 'decoration' | 'monitor' | 'printer' | 'filing-cabinet' | 'whiteboard' | 'clock' | 'mirror' | 'shelving-unit';

export interface FurnitureItem {
  id: string;
  type: FurnitureType;
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  color?: string;
  isColliding?: boolean;
  mountType?: 'floor' | 'wall' | 'surface'; // floor: 바닥, wall: 벽걸이, surface: 가구 위
  mountedOn?: string; // ID of furniture this is mounted on (for surface type)
  wallSide?: 'north' | 'south' | 'east' | 'west'; // Which wall it's mounted on
  glbUrl?: string; // S3 GLB file URL for 3D model
  price?: number; // Price of the furniture item
}

export interface LayoutState {
  furnitures: FurnitureItem[];
  roomDimensions: {
    width: number;
    height: number;
    depth: number;
  };
}

export enum TransformMode {
  TRANSLATE = 'translate',
  ROTATE = 'rotate',
  SCALE = 'scale'
}
