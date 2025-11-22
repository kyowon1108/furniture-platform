export interface MaterialTexture {
  id: string;
  name: string;
  category: 'floor' | 'wall';
  textureUrl: string;
  normalMapUrl?: string;
  roughness?: number;
  metalness?: number;
  repeat?: [number, number];
  color?: string;
}

export interface AppliedMaterial {
  surface: 'floor' | 'wall-north' | 'wall-south' | 'wall-east' | 'wall-west';
  materialId: string;
  // For partial application
  tiles?: Array<{ x: number; z: number }>;
}

export type MaterialApplicationMode = 'none' | 'full' | 'partial';

export interface MaterialState {
  selectedMaterialId: string | null;
  applicationMode: MaterialApplicationMode;
  targetSurface: 'floor' | 'wall' | null;
  appliedMaterials: AppliedMaterial[];
  
  setSelectedMaterial: (id: string | null) => void;
  setApplicationMode: (mode: MaterialApplicationMode) => void;
  setTargetSurface: (surface: 'floor' | 'wall' | null) => void;
  applyMaterialFull: (surface: AppliedMaterial['surface'], materialId: string) => void;
  applyMaterialPartial: (surface: AppliedMaterial['surface'], materialId: string, tile: { x: number; z: number }) => void;
  clearMaterial: (surface: AppliedMaterial['surface']) => void;
  getAppliedMaterial: (surface: AppliedMaterial['surface']) => AppliedMaterial | undefined;
}
