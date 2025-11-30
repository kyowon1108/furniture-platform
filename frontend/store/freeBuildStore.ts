/**
 * Free Build Mode Store
 * 자유 건축 모드 상태 관리 (Zustand)
 */

import { create } from 'zustand';
import {
  FreeBuildState,
  FreeBuildTile,
  FreeBuildConfig,
  FreeBuildHistoryEntry,
  BuildTool,
  WallDirection,
  DEFAULT_FREE_BUILD_CONFIG,
  generateTileId,
  NEIGHBOR_OFFSETS,
} from '@/types/freeBuild';
import { useToastStore } from './toastStore';

interface FreeBuildStore extends FreeBuildState {
  // 모드 토글
  setFreeBuildMode: (enabled: boolean) => void;

  // 도구 선택
  setCurrentTool: (tool: BuildTool) => void;

  // 설정 변경
  setConfig: (config: Partial<FreeBuildConfig>) => void;
  setAutoWallEnabled: (enabled: boolean) => void;
  setShowGrid: (show: boolean) => void;

  // 타일 관리
  addFloorTile: (gridX: number, gridZ: number) => void;
  addWallTile: (gridX: number, gridZ: number, direction: WallDirection, gridY: number) => void;
  removeTile: (id: string) => void;
  removeTilesAt: (gridX: number, gridZ: number) => void;
  updateTile: (id: string, updates: Partial<FreeBuildTile>) => void;
  clearAllTiles: () => void;

  // 선택
  selectTile: (id: string, multiSelect: boolean) => void;
  selectTilesInRange: (startId: string, endId: string) => void;
  clearSelection: () => void;
  selectAllFloorTiles: () => void;
  selectAllWallTiles: () => void;

  // 텍스처/Depth Map
  applyTextureToSelected: (textureUrl: string) => void;
  applyDepthMapToSelected: (depthMapUrl: string, scale: number) => void;
  removeTextureFromSelected: () => void;

  // 자동 벽 생성
  generateWallsFromFloor: () => void;
  removeAllWalls: () => void;

  // Undo/Redo
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // 저장/불러오기
  exportTileData: () => FreeBuildTile[];
  importTileData: (tiles: FreeBuildTile[]) => void;
  reset: () => void;
}

const MAX_HISTORY_SIZE = 50;

const initialState: FreeBuildState = {
  isFreeBuildMode: false,
  currentTool: 'select',
  tiles: [],
  selectedTileIds: [],
  config: DEFAULT_FREE_BUILD_CONFIG,
  history: [],
  historyIndex: -1,
  isAutoWallEnabled: true,
  showGrid: true,
};

