'use client';

import * as THREE from 'three';
import { useMaterialStore } from '@/store/materialStore';
import { getMaterialById } from '@/data/materialCatalog';
import { useEffect, useRef, useMemo, useState } from 'react';

interface RoomProps {
  roomDimensions?: {
    width: number;
    height: number;
    depth: number;
  };
}

const TILE_SIZE = 0.5; // 50cm tiles matching RoomScene

interface Tile {
  key: string;
  type: 'floor' | 'wall';
  position: [number, number, number];
  rotation: [number, number, number];
  wallSurface?: 'back' | 'front' | 'left' | 'right';
}

// Tile mesh component with texture support
const TileMesh: React.FC<{
  tile: Tile;
  isSelected?: boolean;
  materialId?: string;
  onClick?: (e: any) => void;
}> = ({ tile, isSelected = false, materialId, onClick }) => {
  const [texture, setTexture] = useState<THREE.Texture | undefined>(undefined);

  // Load material texture if available
  useEffect(() => {
    const material = materialId ? getMaterialById(materialId) : null;
    if (!material?.texture) {
      setTexture(undefined);
      return;
    }

    const loader = new THREE.TextureLoader();
    loader.load(
      material.texture,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.needsUpdate = true;
        setTexture(tex);
      },
      undefined,
      (error) => {
        console.error(`Failed to load texture for ${materialId}:`, error);
        setTexture(undefined);
      }
    );
  }, [materialId]);

  // Get material properties
  const material = materialId ? getMaterialById(materialId) : null;
  const defaultColor = tile.type === 'floor' ? '#e8e8e8' : '#f0f0f0';
  const color = isSelected ? '#4CAF50' : (material?.color || defaultColor);

  return (
    <mesh
      position={tile.position}
      rotation={tile.rotation}
      onClick={onClick}
      userData={{ tileKey: tile.key, tileType: tile.type }}
      renderOrder={isSelected ? 1 : 0}
      receiveShadow
      castShadow={tile.type === 'wall'}
    >
      <planeGeometry args={[TILE_SIZE, TILE_SIZE]} />
      <meshStandardMaterial
        color={texture ? '#ffffff' : color}
        opacity={isSelected ? 0.8 : 1}
        transparent={isSelected}
        map={texture || undefined}
        side={THREE.DoubleSide}
        roughness={material?.roughness ?? 0.8}
        metalness={material?.metalness ?? 0.1}
        depthWrite={true}
      />
    </mesh>
  );
};

