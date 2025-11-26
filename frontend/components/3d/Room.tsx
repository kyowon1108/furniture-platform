'use client';

import React from 'react';
import * as THREE from 'three';

interface RoomProps {
  roomDimensions?: {
    width: number;
    height: number;
    depth: number;
  };
}

const TILE_SIZE = 0.5;

interface Tile {
  key: string;
  type: 'floor' | 'wall';
  position: [number, number, number];
  rotation: [number, number, number];
  wallSurface?: 'back' | 'front' | 'left' | 'right';
}

// Individual tile component - exactly like RoomScene
const TileMesh: React.FC<{
  tile: Tile;
}> = ({ tile }) => {
  // Use more distinct colors for better visibility
  const defaultColor = tile.type === 'floor' ? '#e8e8e8' : '#f0f0f0';

  return (
    <mesh
      position={tile.position}
      rotation={tile.rotation}
      receiveShadow={tile.type === 'wall'} // Only walls receive shadows, not floor tiles
      castShadow={tile.type === 'wall'}
      renderOrder={tile.type === 'floor' ? 0 : 1}
    >
      <planeGeometry args={[TILE_SIZE, TILE_SIZE]} />
      <meshStandardMaterial
        color={defaultColor}
        side={THREE.FrontSide}
        roughness={0.9}
        metalness={0.0}
        transparent={false}
        depthWrite={true}
        depthTest={true}
      />
    </mesh>
  );
};

export function Room({ roomDimensions }: RoomProps) {
  const width = roomDimensions?.width || 10;
  const depth = roomDimensions?.depth || 8;
  const height = roomDimensions?.height || 3;

  // Generate tiles - exactly like RoomScene
  const tiles: Tile[] = [];
  const xCount = Math.floor(width / TILE_SIZE);
  const zCount = Math.floor(depth / TILE_SIZE);
  const yCount = Math.floor(height / TILE_SIZE);

  // Generate floor tiles - same coordinate system as RoomScene
  for (let x = 0; x < xCount; x++) {
    for (let z = 0; z < zCount; z++) {
      tiles.push({
        key: `floor-${x}-${z}`,
        type: 'floor',
        position: [x * TILE_SIZE + TILE_SIZE / 2, 0, z * TILE_SIZE + TILE_SIZE / 2],
        rotation: [-Math.PI / 2, 0, 0],
      });
    }
  }

  // Generate wall tiles
  for (let y = 0; y < yCount; y++) {
    const yPos = y * TILE_SIZE + TILE_SIZE / 2;

    // Back wall
    for (let x = 0; x < xCount; x++) {
      tiles.push({
        key: `wall-back-${x}-${y}`,
        type: 'wall',
        position: [x * TILE_SIZE + TILE_SIZE / 2, yPos, 0],
        rotation: [0, 0, 0],
        wallSurface: 'back',
      });
    }

    // Front wall
    for (let x = 0; x < xCount; x++) {
      tiles.push({
        key: `wall-front-${x}-${y}`,
        type: 'wall',
        position: [x * TILE_SIZE + TILE_SIZE / 2, yPos, depth],
        rotation: [0, Math.PI, 0],
        wallSurface: 'front',
      });
    }

    // Left wall
    for (let z = 0; z < zCount; z++) {
      tiles.push({
        key: `wall-left-${z}-${y}`,
        type: 'wall',
        position: [0, yPos, z * TILE_SIZE + TILE_SIZE / 2],
        rotation: [0, Math.PI / 2, 0],
        wallSurface: 'left',
      });
    }

    // Right wall
    for (let z = 0; z < zCount; z++) {
      tiles.push({
        key: `wall-right-${z}-${y}`,
        type: 'wall',
        position: [width, yPos, z * TILE_SIZE + TILE_SIZE / 2],
        rotation: [0, -Math.PI / 2, 0],
        wallSurface: 'right',
      });
    }
  }

  // Center the entire room group
  const offsetX = width / 2;
  const offsetZ = depth / 2;

  return (
    <group position={[-offsetX, 0, -offsetZ]}>
      {/* Single large floor plane to receive shadows cleanly */}
      <mesh
        position={[width / 2, -0.01, depth / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          color="#e8e8e8"
          roughness={0.9}
          metalness={0.0}
        />
      </mesh>

      {/* Render all tiles for visual pattern (floor tiles don't receive shadows) */}
      {tiles.map((tile) => (
        <TileMesh key={tile.key} tile={tile} />
      ))}
    </group>
  );
}