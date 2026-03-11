/**
 * Lighting state management with Zustand.
 * Handles time of day and lighting settings.
 */

import { create } from 'zustand';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

interface LightingState {
  timeOfDay: TimeOfDay;
  setTimeOfDay: (time: TimeOfDay) => void;
}

export const useLightingStore = create<LightingState>((set) => ({
  timeOfDay: 'afternoon',

  setTimeOfDay: (time) => set({ timeOfDay: time }),
}));
