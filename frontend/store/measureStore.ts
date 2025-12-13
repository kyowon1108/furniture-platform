/**
 * Measurement state management with Zustand.
 * Handles distance and area measurement tools.
 */

import { create } from 'zustand';
import type { Vector3 } from '@/types/furniture';

export type MeasureMode = 'none' | 'distance' | 'area';

interface MeasureState {
  measureMode: MeasureMode;
  measurePoints: Vector3[];

  setMeasureMode: (mode: MeasureMode) => void;
  addMeasurePoint: (point: Vector3) => void;
  clearMeasurePoints: () => void;
}

export const useMeasureStore = create<MeasureState>((set) => ({
  measureMode: 'none',
  measurePoints: [],

  setMeasureMode: (mode) => set({ measureMode: mode, measurePoints: [] }),

  addMeasurePoint: (point) =>
    set((state) => ({
      measurePoints: [...state.measurePoints, point],
    })),

  clearMeasurePoints: () => set({ measurePoints: [], measureMode: 'none' }),
}));
