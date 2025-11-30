export type RoomTemplate = 'small_studio' | 'rectangular' | 'square' | 'corridor' | 'custom' | 'free_build';

// 방 생성 모드
export type RoomBuildMode = 'template' | 'free_build';

export interface RoomDimensions {
  width: number;
  depth: number;
  height: number;
}

export interface RoomTemplateConfig {
  name: string;
  displayName: string;
  description: string;
  width: number;
  depth: number;
  wallHeight: number;
  tileSize: number;
  floorColor: string;
  wallColor: string;
  generateFloor?: (width: number, depth: number) => Tile[];
  generateWalls?: (width: number, depth: number) => Tile[];
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

const TILE_SIZE = 0.5;
const WALL_HEIGHT = 2.5;

export const ROOM_TEMPLATES: Record<RoomTemplate, RoomTemplateConfig> = {
  small_studio: {
    name: 'small_studio',
    displayName: '소형 스튜디오',
    description: '작은 원룸 (2.5m x 3m)',
    width: 2.5,
    depth: 3,
    wallHeight: WALL_HEIGHT,
    tileSize: TILE_SIZE,
    floorColor: '#d4a574',
    wallColor: '#F5F5F5',
  },
  rectangular: {
    name: 'rectangular',
    displayName: '일자형 원룸',
    description: '기본 직사각형 구조 (3m x 4m)',
    width: 3,
    depth: 4,
    wallHeight: WALL_HEIGHT,
    tileSize: TILE_SIZE,
    floorColor: '#d4a574',
    wallColor: '#F5F5F5',
  },
  square: {
    name: 'square',
    displayName: '정사각형 원룸',
    description: '정방형 구조 (4m x 4m)',
    width: 4,
    depth: 4,
    wallHeight: WALL_HEIGHT,
    tileSize: TILE_SIZE,
    floorColor: '#d4a574',
    wallColor: '#F5F5F5',
  },
  corridor: {
    name: 'corridor',
    displayName: '복도형 원룸',
    description: '긴 복도 형태 (6m x 2.5m)',
    width: 6,
    depth: 2.5,
    wallHeight: WALL_HEIGHT,
    tileSize: TILE_SIZE,
    floorColor: '#d4a574',
    wallColor: '#F5F5F5',
  },
  custom: {
    name: 'custom',
    displayName: '직접 설정할게요',
    description: '사용자 정의 크기',
    width: 3,
    depth: 3,
    wallHeight: WALL_HEIGHT,
    tileSize: TILE_SIZE,
    floorColor: '#d4a574',
    wallColor: '#F5F5F5',
  },
  free_build: {
    name: 'free_build',
    displayName: '🏗️ 자유 건축',
    description: '타일을 직접 배치하여 자유로운 모양의 방을 만들어보세요',
    width: 10,
    depth: 10,
    wallHeight: WALL_HEIGHT,
    tileSize: TILE_SIZE,
    floorColor: '#d4a574',
    wallColor: '#F5F5F5',
  },
};