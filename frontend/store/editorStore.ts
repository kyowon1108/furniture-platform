/**
 * Editor state management with Zustand.
 */

import { create } from 'zustand';
import type { FurnitureItem, TransformMode, Vector3 } from '@/types/furniture';
import { layoutsAPI } from '@/lib/api';
import { useToastStore } from './toastStore';
import { socketService } from '@/lib/socket';

interface LayoutState {
  furnitures: FurnitureItem[];
}

type MeasureMode = 'none' | 'distance' | 'area';
type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

interface EditorState {
  projectId: number | null;
  furnitures: FurnitureItem[];
  selectedIds: string[];
  transformMode: TransformMode;
  isGridSnap: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;

  // Undo/Redo
  historyStack: LayoutState[];
  historyIndex: number;
  maxHistorySize: number;
  canUndo: boolean;
  canRedo: boolean;

  // Measurement
  measureMode: MeasureMode;
  measurePoints: Vector3[];

  // Lighting
  timeOfDay: TimeOfDay;

  // Clipboard
  clipboard: FurnitureItem[];

  // UI State
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;

  setProjectId: (id: number) => void;
  setFurnitures: (furnitures: FurnitureItem[]) => void;
  addFurniture: (furniture: FurnitureItem) => void;
  updateFurniture: (id: string, updates: Partial<FurnitureItem>) => void;
  deleteFurniture: (id: string) => void;
  deleteSelected: () => void;
  selectFurniture: (id: string, multiSelect: boolean) => void;
  clearSelection: () => void;
  setTransformMode: (mode: TransformMode) => void;
  toggleGridSnap: () => void;
  saveLayout: () => Promise<void>;
  loadLayout: (projectId: number) => Promise<void>;
  exportPNG: () => void;

  // Undo/Redo
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Measurement
  setMeasureMode: (mode: MeasureMode) => void;
  addMeasurePoint: (point: Vector3) => void;
  clearMeasurePoints: () => void;

  // Lighting
  setTimeOfDay: (time: TimeOfDay) => void;

  // Clipboard
  copySelected: () => void;
  paste: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  projectId: null,
  furnitures: [],
  selectedIds: [],
  transformMode: 'translate' as TransformMode,
  isGridSnap: true,
  isSaving: false,
  lastSaved: null,
  hasUnsavedChanges: false,

  // Undo/Redo
  historyStack: [],
  historyIndex: -1,
  maxHistorySize: 30,
  canUndo: false,
  canRedo: false,

  // Measurement
  measureMode: 'none',
  measurePoints: [],

  // Lighting
  timeOfDay: 'afternoon',

  // Clipboard
  clipboard: [],

  // UI State
  isSidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

  setProjectId: (id) => set({ projectId: id }),

  setFurnitures: (furnitures) => {
    set({ furnitures, hasUnsavedChanges: false });
    get().saveToHistory();
  },

  addFurniture: (furniture) => {
    set((state) => {
      // Prevent duplicate furniture (same ID)
      if (state.furnitures.some(f => f.id === furniture.id)) {
        console.warn('⚠️ Duplicate furniture ID detected, skipping:', furniture.id);
        return state; // Don't add duplicate
      }

      return {
        furnitures: [...state.furnitures, furniture],
        hasUnsavedChanges: true,
      };
    });
    get().saveToHistory();
  },

  updateFurniture: (id, updates) => {
    set((state) => ({
      furnitures: state.furnitures.map((f) =>
        f.id === id ? { ...f, ...updates } : f
      ),
      hasUnsavedChanges: true,
    }));
    get().saveToHistory();
  },

  deleteFurniture: (id) => {
    set((state) => ({
      furnitures: state.furnitures.filter((f) => f.id !== id),
      selectedIds: state.selectedIds.filter((sid) => sid !== id),
      hasUnsavedChanges: true,
    }));
    get().saveToHistory();
  },

  deleteSelected: () => {
    const state = get();
    const ids = state.selectedIds;

    if (ids.length === 0) return;

    // Emit socket events for each deleted item
    ids.forEach(id => {
      socketService.emitFurnitureDelete(id);
    });

    set((state) => ({
      furnitures: state.furnitures.filter((f) => !ids.includes(f.id)),
      selectedIds: [],
      hasUnsavedChanges: true,
    }));
    get().saveToHistory();
    useToastStore.getState().addToast(`${ids.length}개의 가구가 삭제되었습니다`, 'info');
  },

  selectFurniture: (id, multiSelect) =>
    set((state) => {
      if (multiSelect) {
        const isSelected = state.selectedIds.includes(id);
        return {
          selectedIds: isSelected
            ? state.selectedIds.filter((sid) => sid !== id)
            : [...state.selectedIds, id],
        };
      } else {
        return { selectedIds: [id] };
      }
    }),

  clearSelection: () => set({ selectedIds: [] }),

