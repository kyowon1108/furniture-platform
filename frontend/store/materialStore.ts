import { create } from 'zustand';
import type { MaterialState, AppliedMaterial } from '@/types/material';
import { getMaterialById } from '@/data/materialCatalog';

export const useMaterialStore = create<MaterialState>((set, get) => ({
  selectedMaterialId: null,
  applicationMode: 'none',
  targetSurface: null,
  appliedMaterials: [],

  setSelectedMaterial: (id) => {
    set({ selectedMaterialId: id });
    
    // Auto-set target surface based on material category
    if (id) {
      const material = getMaterialById(id);
      if (material) {
        set({ targetSurface: material.category });
      }
    }
  },
  
  setApplicationMode: (mode) => set({ applicationMode: mode }),
  
  setTargetSurface: (surface) => set({ targetSurface: surface }),

  applyMaterialFull: (surface, materialId) => {
    const { appliedMaterials } = get();
    const existing = appliedMaterials.find(m => m.surface === surface);
    
    if (existing) {
      // Update existing
      set({
        appliedMaterials: appliedMaterials.map(m =>
          m.surface === surface ? { surface, materialId, tiles: undefined } : m
        )
      });
    } else {
      // Add new
      set({
        appliedMaterials: [...appliedMaterials, { surface, materialId, tiles: undefined }]
      });
    }
  },

  applyMaterialPartial: (surface, materialId, tile) => {
    const { appliedMaterials } = get();
    const existing = appliedMaterials.find(m => m.surface === surface);
    
    if (existing && existing.materialId === materialId) {
      // Add tile to existing material
      const tiles = existing.tiles || [];
      const tileExists = tiles.some(t => t.x === tile.x && t.z === tile.z);
      
      if (!tileExists) {
        set({
          appliedMaterials: appliedMaterials.map(m =>
            m.surface === surface
              ? { ...m, tiles: [...tiles, tile] }
              : m
          )
        });
      }
    } else {
      // Create new partial application
      set({
        appliedMaterials: [
          ...appliedMaterials.filter(m => m.surface !== surface),
          { surface, materialId, tiles: [tile] }
        ]
      });
    }
  },

  clearMaterial: (surface) => {
    set({
      appliedMaterials: get().appliedMaterials.filter(m => m.surface !== surface)
    });
  },

  getAppliedMaterial: (surface) => {
    return get().appliedMaterials.find(m => m.surface === surface);
  },
}));
