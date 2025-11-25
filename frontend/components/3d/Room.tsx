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
  
  const { camera } = useThree();
  const [wallOpacities, setWallOpacities] = useState({
    north: 0.15,
    south: 0.15,
    east: 0.15,
    west: 0.15
  });
  
  // Track camera position and adjust wall opacity based on camera direction
  useFrame(() => {
    const cameraPos = camera.position;
    const isInside = 
      Math.abs(cameraPos.x) < halfWidth &&
      Math.abs(cameraPos.z) < halfDepth &&
      cameraPos.y > 0 && cameraPos.y < height;
    
    // Room center (for direction calculation)
    const roomCenter = new THREE.Vector3(0, height / 2, 0);
    
    // Direction from camera to room center
    const directionToRoom = new THREE.Vector3()
      .subVectors(roomCenter, cameraPos)
      .normalize();
    
    // Calculate opacity for each wall based on camera position
    const newOpacities = {
      north: 0.15,
      south: 0.15,
      east: 0.15,
      west: 0.15
    };
    
    if (!isInside) {
      // Camera is outside - check which walls are blocking the view
      // Only make walls transparent if they are in the camera's viewing direction
      // Don't make walls transparent if they are behind the camera (opposite side)
      
      // Get camera's viewing direction
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);
      
      // Wall positions and normals (pointing inward)
      const wallPositions = {
        north: new THREE.Vector3(0, height / 2, -halfDepth),
        south: new THREE.Vector3(0, height / 2, halfDepth),
        west: new THREE.Vector3(-halfWidth, height / 2, 0),
        east: new THREE.Vector3(halfWidth, height / 2, 0)
      };
      
      const wallNormals = {
        north: new THREE.Vector3(0, 0, 1),   // Pointing inward (toward room center)
        south: new THREE.Vector3(0, 0, -1),
        west: new THREE.Vector3(1, 0, 0),
        east: new THREE.Vector3(-1, 0, 0)
      };
      
      // Check each wall: is it in the camera's viewing direction?
      const checkWall = (wallPos: THREE.Vector3, wallNormal: THREE.Vector3) => {
        // Direction from camera to wall
        const toWall = new THREE.Vector3().subVectors(wallPos, cameraPos).normalize();
        
        // Check if wall is in front of camera (camera is looking at it)
        // Dot product > 0 means wall is in front of camera
        const isInFront = cameraDirection.dot(toWall) > 0;
        
        // Also check if wall is between camera and room center
        const ray = new THREE.Ray(cameraPos, directionToRoom);
        const wallPlane = new THREE.Plane();
        wallPlane.setFromNormalAndCoplanarPoint(wallNormal, wallPos);
        const intersect = new THREE.Vector3();
        const intersects = ray.intersectPlane(wallPlane, intersect);
        
        // Wall is blocking if: it's in front of camera AND ray intersects it
        return isInFront && intersects;
      };
      
      const northBlocking = checkWall(wallPositions.north, wallNormals.north);
      const southBlocking = checkWall(wallPositions.south, wallNormals.south);
      const westBlocking = checkWall(wallPositions.west, wallNormals.west);
      const eastBlocking = checkWall(wallPositions.east, wallNormals.east);
      
      // Make blocking walls transparent (more visible = 0.18 instead of 0.12)
      // Only walls in camera's viewing direction are made transparent
      // 0.18 = 20% more visible than 0.12 (10% less transparent than before)
      newOpacities.north = northBlocking ? 0.18 : 0.15;
      newOpacities.south = southBlocking ? 0.18 : 0.15;
      newOpacities.west = westBlocking ? 0.18 : 0.15;
      newOpacities.east = eastBlocking ? 0.18 : 0.15;
    }
    
    // Smooth transition
    setWallOpacities(prev => ({
      north: prev.north + (newOpacities.north - prev.north) * 0.1,
      south: prev.south + (newOpacities.south - prev.south) * 0.1,
      east: prev.east + (newOpacities.east - prev.east) * 0.1,
      west: prev.west + (newOpacities.west - prev.west) * 0.1
    }));
  });

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
  const createMaterial = (materialId: string | undefined, isWall: boolean = false, wallType?: 'north' | 'south' | 'east' | 'west') => {
    // Get opacity for this specific wall
    const opacity = isWall && wallType ? wallOpacities[wallType] : (isWall ? 0.15 : 1);
    
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
    materialData: typeof wallNorthMaterial,
    wallType: 'north' | 'south' | 'east' | 'west'
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
        {createMaterial(materialData?.materialId, true, wallType)}
      </mesh>
    );
  };

  return (
    <group>
      {/* Floor - with tile support */}
      {renderFloor()}

      {/* Back Wall (North) - Very transparent to see inside */}
      {renderWall(
        'wall-north',
        [0, height / 2, -halfDepth],
        [width, height, wallThickness],
        wallNorthMaterial,
        'north'
      )}

      {/* Front Wall (South) - Very transparent to see inside */}
      {renderWall(
        'wall-south',
        [0, height / 2, halfDepth],
        [width, height, wallThickness],
        wallSouthMaterial,
        'south'
      )}

      {/* Left Wall (West) - Very transparent to see inside */}
      {renderWall(
        'wall-west',
        [-halfWidth, height / 2, 0],
        [wallThickness, height, depth],
        wallWestMaterial,
        'west'
      )}

      {/* Right Wall (East) - Very transparent to see inside */}
      {renderWall(
        'wall-east',
        [halfWidth, height / 2, 0],
        [wallThickness, height, depth],
        wallEastMaterial,
        'east'
      )}

      {/* Ceiling - 반투명 제거 (주석 처리)
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, height, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.9}
          transparent
          opacity={0.05}
          side={2}
          depthWrite={false}
        />
      </mesh>
      */}

      {/* Baseboard lines for detail */}
      <lineSegments>
        <edgesGeometry attach="geometry" args={[new THREE.BoxGeometry(width, height, depth)]} />
        <lineBasicMaterial attach="material" color="#999999" linewidth={1} />
      </lineSegments>
    </group>
  );
}
