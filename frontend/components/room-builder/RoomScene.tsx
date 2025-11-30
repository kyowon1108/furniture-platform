'use client';

import React, { forwardRef, useImperativeHandle, useMemo, useRef, useEffect, useState, memo } from 'react';
import * as THREE from 'three';
import { useThree, ThreeEvent } from '@react-three/fiber';
import { RoomTemplate, Tile, ROOM_TEMPLATES } from './types';
import { FreeBuildTile, FreeBuildConfig, DEFAULT_FREE_BUILD_CONFIG, calculateTilePosition, WALL_ROTATIONS } from '@/types/freeBuild';

// Build tool type for custom mode
type BuildTool = 'select' | 'floor' | 'eraser';

interface RoomSceneProps {
  currentTemplate: RoomTemplate;
  customDimensions: { width: number; depth: number };
  selectedTiles: string[];
  tileTextures: Record<string, string>;
  onTileClick: (tileKey: string, event?: any) => void;
  // New props for custom mode dynamic tiles
  customTiles?: FreeBuildTile[];
  currentTool?: BuildTool;
  onGridClick?: (gridX: number, gridZ: number) => void;
  showGrid?: boolean;
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

  // Get the correct color based on tile type
  const defaultColor = tile.type === 'floor' ?
    ROOM_TEMPLATES[currentTemplate].floorColor :
    ROOM_TEMPLATES[currentTemplate].wallColor;

  useEffect(() => {
    if (!textureUrl) {
      setTexture(undefined);
      console.log(`[${tile.key}] No texture URL, using default ${tile.type} color: ${defaultColor}`);
      return;
    }

    console.log(`[${tile.key}] Loading texture from: ${textureUrl.substring(0, 50)}...`);
    const loader = new THREE.TextureLoader();
    loader.load(
      textureUrl,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;

        // Rotate texture 90 degrees for left and right walls
        if (tile.wallSurface === 'left' || tile.wallSurface === 'right') {
          tex.rotation = Math.PI / 2;  // 90도 회전
          tex.center.set(0.5, 0.5);    // 중심점 설정
        }

        tex.needsUpdate = true;
        setTexture(tex);
        console.log(`[${tile.key}] ✅ Texture loaded successfully, material will use white color`);
      },
      undefined,
      (error) => {
        console.error(`[${tile.key}] ❌ Failed to load texture:`, error);
        setTexture(undefined);
      }
    );
  }, [textureUrl, tile.key, defaultColor]);

  // Determine the material color
  const materialColor = isSelected ? '#4CAF50' :
                       texture ? '#ffffff' :  // Only use white when texture is actually loaded
                       defaultColor;  // Use default color when no texture

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
        key={`mat-${tile.key}-${textureUrl || 'notexture'}-${texture ? 'loaded' : 'loading'}`}
        color={materialColor}
        opacity={isSelected ? 0.8 : 1}
        transparent={isSelected}
        map={texture || undefined}
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