  setTransformMode: (mode) => set({ transformMode: mode }),

  toggleGridSnap: () => set((state) => ({ isGridSnap: !state.isGridSnap })),

  // Undo/Redo
  saveToHistory: () => {
    const state = get();
    const currentState: LayoutState = { furnitures: [...state.furnitures] };

    // Remove any redo history
    const newStack = state.historyStack.slice(0, state.historyIndex + 1);
    newStack.push(currentState);

    // Limit history size
    if (newStack.length > state.maxHistorySize) {
      newStack.shift();
    }

    set({
      historyStack: newStack,
      historyIndex: newStack.length - 1,
      canUndo: newStack.length > 1,
      canRedo: false,
    });
  },

  undo: () => {
    const state = get();
    if (state.historyIndex <= 0) return;

    const newIndex = state.historyIndex - 1;
    const previousState = state.historyStack[newIndex];

    set({
      furnitures: [...previousState.furnitures],
      historyIndex: newIndex,
      hasUnsavedChanges: true,
      canUndo: newIndex > 0,
      canRedo: true,
    });

    useToastStore.getState().addToast('↶ 실행 취소', 'info');
  },

  redo: () => {
    const state = get();
    if (state.historyIndex >= state.historyStack.length - 1) return;

    const newIndex = state.historyIndex + 1;
    const nextState = state.historyStack[newIndex];

    set({
      furnitures: [...nextState.furnitures],
      historyIndex: newIndex,
      hasUnsavedChanges: true,
      canUndo: true,
      canRedo: newIndex < state.historyStack.length - 1,
    });

    useToastStore.getState().addToast('↷ 다시 실행', 'info');
  },

  // Measurement
  setMeasureMode: (mode) => set({ measureMode: mode, measurePoints: [] }),

  addMeasurePoint: (point) =>
    set((state) => ({
      measurePoints: [...state.measurePoints, point],
    })),

  clearMeasurePoints: () => set({ measurePoints: [], measureMode: 'none' }),

  // Lighting
  setTimeOfDay: (time) => {
    console.log('📦 editorStore: setTimeOfDay called with', time);
    const currentTime = get().timeOfDay;
    console.log('📦 editorStore: Current timeOfDay:', currentTime, '→ New timeOfDay:', time);
    set({ timeOfDay: time });
    const updatedTime = get().timeOfDay;
    console.log('📦 editorStore: timeOfDay updated to', updatedTime);
  },

  // Clipboard
  copySelected: () => {
    const state = get();
    const selected = state.furnitures.filter((f) =>
      state.selectedIds.includes(f.id)
    );
    set({ clipboard: selected });
    useToastStore.getState().addToast(`📋 ${selected.length}개 복사됨`, 'success');
  },

  paste: () => {
    const state = get();
    if (state.clipboard.length === 0) {
      useToastStore.getState().addToast('복사된 가구가 없습니다', 'warning');
      return;
    }

    state.clipboard.forEach((item) => {
      const newItem: FurnitureItem = {
        ...item,
        id: `${item.type}-${Date.now()}-${Math.random()}`,
        position: {
          x: item.position.x + 0.5,
          y: item.position.y,
          z: item.position.z + 0.5,
        },
      };
      get().addFurniture(newItem);
      socketService.emitFurnitureAdd(newItem);
    });

    useToastStore.getState().addToast(`📋 ${state.clipboard.length}개 붙여넣기 완료`, 'success');
  },

  saveLayout: async () => {
    const state = get();
    if (!state.projectId || state.isSaving) return;

    set({ isSaving: true });

    try {
      const furniture_state = { furnitures: state.furnitures };
      await layoutsAPI.save(state.projectId, furniture_state);

      set({
        lastSaved: new Date(),
        hasUnsavedChanges: false,
        isSaving: false,
      });

      useToastStore.getState().addToast('✓ 레이아웃 저장 완료', 'success');
    } catch (error) {
      console.error('Failed to save layout:', error);
      set({ isSaving: false });
      useToastStore.getState().addToast('저장 실패', 'error');
    }
  },

  loadLayout: async (projectId: number) => {
    try {
      const layout = await layoutsAPI.getCurrent(projectId);
      set({
        projectId,
        furnitures: layout.furniture_state?.furnitures || [],
        hasUnsavedChanges: false,
        lastSaved: new Date(layout.created_at),
        historyStack: [{ furnitures: layout.furniture_state?.furnitures || [] }],
        historyIndex: 0,
        canUndo: false,
        canRedo: false,
      });
    } catch (error) {
      console.error('Failed to load layout:', error);
      useToastStore.getState().addToast('레이아웃 불러오기 실패', 'error');
    }
  },

  exportPNG: () => {
    // Trigger a custom event that the Scene component will listen to
    const event = new CustomEvent('exportPNG');
    window.dispatchEvent(event);
  },
}));
