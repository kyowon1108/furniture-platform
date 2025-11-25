'use client';

import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { RoomTemplate, Tile, ROOM_TEMPLATES } from './types';

interface RoomSceneProps {
  currentTemplate: RoomTemplate;
  customDimensions: { width: number; depth: number };
  selectedTiles: string[];
  tileTextures: Record<string, string>;
  onTileClick: (tileKey: string) => void;
}

const TILE_SIZE = 0.5;

const RoomScene = forwardRef<any, RoomSceneProps>(({
  currentTemplate,
  customDimensions,
  selectedTiles,
  tileTextures,
  onTileClick,
}, ref) => {
  const { scene } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  // Get room dimensions
  const dimensions = useMemo(() => {
    if (currentTemplate === 'custom') {
      return customDimensions;
    }
    const template = ROOM_TEMPLATES[currentTemplate];
    return { width: template.width, depth: template.depth };
  }, [currentTemplate, customDimensions]);

  // Generate tiles based on template
  const tiles = useMemo(() => {
    const template = ROOM_TEMPLATES[currentTemplate];
    const { width, depth } = dimensions;
    const wallHeight = template.wallHeight;

    const allTiles: Tile[] = [];

    // Generate floor tiles
    const xCount = Math.floor(width / TILE_SIZE);
    const zCount = Math.floor(depth / TILE_SIZE);

    // Floor tiles
    for (let x = 0; x < xCount; x++) {
      for (let z = 0; z < zCount; z++) {
        allTiles.push({
          key: `floor-${x}-${z}`,
          type: 'floor',
          position: [
            x * TILE_SIZE + TILE_SIZE / 2,
            0,
            z * TILE_SIZE + TILE_SIZE / 2
          ],
          rotation: [0, 0, 0],
        });
      }
    }

    // Generate wall tiles
    const yCount = Math.floor(wallHeight / TILE_SIZE);

    for (let y = 0; y < yCount; y++) {
      const yPos = y * TILE_SIZE + TILE_SIZE / 2;

      // Back wall
      for (let x = 0; x < xCount; x++) {
        allTiles.push({
          key: `wall-back-${x}-${y}`,
          type: 'wall',
          position: [
            x * TILE_SIZE + TILE_SIZE / 2,
            yPos,
            0
          ],
          rotation: [-Math.PI / 2, 0, 0],
          wallSurface: 'back',
        });
      }

      // Front wall
      for (let x = 0; x < xCount; x++) {
        allTiles.push({
          key: `wall-front-${x}-${y}`,
          type: 'wall',
          position: [
            x * TILE_SIZE + TILE_SIZE / 2,
            yPos,
            depth
          ],
          rotation: [Math.PI / 2, 0, 0],
          wallSurface: 'front',
        });
      }

      // Left wall
      for (let z = 0; z < zCount; z++) {
        allTiles.push({
          key: `wall-left-${z}-${y}`,
          type: 'wall',
          position: [
            0,
            yPos,
            z * TILE_SIZE + TILE_SIZE / 2
          ],
          rotation: [0, 0, Math.PI / 2],
          wallSurface: 'left',
        });
      }

      // Right wall
      for (let z = 0; z < zCount; z++) {
        allTiles.push({
          key: `wall-right-${z}-${y}`,
          type: 'wall',
          position: [
            width,
            yPos,
            z * TILE_SIZE + TILE_SIZE / 2
          ],
          rotation: [0, 0, -Math.PI / 2],
          wallSurface: 'right',
        });
      }
    }

    // Handle L-shaped room
    if (currentTemplate === 'lshaped') {
      // Remove some tiles for L-shape
      const splitX = Math.floor(xCount * 0.6);
      const splitZ = Math.floor(zCount * 0.6);

      return allTiles.filter(tile => {
        if (tile.type === 'floor') {
          const x = parseInt(tile.key.split('-')[1]);
          const z = parseInt(tile.key.split('-')[2]);
          // Keep tiles in L-shape
          return (z < splitZ) || (z >= splitZ && x < splitX);
        }
        // Keep all wall tiles for now (could be optimized)
        return true;
      });
    }

    return allTiles;
  }, [currentTemplate, dimensions]);

  // Expose getScene method to parent
  useImperativeHandle(ref, () => ({
    getScene: () => groupRef.current,
  }));

  return (
    <group ref={groupRef}>
      {tiles.map((tile) => {
        const isSelected = selectedTiles.includes(tile.key);
        const textureUrl = tileTextures[tile.key];

        return (
          <mesh
            key={tile.key}
            position={tile.position}
            rotation={tile.rotation}
            onClick={() => onTileClick(tile.key)}
            userData={{ tileKey: tile.key, tileType: tile.type }}
          >
            <planeGeometry args={[TILE_SIZE, TILE_SIZE]} />
            <meshStandardMaterial
              color={
                isSelected ? '#4CAF50' :
                tile.type === 'floor' ? ROOM_TEMPLATES[currentTemplate].floorColor :
                ROOM_TEMPLATES[currentTemplate].wallColor
              }
              opacity={isSelected ? 0.8 : 1}
              transparent={isSelected}
              map={textureUrl ? new THREE.TextureLoader().load(textureUrl) : undefined}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
});

RoomScene.displayName = 'RoomScene';

export default RoomScene;