// Grid plane for custom mode - allows clicking to place tiles
const GridPlane: React.FC<{
  width: number;
  depth: number;
  onGridClick: (gridX: number, gridZ: number) => void;
  currentTool: BuildTool;
}> = ({ width, depth, onGridClick, currentTool }) => {
  const gridRef = useRef<THREE.Mesh>(null);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (currentTool !== 'floor') return;

    e.stopPropagation();
    const point = e.point;

    // Convert world coordinates to grid coordinates
    const gridX = Math.floor(point.x / TILE_SIZE);
    const gridZ = Math.floor(point.z / TILE_SIZE);

    // Check bounds
    const maxX = Math.floor(width / TILE_SIZE);
    const maxZ = Math.floor(depth / TILE_SIZE);

    if (gridX >= 0 && gridX < maxX && gridZ >= 0 && gridZ < maxZ) {
      onGridClick(gridX, gridZ);
    }
  };

  return (
    <mesh
      ref={gridRef}
      position={[width / 2, -0.01, depth / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={handleClick}
    >
      <planeGeometry args={[width, depth]} />
      <meshBasicMaterial
        color="#1a1a2e"
        transparent
        opacity={0.3}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

// FreeBuild Tile Mesh component
const FreeBuildTileMesh: React.FC<{
  tile: FreeBuildTile;
  isSelected: boolean;
  textureUrl?: string;
  config: FreeBuildConfig;
  currentTool: BuildTool;
  onTileClick: (tileId: string, event?: any) => void;
}> = ({ tile, isSelected, textureUrl, config, currentTool, onTileClick }) => {
  const [texture, setTexture] = useState<THREE.Texture | undefined>(undefined);

  const position = useMemo(() => calculateTilePosition(tile, config), [tile, config]);

  const rotation = useMemo((): [number, number, number] => {
    if (tile.type === 'floor') {
      return [-Math.PI / 2, 0, 0];
    }
    return WALL_ROTATIONS[tile.wallDirection || 'north'];
  }, [tile.type, tile.wallDirection]);

  const defaultColor = tile.type === 'floor' ? '#d4a574' : '#F5F5F5';

  useEffect(() => {
    if (!textureUrl) {
      setTexture(undefined);
      return;
    }

    const loader = new THREE.TextureLoader();
    loader.load(
      textureUrl,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.needsUpdate = true;
        setTexture(tex);
      },
      undefined,
      () => setTexture(undefined)
    );
  }, [textureUrl]);

  const materialColor = isSelected
    ? (currentTool === 'eraser' ? '#ff4444' : '#4CAF50')
    : texture ? '#ffffff' : defaultColor;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onTileClick(tile.id, e);
  };

  return (
    <mesh
      key={`${tile.id}-${textureUrl || 'notexture'}`}
      position={position}
      rotation={rotation}
      onClick={handleClick}
      userData={{ tileId: tile.id, tileType: tile.type }}
      renderOrder={isSelected ? 1 : 0}
    >
      <planeGeometry args={[config.tileSize, config.tileSize]} />
      <meshStandardMaterial
        key={`mat-${tile.id}-${textureUrl || 'notexture'}-${texture ? 'loaded' : 'loading'}`}
        color={materialColor}
        opacity={isSelected ? 0.8 : 1}
        transparent={isSelected}
        map={texture || undefined}
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
  customTiles,
  currentTool = 'select',
  onGridClick,
  showGrid = true,
}, ref) => {
  const { scene } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  // FreeBuild config for custom mode
  const freeBuildConfig: FreeBuildConfig = useMemo(() => ({
    ...DEFAULT_FREE_BUILD_CONFIG,
    gridSize: Math.max(
      Math.ceil(customDimensions.width / DEFAULT_FREE_BUILD_CONFIG.tileSize),
      Math.ceil(customDimensions.depth / DEFAULT_FREE_BUILD_CONFIG.tileSize)
    ),
  }), [customDimensions]);

  // Get room dimensions
  const dimensions = useMemo(() => {
    if (currentTemplate === 'custom') {
      return customDimensions;
    }
    const template = ROOM_TEMPLATES[currentTemplate];
    return { width: template.width, depth: template.depth };
  }, [currentTemplate, customDimensions]);

  // Generate tiles based on template (for non-custom modes)
  // For custom mode with customTiles, return empty array
  const tiles = useMemo(() => {
    // If in custom mode with dynamic tiles, don't generate static tiles
    if (currentTemplate === 'custom' && customTiles) {
      return [];
    }

    const template = ROOM_TEMPLATES[currentTemplate];
    const { width, depth } = dimensions;
    const wallHeight = template.wallHeight;

    const allTiles: Tile[] = [];
    const xCount = Math.floor(width / TILE_SIZE);
    const zCount = Math.floor(depth / TILE_SIZE);
    const yCount = Math.floor(wallHeight / TILE_SIZE);

    // Generate floor tiles - always rectangular room
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

    return allTiles;
  }, [currentTemplate, dimensions, customTiles]);

  // Expose getScene method to parent
  useImperativeHandle(ref, () => ({
    getScene: () => groupRef.current,
  }));

  const isCustomWithDynamicTiles = currentTemplate === 'custom' && customTiles;

  return (
    <group ref={groupRef}>
      {/* Grid plane for custom mode - visible when showGrid is true */}
      {isCustomWithDynamicTiles && showGrid && onGridClick && (
        <GridPlane
          width={dimensions.width}
          depth={dimensions.depth}
          onGridClick={onGridClick}
          currentTool={currentTool}
        />
      )}

      {/* Grid lines for custom mode */}
      {isCustomWithDynamicTiles && showGrid && (
        <gridHelper
          args={[
            Math.max(dimensions.width, dimensions.depth),
            Math.max(dimensions.width, dimensions.depth) / TILE_SIZE,
            '#444466',
            '#333344'
          ]}
          position={[dimensions.width / 2, 0.001, dimensions.depth / 2]}
        />
      )}

      {/* Static tiles for non-custom modes */}
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

      {/* Dynamic tiles for custom mode */}
      {isCustomWithDynamicTiles && customTiles.map((tile) => (
        <FreeBuildTileMesh
          key={tile.id}
          tile={tile}
          isSelected={selectedTiles.includes(tile.id)}
          textureUrl={tile.textureUrl || tileTextures[tile.id]}
          config={freeBuildConfig}
          currentTool={currentTool}
          onTileClick={onTileClick}
        />
      ))}
    </group>
  );
});

RoomScene.displayName = 'RoomScene';

export default RoomScene;