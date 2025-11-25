'use client';

import React, { forwardRef, useImperativeHandle, useMemo, useRef, useEffect, useState, memo } from 'react';
import * as THREE from 'three';
import { useThree, useLoader } from '@react-three/fiber';
import { RoomTemplate, Tile, ROOM_TEMPLATES } from './types';

interface RoomSceneProps {
  currentTemplate: RoomTemplate;
  customDimensions: { width: number; depth: number };
  selectedTiles: string[];
  tileTextures: Record<string, string>;
  onTileClick: (tileKey: string) => void;
}

const TILE_SIZE = 0.5;

// Texture loader component for each tile
const TileMesh: React.FC<{
  tile: Tile;
  isSelected: boolean;
  textureUrl: string | undefined;
  currentTemplate: RoomTemplate;
  onTileClick: (tileKey: string, e: any) => void;
}> = ({ tile, isSelected, textureUrl, currentTemplate, onTileClick }) => {
  // Load texture and force update when URL changes
  const [texture, setTexture] = useState<THREE.Texture | undefined>(undefined);

  useEffect(() => {
    if (!textureUrl) {
      setTexture(undefined);
      return;
    }

    console.log(`Loading texture for ${tile.key}: ${textureUrl.substring(0, 50)}...`);
    const loader = new THREE.TextureLoader();
    loader.load(textureUrl, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.needsUpdate = true;
      setTexture(tex);
      console.log(`Texture loaded for ${tile.key}`);
    });
  }, [textureUrl, tile.key]);

  return (
    <mesh
      key={`${tile.key}-${textureUrl || 'notexture'}`} // 텍스처 변경 시 강제 리렌더링
      position={tile.position}
      rotation={tile.rotation}
      onClick={(e) => {
        e.stopPropagation();
        onTileClick(tile.key, e);
      }}
      userData={{ tileKey: tile.key, tileType: tile.type }}
      renderOrder={isSelected ? 1 : 0}
    >
      <planeGeometry args={[TILE_SIZE, TILE_SIZE]} />
      <meshStandardMaterial
        key={`mat-${tile.key}-${textureUrl || 'notexture'}`}
        color={
          isSelected ? '#4CAF50' :
          texture ? '#ffffff' : // 텍스처가 있으면 흰색
          tile.type === 'floor' ? ROOM_TEMPLATES[currentTemplate].floorColor :
          ROOM_TEMPLATES[currentTemplate].wallColor
        }
        opacity={isSelected ? 0.8 : 1}
        transparent={isSelected}
        map={texture}
        side={THREE.DoubleSide}
        depthTest={true}
        depthWrite={true}
        roughness={0.8}
        metalness={0.0}
        needsUpdate={true}
      />
    </mesh>
  );
};

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
    const xCount = Math.floor(width / TILE_SIZE);
    const zCount = Math.floor(depth / TILE_SIZE);
    const yCount = Math.floor(wallHeight / TILE_SIZE);

    // Generate floor tiles based on template
    if (currentTemplate === 'lshaped') {
      // L-shaped room floor
      const splitX = Math.floor(xCount * 0.6);
      const splitZ = Math.floor(zCount * 0.6);

      for (let x = 0; x < xCount; x++) {
        for (let z = 0; z < zCount * 0.6; z++) {
          allTiles.push({
            key: `floor-${x}-${z}`,
            type: 'floor',
            position: [x * TILE_SIZE + TILE_SIZE / 2, 0, z * TILE_SIZE + TILE_SIZE / 2],
            rotation: [-Math.PI / 2, 0, 0],
          });
        }
      }
      for (let x = 0; x < xCount * 0.6; x++) {
        for (let z = Math.floor(zCount * 0.6); z < zCount; z++) {
          allTiles.push({
            key: `floor-${x}-${z}`,
            type: 'floor',
            position: [x * TILE_SIZE + TILE_SIZE / 2, 0, z * TILE_SIZE + TILE_SIZE / 2],
            rotation: [-Math.PI / 2, 0, 0],
          });
        }
      }

      // L-shaped walls
      for (let y = 0; y < yCount; y++) {
        const yPos = y * TILE_SIZE + TILE_SIZE / 2;

        // Back wall (full)
        for (let x = 0; x < xCount; x++) {
          allTiles.push({
            key: `wall-back-${x}-${y}`,
            type: 'wall',
            position: [x * TILE_SIZE + TILE_SIZE / 2, yPos, 0],
            rotation: [0, 0, 0],
            wallSurface: 'back',
          });
        }

        // Left wall (full)
        for (let z = 0; z < zCount; z++) {
          allTiles.push({
            key: `wall-left-${z}-${y}`,
            type: 'wall',
            position: [0, yPos, z * TILE_SIZE + TILE_SIZE / 2],
            rotation: [0, Math.PI / 2, 0],
            wallSurface: 'left',
          });
        }

        // Inner walls for L-shape
        for (let x = splitX; x < xCount; x++) {
          allTiles.push({
            key: `wall-inner-h-${x}-${y}`,
            type: 'wall',
            position: [x * TILE_SIZE + TILE_SIZE / 2, yPos, splitZ * TILE_SIZE],
            rotation: [0, Math.PI, 0],
            wallSurface: 'inner',
          });
        }
        for (let z = splitZ; z < zCount; z++) {
          allTiles.push({
            key: `wall-inner-v-${z}-${y}`,
            type: 'wall',
            position: [splitX * TILE_SIZE, yPos, z * TILE_SIZE + TILE_SIZE / 2],
            rotation: [0, -Math.PI / 2, 0],
            wallSurface: 'inner',
          });
        }

        // Outer walls
        for (let z = 0; z < splitZ; z++) {
          allTiles.push({
            key: `wall-right-bottom-${z}-${y}`,
            type: 'wall',
            position: [width, yPos, z * TILE_SIZE + TILE_SIZE / 2],
            rotation: [0, -Math.PI / 2, 0],
            wallSurface: 'right',
          });
        }
        for (let x = 0; x < splitX; x++) {
          allTiles.push({
            key: `wall-front-top-${x}-${y}`,
            type: 'wall',
            position: [x * TILE_SIZE + TILE_SIZE / 2, yPos, depth],
            rotation: [0, Math.PI, 0],
            wallSurface: 'front',
          });
        }
      }
    } else if (currentTemplate === 'ushaped') {
      // U-shaped room floor
      const excludeXStart = Math.floor(xCount * 0.3);
      const excludeXEnd = Math.floor(xCount * 0.7);
      const excludeZStart = Math.floor(zCount * 0.6);

      for (let x = 0; x < xCount; x++) {
        for (let z = 0; z < zCount; z++) {
          if (x >= excludeXStart && x < excludeXEnd && z >= excludeZStart) {
            continue;
          }
          allTiles.push({
            key: `floor-${x}-${z}`,
            type: 'floor',
            position: [x * TILE_SIZE + TILE_SIZE / 2, 0, z * TILE_SIZE + TILE_SIZE / 2],
            rotation: [-Math.PI / 2, 0, 0],
          });
        }
      }

      // U-shaped walls
      for (let y = 0; y < yCount; y++) {
        const yPos = y * TILE_SIZE + TILE_SIZE / 2;

        // Back wall (full)
        for (let x = 0; x < xCount; x++) {
          allTiles.push({
            key: `wall-back-${x}-${y}`,
            type: 'wall',
            position: [x * TILE_SIZE + TILE_SIZE / 2, yPos, 0],
            rotation: [0, 0, 0],
            wallSurface: 'back',
          });
        }

        // Side walls
        for (let z = 0; z < zCount; z++) {
          allTiles.push({
            key: `wall-left-${z}-${y}`,
            type: 'wall',
            position: [0, yPos, z * TILE_SIZE + TILE_SIZE / 2],
            rotation: [0, Math.PI / 2, 0],
            wallSurface: 'left',
          });
          allTiles.push({
            key: `wall-right-${z}-${y}`,
            type: 'wall',
            position: [width, yPos, z * TILE_SIZE + TILE_SIZE / 2],
            rotation: [0, -Math.PI / 2, 0],
            wallSurface: 'right',
          });
        }

        // Front walls (partial)
        for (let x = 0; x < excludeXStart; x++) {
          allTiles.push({
            key: `wall-front-left-${x}-${y}`,
            type: 'wall',
            position: [x * TILE_SIZE + TILE_SIZE / 2, yPos, depth],
            rotation: [0, Math.PI, 0],
            wallSurface: 'front',
          });
        }
        for (let x = excludeXEnd; x < xCount; x++) {
          allTiles.push({
            key: `wall-front-right-${x}-${y}`,
            type: 'wall',
            position: [x * TILE_SIZE + TILE_SIZE / 2, yPos, depth],
            rotation: [0, Math.PI, 0],
            wallSurface: 'front',
          });
        }

        // Inner walls for U-shape
        for (let z = 0; z < excludeZStart; z++) {
          allTiles.push({
            key: `wall-inner-left-${z}-${y}`,
            type: 'wall',
            position: [excludeXStart * TILE_SIZE, yPos, z * TILE_SIZE + TILE_SIZE / 2],
            rotation: [0, Math.PI / 2, 0],
            wallSurface: 'inner',
          });
          allTiles.push({
            key: `wall-inner-right-${z}-${y}`,
            type: 'wall',
            position: [excludeXEnd * TILE_SIZE, yPos, z * TILE_SIZE + TILE_SIZE / 2],
            rotation: [0, -Math.PI / 2, 0],
            wallSurface: 'inner',
          });
        }
      }
    } else {
      // Regular rectangular room
      for (let x = 0; x < xCount; x++) {
        for (let z = 0; z < zCount; z++) {
          allTiles.push({
            key: `floor-${x}-${z}`,
            type: 'floor',
            position: [x * TILE_SIZE + TILE_SIZE / 2, 0, z * TILE_SIZE + TILE_SIZE / 2],
            rotation: [-Math.PI / 2, 0, 0],
          });
        }
      }

      for (let y = 0; y < yCount; y++) {
        const yPos = y * TILE_SIZE + TILE_SIZE / 2;

        // Back wall
        for (let x = 0; x < xCount; x++) {
          allTiles.push({
            key: `wall-back-${x}-${y}`,
            type: 'wall',
            position: [x * TILE_SIZE + TILE_SIZE / 2, yPos, 0],
            rotation: [0, 0, 0],
            wallSurface: 'back',
          });
        }

        // Front wall
        for (let x = 0; x < xCount; x++) {
          allTiles.push({
            key: `wall-front-${x}-${y}`,
            type: 'wall',
            position: [x * TILE_SIZE + TILE_SIZE / 2, yPos, depth],
            rotation: [0, Math.PI, 0],
            wallSurface: 'front',
          });
        }

        // Left wall
        for (let z = 0; z < zCount; z++) {
          allTiles.push({
            key: `wall-left-${z}-${y}`,
            type: 'wall',
            position: [0, yPos, z * TILE_SIZE + TILE_SIZE / 2],
            rotation: [0, Math.PI / 2, 0],
            wallSurface: 'left',
          });
        }

        // Right wall
        for (let z = 0; z < zCount; z++) {
          allTiles.push({
            key: `wall-right-${z}-${y}`,
            type: 'wall',
            position: [width, yPos, z * TILE_SIZE + TILE_SIZE / 2],
            rotation: [0, -Math.PI / 2, 0],
            wallSurface: 'right',
          });
        }
      }
    }

    return allTiles;
  }, [currentTemplate, dimensions]);

  // Expose getScene method to parent
  useImperativeHandle(ref, () => ({
    getScene: () => groupRef.current,
  }));

  console.log(`Rendering ${tiles.length} tiles, textures applied to:`, Object.keys(tileTextures));

  return (
    <group ref={groupRef}>
      {tiles.map((tile) => (
        <TileMesh
          key={tile.key}
          tile={tile}
          isSelected={selectedTiles.includes(tile.key)}
          textureUrl={tileTextures[tile.key]}
          currentTemplate={currentTemplate}
          onTileClick={onTileClick}
        />
      ))}
    </group>
  );
});

RoomScene.displayName = 'RoomScene';

export default RoomScene;