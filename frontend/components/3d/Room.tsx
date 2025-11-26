'use client';

import * as THREE from 'three';
import { useMaterialStore } from '@/store/materialStore';
import { getMaterialById } from '@/data/materialCatalog';
import { useThree, useFrame } from '@react-three/fiber';
import { useEffect, useRef, useMemo, useState } from 'react';

interface RoomProps {
  roomDimensions?: {
    width: number;
    height: number;
    depth: number;
  };
}

export function Room({ roomDimensions }: RoomProps = {}) {
  // Use provided dimensions or defaults
  const width = roomDimensions?.width || 10;
  const depth = roomDimensions?.depth || 8;
  const height = roomDimensions?.height || 3;

  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const wallThickness = 0.1;

  // Fixed wall opacity - no dynamic changes based on camera
  const wallOpacity = 0.15; // Semi-transparent walls to see inside

  const appliedMaterials = useMaterialStore(state => state.appliedMaterials);
  const applicationMode = useMaterialStore(state => state.applicationMode);
  const selectedMaterialId = useMaterialStore(state => state.selectedMaterialId);
  const targetSurface = useMaterialStore(state => state.targetSurface);
  const applyMaterialFull = useMaterialStore(state => state.applyMaterialFull);
  const applyMaterialPartial = useMaterialStore(state => state.applyMaterialPartial);

  // Get applied materials for each surface
  const floorMaterial = appliedMaterials.find(m => m.surface === 'floor');
  const wallNorthMaterial = appliedMaterials.find(m => m.surface === 'wall-north');
  const wallSouthMaterial = appliedMaterials.find(m => m.surface === 'wall-south');
  const wallEastMaterial = appliedMaterials.find(m => m.surface === 'wall-east');
  const wallWestMaterial = appliedMaterials.find(m => m.surface === 'wall-west');

  // Create material from catalog
  const createMaterial = (materialId: string | undefined, isWall: boolean = false) => {
    const opacity = isWall ? wallOpacity : 1;

    if (!materialId) {
      // Default material
      return (
        <meshStandardMaterial
          color={isWall ? "#f0f0f0" : "#e8e8e8"}
          roughness={isWall ? 0.8 : 0.9}
          metalness={0.1}
          transparent={isWall}
          opacity={opacity}
          side={isWall ? THREE.DoubleSide : THREE.FrontSide}
          depthWrite={!isWall}
        />
      );
    }

    const material = getMaterialById(materialId);
    if (!material) return null;

    return (
      <meshStandardMaterial
        color={material.color || (isWall ? "#f0f0f0" : "#e8e8e8")}
        roughness={material.roughness ?? (isWall ? 0.8 : 0.9)}
        metalness={material.metalness ?? 0.1}
        transparent={isWall}
        opacity={opacity}
        side={isWall ? THREE.DoubleSide : THREE.FrontSide}
        depthWrite={!isWall}
      />
    );
  };

  // Handle click on surfaces with proper event stopping
  // DISABLED: Material system temporarily disabled
  const handleSurfaceClick = (
    surface: 'floor' | 'wall-north' | 'wall-south' | 'wall-east' | 'wall-west',
    event: any
  ) => {
    // Material system disabled - do nothing
    return;

    /* DISABLED CODE - uncomment to re-enable material system
    // Stop propagation immediately
    if (event.stopPropagation) {
      event.stopPropagation();
    }

    console.log('🖱️ Surface clicked:', {
      surface,
      applicationMode,
      selectedMaterialId,
      targetSurface,
      point: event.point
    });

    if (applicationMode === 'none' || !selectedMaterialId) {
      console.log('⚠️ No material selected or mode is none');
      return;
    }

    // Check if the clicked surface matches the target surface type
    const isFloor = surface === 'floor';
    const isWall = surface.startsWith('wall-');

    if (targetSurface === 'floor' && !isFloor) {
      console.log('❌ Cannot apply floor material to wall');
      return;
    }

    if (targetSurface === 'wall' && !isWall) {
      console.log('❌ Cannot apply wall material to floor');
      return;
    }

    if (applicationMode === 'full') {
      console.log('✅ Applying material FULL to:', surface);
      applyMaterialFull(surface, selectedMaterialId);
    } else if (applicationMode === 'partial') {
      // For partial application, we need the click position
      const point = event.point;
      if (point) {
        // Convert world position to tile coordinates
        const tileSize = 0.5; // 50cm tiles
        const tileX = Math.floor(point.x / tileSize);
        const tileZ = Math.floor(point.z / tileSize);
        console.log('✅ Applying material PARTIAL to:', surface, 'at tile:', { tileX, tileZ });
        applyMaterialPartial(surface, selectedMaterialId, { x: tileX, z: tileZ });
      }
    }
    */
  };

  // Render floor with tiles for partial application
  const renderFloor = () => {
    const tileSize = 0.5;

    // If full application or no partial tiles, render as single mesh
    if (!floorMaterial?.tiles || floorMaterial.tiles.length === 0) {
      return (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.001, 0]}
          receiveShadow
          onClick={(e) => handleSurfaceClick('floor', e)}
        >
          <planeGeometry args={[width, depth]} />
          {createMaterial(floorMaterial?.materialId, false)}
        </mesh>
      );
    }

    // Render base floor + individual tiles
    const tiles = [];
    const appliedTileSet = new Set(floorMaterial.tiles.map(t => `${t.x},${t.z}`));

    // Base floor (default material)
    tiles.push(
      <mesh
        key="floor-base"
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        onClick={(e) => handleSurfaceClick('floor', e)}
      >
        <planeGeometry args={[width, depth]} />
        {createMaterial(undefined, false)}
      </mesh>
    );

    // Individual tiles with applied material
    floorMaterial.tiles.forEach((tile, idx) => {
      const x = tile.x * tileSize + tileSize / 2;
      const z = tile.z * tileSize + tileSize / 2;

      tiles.push(
        <mesh
          key={`floor-tile-${idx}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[x, 0.002, z]}
          receiveShadow
          onClick={(e) => handleSurfaceClick('floor', e)}
        >
          <planeGeometry args={[tileSize, tileSize]} />
          {createMaterial(floorMaterial.materialId, false)}
        </mesh>
      );
    });

    return <>{tiles}</>;
  };

  // Render wall with proper click handling
  const renderWall = (
    surface: 'wall-north' | 'wall-south' | 'wall-east' | 'wall-west',
    position: [number, number, number],
    geometry: [number, number, number],
    materialData: typeof wallNorthMaterial
  ) => {
    return (
      <mesh
        position={position}
        receiveShadow
        castShadow
        onClick={(e) => {
          e.stopPropagation();
          handleSurfaceClick(surface, e);
        }}
      >
        <boxGeometry args={geometry} />
        {createMaterial(materialData?.materialId, true)}
      </mesh>
    );
  };

  return (
    <group>
      {/* Floor - with tile support */}
      {renderFloor()}

      {/* Back Wall (North) */}
      {renderWall(
        'wall-north',
        [0, height / 2, -halfDepth],
        [width, height, wallThickness],
        wallNorthMaterial
      )}

      {/* Front Wall (South) */}
      {renderWall(
        'wall-south',
        [0, height / 2, halfDepth],
        [width, height, wallThickness],
        wallSouthMaterial
      )}

      {/* Left Wall (West) */}
      {renderWall(
        'wall-west',
        [-halfWidth, height / 2, 0],
        [wallThickness, height, depth],
        wallWestMaterial
      )}

      {/* Right Wall (East) */}
      {renderWall(
        'wall-east',
        [halfWidth, height / 2, 0],
        [wallThickness, height, depth],
        wallEastMaterial
      )}

      {/* Ceiling removed - open top for better visibility */}

    </group>
  );
}