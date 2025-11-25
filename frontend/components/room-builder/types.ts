export type RoomTemplate = 'small_studio' | 'rectangular' | 'lshaped' | 'custom';

export interface RoomDimensions {
  width: number;
  depth: number;
  height: number;
}

export interface RoomTemplateConfig {
  name: string;
  displayName: string;
  width: number;
  depth: number;
  wallHeight: number;
  tileSize: number;
  floorColor: string;
  wallColor: string;
}

export interface Tile {
  key: string;
  position: [number, number, number];
  rotation: [number, number, number];
  type: 'floor' | 'wall';
  wallSurface?: string;
}

export interface TileTexture {
  tileKey: string;
  textureUrl: string;
}

export interface UploadedImage {
  id: string;
  url: string;
  name: string;
  file?: File;
}

export interface RoomBuilderState {
  projectId: number;
  projectName: string;
  currentTemplate: RoomTemplate;
  customDimensions: {
    width: number;
    depth: number;
  };
  selectedTiles: string[];
  tileTextures: Record<string, string>;
  uploadedImages: UploadedImage[];
  isExporting: boolean;
  uploadProgress: number;
}

export const ROOM_TEMPLATES: Record<RoomTemplate, RoomTemplateConfig> = {
  small_studio: {
    name: 'small_studio',
    displayName: '원룸',
    width: 2.5,
    depth: 3,
    wallHeight: 2.5,
    tileSize: 0.5,
    floorColor: '#8B7355',
    wallColor: '#F0F0F0',
  },
  rectangular: {
    name: 'rectangular',
    displayName: '직사각형 방',
    width: 3,
    depth: 4,
    wallHeight: 2.5,
    tileSize: 0.5,
    floorColor: '#8B7355',
    wallColor: '#F0F0F0',
  },
  lshaped: {
    name: 'lshaped',
    displayName: 'L자형 방',
    width: 5,
    depth: 5,
    wallHeight: 2.5,
    tileSize: 0.5,
    floorColor: '#8B7355',
    wallColor: '#F0F0F0',
  },
  custom: {
    name: 'custom',
    displayName: '사용자 정의',
    width: 3,
    depth: 3,
    wallHeight: 2.5,
    tileSize: 0.5,
    floorColor: '#8B7355',
    wallColor: '#F0F0F0',
  },
};