export const useFreeBuildStore = create<FreeBuildStore>((set, get) => ({
  ...initialState,

  // 모드 토글
  setFreeBuildMode: (enabled) => {
    set({ isFreeBuildMode: enabled });
    if (enabled) {
      useToastStore.getState().addToast('자유 건축 모드가 활성화되었습니다', 'info');
    }
  },

  // 도구 선택
  setCurrentTool: (tool) => {
    set({ currentTool: tool });
  },

  // 설정 변경
  setConfig: (configUpdates) => {
    set((state) => ({
      config: { ...state.config, ...configUpdates },
    }));
  },

  setAutoWallEnabled: (enabled) => set({ isAutoWallEnabled: enabled }),
  setShowGrid: (show) => set({ showGrid: show }),

  // 바닥 타일 추가
  addFloorTile: (gridX, gridZ) => {
    const state = get();
    const id = generateTileId('floor', gridX, gridZ);

    // 이미 존재하는지 확인
    if (state.tiles.some((t) => t.id === id)) {
      return;
    }

    // 그리드 범위 확인
    if (gridX < 0 || gridX >= state.config.gridSize ||
        gridZ < 0 || gridZ >= state.config.gridSize) {
      return;
    }

    const newTile: FreeBuildTile = {
      id,
      type: 'floor',
      gridX,
      gridZ,
    };

    set((state) => ({
      tiles: [...state.tiles, newTile],
    }));

    get().saveToHistory();

    // 자동 벽 생성이 활성화된 경우
    if (state.isAutoWallEnabled) {
      get().generateWallsFromFloor();
    }
  },

  // 벽 타일 추가
  addWallTile: (gridX, gridZ, direction, gridY) => {
    const state = get();
    const id = generateTileId('wall', gridX, gridZ, gridY, direction);

    // 이미 존재하는지 확인
    if (state.tiles.some((t) => t.id === id)) {
      return;
    }

    const newTile: FreeBuildTile = {
      id,
      type: 'wall',
      gridX,
      gridZ,
      gridY,
      wallDirection: direction,
    };

    set((state) => ({
      tiles: [...state.tiles, newTile],
    }));

    get().saveToHistory();
  },

  // 타일 제거
  removeTile: (id) => {
    set((state) => ({
      tiles: state.tiles.filter((t) => t.id !== id),
      selectedTileIds: state.selectedTileIds.filter((sid) => sid !== id),
    }));
    get().saveToHistory();
  },

  // 특정 위치의 모든 타일 제거
  removeTilesAt: (gridX, gridZ) => {
    set((state) => ({
      tiles: state.tiles.filter((t) =>
        !(t.gridX === gridX && t.gridZ === gridZ)
      ),
      selectedTileIds: state.selectedTileIds.filter((sid) => {
        const tile = state.tiles.find((t) => t.id === sid);
        return tile && !(tile.gridX === gridX && tile.gridZ === gridZ);
      }),
    }));

    const state = get();
    if (state.isAutoWallEnabled) {
      get().generateWallsFromFloor();
    }

    get().saveToHistory();
  },

  // 타일 업데이트
  updateTile: (id, updates) => {
    set((state) => ({
      tiles: state.tiles.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    }));
  },

  // 모든 타일 삭제
  clearAllTiles: () => {
    set({
      tiles: [],
      selectedTileIds: [],
    });
    get().saveToHistory();
    useToastStore.getState().addToast('모든 타일이 삭제되었습니다', 'info');
  },

  // 타일 선택
  selectTile: (id, multiSelect) => {
    set((state) => {
      if (multiSelect) {
        const isSelected = state.selectedTileIds.includes(id);
        return {
          selectedTileIds: isSelected
            ? state.selectedTileIds.filter((sid) => sid !== id)
            : [...state.selectedTileIds, id],
        };
      } else {
        return { selectedTileIds: [id] };
      }
    });
  },

  // 범위 선택
  selectTilesInRange: (startId, endId) => {
    const state = get();
    const startTile = state.tiles.find((t) => t.id === startId);
    const endTile = state.tiles.find((t) => t.id === endId);

    if (!startTile || !endTile || startTile.type !== endTile.type) {
      return;
    }

    const minX = Math.min(startTile.gridX, endTile.gridX);
    const maxX = Math.max(startTile.gridX, endTile.gridX);
    const minZ = Math.min(startTile.gridZ, endTile.gridZ);
    const maxZ = Math.max(startTile.gridZ, endTile.gridZ);

    const selectedIds = state.tiles
      .filter((t) =>
        t.type === startTile.type &&
        t.gridX >= minX && t.gridX <= maxX &&
        t.gridZ >= minZ && t.gridZ <= maxZ
      )
      .map((t) => t.id);

    set((state) => ({
      selectedTileIds: Array.from(new Set([...state.selectedTileIds, ...selectedIds])),
    }));
  },

  // 선택 해제
  clearSelection: () => {
    set({ selectedTileIds: [] });
  },

  // 모든 바닥 타일 선택
  selectAllFloorTiles: () => {
    set((state) => ({
      selectedTileIds: state.tiles
        .filter((t) => t.type === 'floor')
        .map((t) => t.id),
    }));
  },

  // 모든 벽 타일 선택
  selectAllWallTiles: () => {
    set((state) => ({
      selectedTileIds: state.tiles
        .filter((t) => t.type === 'wall')
        .map((t) => t.id),
    }));
  },

  // 선택된 타일에 텍스처 적용
  applyTextureToSelected: (textureUrl) => {
    const state = get();
    if (state.selectedTileIds.length === 0) {
      useToastStore.getState().addToast('타일을 먼저 선택해주세요', 'warning');
      return;
    }

    set((state) => ({
      tiles: state.tiles.map((t) =>
        state.selectedTileIds.includes(t.id)
          ? { ...t, textureUrl }
          : t
      ),
    }));

    useToastStore.getState().addToast(
      `${state.selectedTileIds.length}개 타일에 텍스처 적용됨`,
      'success'
    );
  },

  // 선택된 타일에 Depth Map 적용
  applyDepthMapToSelected: (depthMapUrl, scale) => {
    const state = get();
    if (state.selectedTileIds.length === 0) {
      useToastStore.getState().addToast('타일을 먼저 선택해주세요', 'warning');
      return;
    }

    set((state) => ({
      tiles: state.tiles.map((t) =>
        state.selectedTileIds.includes(t.id)
          ? { ...t, depthMapUrl, displacementScale: scale }
          : t
      ),
    }));

    useToastStore.getState().addToast(
      `${state.selectedTileIds.length}개 타일에 Depth Map 적용됨`,
      'success'
    );
  },

  // 선택된 타일에서 텍스처 제거
  removeTextureFromSelected: () => {
    const state = get();
    if (state.selectedTileIds.length === 0) return;

    set((state) => ({
      tiles: state.tiles.map((t) =>
        state.selectedTileIds.includes(t.id)
          ? { ...t, textureUrl: undefined, depthMapUrl: undefined, displacementScale: undefined }
          : t
      ),
    }));

    useToastStore.getState().addToast(
      `${state.selectedTileIds.length}개 타일에서 텍스처 제거됨`,
      'info'
    );
  },

  // 바닥 타일 경계에 벽 자동 생성
  generateWallsFromFloor: () => {
    const state = get();
    const floorTiles = state.tiles.filter((t) => t.type === 'floor');
    const floorSet = new Set(floorTiles.map((t) => `${t.gridX},${t.gridZ}`));

    // 기존 벽 제거
    const nonWallTiles = state.tiles.filter((t) => t.type !== 'wall');
    const newWalls: FreeBuildTile[] = [];

    floorTiles.forEach((floor) => {
      const { gridX, gridZ } = floor;

      NEIGHBOR_OFFSETS.forEach(({ dx, dz, wallDir }) => {
        const neighborKey = `${gridX + dx},${gridZ + dz}`;

        // 이웃에 바닥 타일이 없으면 벽 생성
        if (!floorSet.has(neighborKey)) {
          for (let y = 0; y < state.config.tilesPerWallHeight; y++) {
            const wallId = generateTileId('wall', gridX, gridZ, y, wallDir);

            // 중복 방지
            if (!newWalls.some((w) => w.id === wallId)) {
              newWalls.push({
                id: wallId,
                type: 'wall',
                gridX,
                gridZ,
                gridY: y,
                wallDirection: wallDir,
              });
            }
          }
        }
      });
    });

    set({
      tiles: [...nonWallTiles, ...newWalls],
    });
  },

  // 모든 벽 제거
  removeAllWalls: () => {
    set((state) => ({
      tiles: state.tiles.filter((t) => t.type !== 'wall'),
      selectedTileIds: state.selectedTileIds.filter((id) =>
        state.tiles.find((t) => t.id === id)?.type !== 'wall'
      ),
    }));
    get().saveToHistory();
    useToastStore.getState().addToast('모든 벽이 삭제되었습니다', 'info');
  },

  // 히스토리 저장
  saveToHistory: () => {
    const state = get();
    const entry: FreeBuildHistoryEntry = {
      tiles: JSON.parse(JSON.stringify(state.tiles)),
      timestamp: Date.now(),
    };

    // 현재 인덱스 이후의 히스토리 제거 (새로운 분기)
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(entry);

    // 최대 크기 제한
    if (newHistory.length > MAX_HISTORY_SIZE) {
      newHistory.shift();
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  // Undo
  undo: () => {
    const state = get();
    if (state.historyIndex <= 0) return;

    const newIndex = state.historyIndex - 1;
    const previousState = state.history[newIndex];

    set({
      tiles: JSON.parse(JSON.stringify(previousState.tiles)),
      historyIndex: newIndex,
      selectedTileIds: [],
    });

    useToastStore.getState().addToast('↶ 실행 취소', 'info');
  },

  // Redo
  redo: () => {
    const state = get();
    if (state.historyIndex >= state.history.length - 1) return;

    const newIndex = state.historyIndex + 1;
    const nextState = state.history[newIndex];

    set({
      tiles: JSON.parse(JSON.stringify(nextState.tiles)),
      historyIndex: newIndex,
      selectedTileIds: [],
    });

    useToastStore.getState().addToast('↷ 다시 실행', 'info');
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  // 타일 데이터 내보내기
  exportTileData: () => {
    return JSON.parse(JSON.stringify(get().tiles));
  },

  // 타일 데이터 불러오기
  importTileData: (tiles) => {
    set({
      tiles: JSON.parse(JSON.stringify(tiles)),
      selectedTileIds: [],
    });
    get().saveToHistory();
    useToastStore.getState().addToast('타일 데이터를 불러왔습니다', 'success');
  },

  // 상태 초기화
  reset: () => {
    set(initialState);
  },
}));