export function Room({ roomDimensions }: RoomProps = {}) {
  // Use provided dimensions or defaults
  const width = roomDimensions?.width || 10;
  const depth = roomDimensions?.depth || 8;
  const height = roomDimensions?.height || 3;

  const appliedMaterials = useMaterialStore(state => state.appliedMaterials);
  const applicationMode = useMaterialStore(state => state.applicationMode);
  const selectedMaterialId = useMaterialStore(state => state.selectedMaterialId);
  const targetSurface = useMaterialStore(state => state.targetSurface);
  const applyMaterialFull = useMaterialStore(state => state.applyMaterialFull);
  const applyMaterialPartial = useMaterialStore(state => state.applyMaterialPartial);

  // Track selected tiles for material application
  const [selectedTiles, setSelectedTiles] = useState<string[]>([]);

  // Get applied materials for each surface
  const floorMaterial = appliedMaterials.find(m => m.surface === 'floor');
  const wallNorthMaterial = appliedMaterials.find(m => m.surface === 'wall-north');
  const wallSouthMaterial = appliedMaterials.find(m => m.surface === 'wall-south');
  const wallEastMaterial = appliedMaterials.find(m => m.surface === 'wall-east');
  const wallWestMaterial = appliedMaterials.find(m => m.surface === 'wall-west');

  // Generate tiles based on room dimensions
  const tiles = useMemo(() => {
    const allTiles: Tile[] = [];
    const xCount = Math.floor(width / TILE_SIZE);
    const zCount = Math.floor(depth / TILE_SIZE);
    const yCount = Math.floor(height / TILE_SIZE);

    // Generate floor tiles
    for (let x = 0; x < xCount; x++) {
      for (let z = 0; z < zCount; z++) {
        allTiles.push({
          key: `floor-${x}-${z}`,
          type: 'floor',
          position: [
            x * TILE_SIZE + TILE_SIZE / 2 - width / 2,
            0.001,
            z * TILE_SIZE + TILE_SIZE / 2 - depth / 2
          ],
          rotation: [-Math.PI / 2, 0, 0],
        });
      }
    }

    // Generate wall tiles
    for (let y = 0; y < yCount; y++) {
      const yPos = y * TILE_SIZE + TILE_SIZE / 2;

      // Back wall (North)
      for (let x = 0; x < xCount; x++) {
        allTiles.push({
          key: `wall-north-${x}-${y}`,
          type: 'wall',
          position: [
            x * TILE_SIZE + TILE_SIZE / 2 - width / 2,
            yPos,
            -depth / 2
          ],
          rotation: [0, 0, 0],
          wallSurface: 'back',
        });
      }

      // Front wall (South)
      for (let x = 0; x < xCount; x++) {
        allTiles.push({
          key: `wall-south-${x}-${y}`,
          type: 'wall',
          position: [
            x * TILE_SIZE + TILE_SIZE / 2 - width / 2,
            yPos,
            depth / 2
          ],
          rotation: [0, Math.PI, 0],
          wallSurface: 'front',
        });
      }

      // Left wall (West)
      for (let z = 0; z < zCount; z++) {
        allTiles.push({
          key: `wall-west-${z}-${y}`,
          type: 'wall',
          position: [
            -width / 2,
            yPos,
            z * TILE_SIZE + TILE_SIZE / 2 - depth / 2
          ],
          rotation: [0, Math.PI / 2, 0],
          wallSurface: 'left',
        });
      }

      // Right wall (East)
      for (let z = 0; z < zCount; z++) {
        allTiles.push({
          key: `wall-east-${z}-${y}`,
          type: 'wall',
          position: [
            width / 2,
            yPos,
            z * TILE_SIZE + TILE_SIZE / 2 - depth / 2
          ],
          rotation: [0, -Math.PI / 2, 0],
          wallSurface: 'right',
        });
      }
    }

    return allTiles;
  }, [width, depth, height]);

  // Handle tile click for material application
  const handleTileClick = (tileKey: string, tileType: 'floor' | 'wall', e: any) => {
    // Stop propagation
    if (e.stopPropagation) {
      e.stopPropagation();
    }

    // Material system disabled check
    if (applicationMode === 'none' || !selectedMaterialId) {
      return;
    }

    // Check surface type compatibility
    if (targetSurface === 'floor' && tileType !== 'floor') {
      return;
    }
    if (targetSurface === 'wall' && tileType !== 'wall') {
      return;
    }

    // Determine the surface based on tile key
    let surface: string = 'floor';
    if (tileKey.includes('wall-north')) surface = 'wall-north';
    else if (tileKey.includes('wall-south')) surface = 'wall-south';
    else if (tileKey.includes('wall-east')) surface = 'wall-east';
    else if (tileKey.includes('wall-west')) surface = 'wall-west';

    if (applicationMode === 'full') {
      applyMaterialFull(surface as any, selectedMaterialId);
    } else if (applicationMode === 'partial') {
      // Toggle tile selection for partial application
      setSelectedTiles(prev => {
        if (prev.includes(tileKey)) {
          return prev.filter(k => k !== tileKey);
        }
        return [...prev, tileKey];
      });

      // Extract tile coordinates from key
      const parts = tileKey.split('-');
      const x = parseInt(parts[parts.length - 2]);
      const z = parseInt(parts[parts.length - 1]);

      if (!isNaN(x) && !isNaN(z)) {
        applyMaterialPartial(surface as any, selectedMaterialId, { x, z });
      }
    }
  };

  // Get material for a specific tile
  const getTileMaterial = (tile: Tile) => {
    if (tile.type === 'floor') {
      // Check if this specific tile has a material applied
      if (floorMaterial?.tiles && floorMaterial.tiles.length > 0) {
        const [, x, z] = tile.key.split('-').map(Number);
        const hasTile = floorMaterial.tiles.some(t => t.x === x && t.z === z);
        if (hasTile) {
          return floorMaterial.materialId;
        }
      } else if (floorMaterial?.materialId && !floorMaterial.tiles) {
        // Full floor material application
        return floorMaterial.materialId;
      }
    } else if (tile.type === 'wall') {
      // Determine which wall surface this tile belongs to
      if (tile.key.includes('wall-north')) {
        return wallNorthMaterial?.materialId;
      } else if (tile.key.includes('wall-south')) {
        return wallSouthMaterial?.materialId;
      } else if (tile.key.includes('wall-east')) {
        return wallEastMaterial?.materialId;
      } else if (tile.key.includes('wall-west')) {
        return wallWestMaterial?.materialId;
      }
    }
    return undefined;
  };

  return (
    <group>
      {/* Render all tiles */}
      {tiles.map((tile) => (
        <TileMesh
          key={tile.key}
          tile={tile}
          isSelected={selectedTiles.includes(tile.key)}
          materialId={getTileMaterial(tile)}
          onClick={(e) => handleTileClick(tile.key, tile.type, e)}
        />
      ))}

      {/* Grid lines for visual reference */}
      <gridHelper
        args={[Math.max(width, depth) * 2, Math.max(width, depth) * 4]}
        position={[0, -0.001, 0]}
        rotation={[0, 0, 0]}
      />
    </group>
  );
}