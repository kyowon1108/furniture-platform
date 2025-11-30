/**
 * Free Build Mode Types
 * 자유 건축 모드를 위한 타입 정의
 */

export type BuildTool = 'select' | 'floor' | 'wall' | 'eraser';

export type WallDirection = 'north' | 'south' | 'east' | 'west';

export interface FreeBuildTile {
  id: string;
  type: 'floor' | 'wall';
  gridX: number;
  gridZ: number;
  gridY?: number;  // 벽의 경우 높이 인덱스 (0부터 시작)
  wallDirection?: WallDirection;
  textureUrl?: string;
  depthMapUrl?: string;
  displacementScale?: number;
}

export interface FreeBuildConfig {
  gridSize: number;      // 그리드 전체 크기 (예: 20 = 20x20)
  tileSize: number;      // 타일 크기 (미터, 기본 0.5)
  wallHeight: number;    // 벽 높이 (미터, 기본 2.5)
  tilesPerWallHeight: number;  // 벽 높이당 타일 수
}

export interface FreeBuildHistoryEntry {
  tiles: FreeBuildTile[];
  timestamp: number;
}

export interface FreeBuildState {
  // 모드 상태
  isFreeBuildMode: boolean;
  currentTool: BuildTool;

  // 타일 데이터
  tiles: FreeBuildTile[];
  selectedTileIds: string[];

  // 설정
  config: FreeBuildConfig;

  // 히스토리 (Undo/Redo)
  history: FreeBuildHistoryEntry[];
  historyIndex: number;

  // UI 상태
  isAutoWallEnabled: boolean;
  showGrid: boolean;
}

// 초기 설정 값
export const DEFAULT_FREE_BUILD_CONFIG: FreeBuildConfig = {
  gridSize: 20,
  tileSize: 0.5,
  wallHeight: 2.5,
  tilesPerWallHeight: 5,  // 2.5m / 0.5m = 5
};

// 벽 방향별 회전값 (라디안)
export const WALL_ROTATIONS: Record<WallDirection, [number, number, number]> = {
  north: [0, 0, 0],           // Z- 방향
  south: [0, Math.PI, 0],     // Z+ 방향
  west: [0, Math.PI / 2, 0],  // X- 방향
  east: [0, -Math.PI / 2, 0], // X+ 방향
};

// 벽 방향별 위치 오프셋 (타일 크기 기준)
export const WALL_POSITION_OFFSETS: Record<WallDirection, { dx: number; dz: number }> = {
  north: { dx: 0, dz: 0 },
  south: { dx: 0, dz: 1 },
  west: { dx: 0, dz: 0 },
  east: { dx: 1, dz: 0 },
};

// 이웃 타일 확인용 오프셋
export const NEIGHBOR_OFFSETS: { dx: number; dz: number; wallDir: WallDirection }[] = [
  { dx: 0, dz: -1, wallDir: 'north' },
  { dx: 0, dz: 1, wallDir: 'south' },
  { dx: -1, dz: 0, wallDir: 'west' },
  { dx: 1, dz: 0, wallDir: 'east' },
];

// 유틸리티 함수들
export const generateTileId = (
  type: 'floor' | 'wall',
  gridX: number,
  gridZ: number,
  gridY?: number,
  wallDirection?: WallDirection
): string => {
  if (type === 'floor') {
    return `floor-${gridX}-${gridZ}`;
  }
  return `wall-${gridX}-${gridZ}-${wallDirection}-${gridY}`;
};

export const parseTileId = (id: string): {
  type: 'floor' | 'wall';
  gridX: number;
  gridZ: number;
  gridY?: number;
  wallDirection?: WallDirection;
} | null => {
  const parts = id.split('-');

  if (parts[0] === 'floor' && parts.length === 3) {
    return {
      type: 'floor',
      gridX: parseInt(parts[1]),
      gridZ: parseInt(parts[2]),
    };
  }

  if (parts[0] === 'wall' && parts.length === 5) {
    return {
      type: 'wall',
      gridX: parseInt(parts[1]),
      gridZ: parseInt(parts[2]),
      wallDirection: parts[3] as WallDirection,
      gridY: parseInt(parts[4]),
    };
  }

  return null;
};

// 타일 위치 계산 (Three.js 좌표계)
export const calculateTilePosition = (
  tile: FreeBuildTile,
  config: FreeBuildConfig
): [number, number, number] => {
  const { tileSize } = config;
  const halfTile = tileSize / 2;

  if (tile.type === 'floor') {
    return [
      tile.gridX * tileSize + halfTile,
      0,
      tile.gridZ * tileSize + halfTile,
    ];
  }

  // 벽 타일
  const offset = WALL_POSITION_OFFSETS[tile.wallDirection || 'north'];
  const y = (tile.gridY || 0) * tileSize + halfTile;

  return [
    tile.gridX * tileSize + offset.dx * tileSize + halfTile,
    y,
    tile.gridZ * tileSize + offset.dz * tileSize + halfTile,
  ];
};

// 저장용 데이터 구조
export interface FreeBuildSaveData {
  mode: 'free_build';
  config: FreeBuildConfig;
  tiles: FreeBuildTile[];
  version: number;
}

export const serializeFreeBuildData = (
  tiles: FreeBuildTile[],
  config: FreeBuildConfig
): FreeBuildSaveData => ({
  mode: 'free_build',
  config,
  tiles,
  version: 1,
});
