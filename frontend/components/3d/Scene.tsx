'use client';

import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Line, TransformControls } from '@react-three/drei';
import { Furniture } from './Furniture';
import { Room } from './Room';
import { PlyModel } from './PlyModel';
import { GlbModel } from './GlbModel';
import { useEditorStore } from '@/store/editorStore';
import { useToastStore } from '@/store/toastStore';
import { socketService } from '@/lib/socket';
import type { FurnitureCatalogItem } from '@/types/catalog';
import type { FurnitureItem } from '@/types/furniture';
import * as THREE from 'three';
import { useRef, useEffect } from 'react';

function SceneContent({ 
  projectId, 
  hasPlyFile, 
  plyFilePath,
  fileType,
  roomDimensions,
  onRoomDimensionsChange
}: { 
  projectId?: number; 
  hasPlyFile?: boolean; 
  plyFilePath?: string;
  fileType?: 'ply' | 'glb' | null;
  roomDimensions?: { width: number; height: number; depth: number };
  onRoomDimensionsChange?: (dims: { width: number; height: number; depth: number }) => void;
}) {
  const furnitures = useEditorStore((state) => state.furnitures);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const transformMode = useEditorStore((state) => state.transformMode);
  const updateFurniture = useEditorStore((state) => state.updateFurniture);
  const timeOfDay = useEditorStore((state) => state.timeOfDay);
  const measureMode = useEditorStore((state) => state.measureMode);
  const measurePoints = useEditorStore((state) => state.measurePoints);
  const addMeasurePoint = useEditorStore((state) => state.addMeasurePoint);

  const { camera, raycaster, scene, gl } = useThree();
  const orbitControlsRef = useRef<any>(null);
  const transformControlsRef = useRef<any>(null);

  const selectedFurniture = selectedIds.length === 1 ? furnitures.find(f => f.id === selectedIds[0]) : null;
  const previousPositionRef = useRef<{ x: number; y: number; z: number } | null>(null);

  // Use provided room dimensions or default values
  // If PLY file exists and room dimensions are 0, we'll use a large boundary
  const actualRoomDimensions = roomDimensions || {
    width: 10,
    depth: 8,
    height: 3,
  };

  // Check if we should use PLY-based boundaries (room dimensions are all 0)
  const usePlyBoundaries = hasPlyFile && 
    actualRoomDimensions.width === 0 && 
    actualRoomDimensions.height === 0 && 
    actualRoomDimensions.depth === 0;

  console.log('Scene boundaries:', {
    roomDimensions: actualRoomDimensions,
    hasPlyFile,
    usePlyBoundaries
  });

  // Check if position is valid (no collision and within bounds)
  const isValidPosition = (furniture: FurnitureItem, newPos: { x: number; y: number; z: number }) => {
    const halfWidth = furniture.dimensions.width / 2;
    const halfDepth = furniture.dimensions.depth / 2;
    
    console.log('=== Checking position validity ===', {
      furnitureId: furniture.id,
      newPos,
      dimensions: furniture.dimensions,
      halfWidth,
      halfDepth,
      usePlyBoundaries,
      actualRoomDimensions
    });
    
    // Only check room boundaries if we have valid room dimensions
    // For PLY files with 0 dimensions, use a very large boundary
    if (!usePlyBoundaries) {
      const roomHalfWidth = actualRoomDimensions.width / 2;
      const roomHalfDepth = actualRoomDimensions.depth / 2;
      
      // Calculate furniture edges
      const furnitureMinX = newPos.x - halfWidth;
      const furnitureMaxX = newPos.x + halfWidth;
      const furnitureMinZ = newPos.z - halfDepth;
      const furnitureMaxZ = newPos.z + halfDepth;
      
      // Calculate room boundaries
      const roomMinX = -roomHalfWidth;
      const roomMaxX = roomHalfWidth;
      const roomMinZ = -roomHalfDepth;
      const roomMaxZ = roomHalfDepth;
      
      console.log('Boundary check:', {
        furniture: { minX: furnitureMinX, maxX: furnitureMaxX, minZ: furnitureMinZ, maxZ: furnitureMaxZ },
        room: { minX: roomMinX, maxX: roomMaxX, minZ: roomMinZ, maxZ: roomMaxZ }
      });
      
      if (furnitureMinX < roomMinX || furnitureMaxX > roomMaxX) {
        console.log('❌ Boundary check failed: X out of bounds');
        return false;
      }
      if (furnitureMinZ < roomMinZ || furnitureMaxZ > roomMaxZ) {
        console.log('❌ Boundary check failed: Z out of bounds');
        return false;
      }
      
      console.log('✓ Boundary check passed');
    } else {
      // For PLY with 0 dimensions, use a very large boundary (50 units)
      const maxBoundary = 50;
      if (Math.abs(newPos.x) > maxBoundary || Math.abs(newPos.z) > maxBoundary) {
        console.log('❌ PLY boundary check failed: position too far', { newPos, maxBoundary });
        return false;
      }
      console.log('✓ PLY boundary check passed');
    }
    
    // Check collision with other furniture
    // Allow furniture to touch perfectly (no gap required)
    // Only prevent actual penetration/overlap
    
    for (const other of furnitures) {
      if (furniture.id === other.id) continue;
      
      const f1 = {
        minX: newPos.x - halfWidth,
        maxX: newPos.x + halfWidth,
        minZ: newPos.z - halfDepth,
        maxZ: newPos.z + halfDepth,
      };
      
      const f2 = {
        minX: other.position.x - other.dimensions.width / 2,
        maxX: other.position.x + other.dimensions.width / 2,
        minZ: other.position.z - other.dimensions.depth / 2,
        maxZ: other.position.z + other.dimensions.depth / 2,
      };
      
      // Calculate actual overlap (penetration)
      // Overlap is positive only when furniture actually penetrate each other
      const overlapX = Math.min(f1.maxX, f2.maxX) - Math.max(f1.minX, f2.minX);
      const overlapZ = Math.min(f1.maxZ, f2.maxZ) - Math.max(f1.minZ, f2.minZ);
      
      // Only reject if there's significant penetration (more than 2cm)
      // This allows furniture to touch perfectly
      const penetrationThreshold = 0.02;
      
      if (overlapX > penetrationThreshold && overlapZ > penetrationThreshold) {
        console.log('❌ Collision detected with furniture:', other.id, {
          overlapX: overlapX.toFixed(3),
          overlapZ: overlapZ.toFixed(3),
          threshold: penetrationThreshold,
          f1,
          f2
        });
        return false;
      }
    }
    
    console.log('✓ No collisions detected');
    return true;
  };

  // Collision detection function - memoized to prevent unnecessary recalculations
  const checkCollisions = useRef<() => void>();
  
  checkCollisions.current = () => {
    let hasChanges = false;
    const penetrationThreshold = 0.02; // Same as in isValidPosition
    
    const updatedFurnitures = furnitures.map(furniture => {
      let isColliding = false;
      
      // Check collision with other furniture
      for (const other of furnitures) {
        if (furniture.id === other.id) continue;
        
        // Simple AABB collision detection on XZ plane
        const f1 = {
          minX: furniture.position.x - furniture.dimensions.width / 2,
          maxX: furniture.position.x + furniture.dimensions.width / 2,
          minZ: furniture.position.z - furniture.dimensions.depth / 2,
          maxZ: furniture.position.z + furniture.dimensions.depth / 2,
        };
        
        const f2 = {
          minX: other.position.x - other.dimensions.width / 2,
          maxX: other.position.x + other.dimensions.width / 2,
          minZ: other.position.z - other.dimensions.depth / 2,
          maxZ: other.position.z + other.dimensions.depth / 2,
        };
        
        // Calculate actual overlap (penetration)
        const overlapX = Math.min(f1.maxX, f2.maxX) - Math.max(f1.minX, f2.minX);
        const overlapZ = Math.min(f1.maxZ, f2.maxZ) - Math.max(f1.minZ, f2.minZ);
        
        // Only mark as colliding if there's significant penetration
        if (overlapX > penetrationThreshold && overlapZ > penetrationThreshold) {
          isColliding = true;
          break;
        }
      }
      
      // Update collision state if changed
      if (furniture.isColliding !== isColliding) {
        hasChanges = true;
        return { ...furniture, isColliding };
      }
      return furniture;
    });
    
    // Only update if there are actual changes
    if (hasChanges) {
      useEditorStore.setState({ furnitures: updatedFurnitures });
    }
  };

  // Check collisions whenever furniture position changes
  useEffect(() => {
    if (checkCollisions.current) {
      checkCollisions.current();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [furnitures.length, JSON.stringify(furnitures.map(f => ({ x: f.position.x, z: f.position.z, id: f.id })))]);

  // Ensure all furniture stays on the ground (y = 0) and within room boundaries
  // Also resolve collisions between furniture
  useEffect(() => {
    if (usePlyBoundaries) return; // Skip for PLY files with 0 dimensions
    
    const margin = 0.05; // Small margin from walls
    let needsUpdate = false;
    const correctedFurnitures = [...furnitures];
    
    // First pass: Fix positions within room boundaries
    for (let i = 0; i < correctedFurnitures.length; i++) {
      const furniture = correctedFurnitures[i];
      let correctedPos = { ...furniture.position };
      
      // Fix Y position - but preserve wall-mounted and surface-mounted furniture heights
      const isWallMounted = furniture.mountType === 'wall';
      const isSurfaceMounted = furniture.mountType === 'surface';
      
      if (!isWallMounted && !isSurfaceMounted && correctedPos.y !== 0) {
        correctedPos.y = 0;
        needsUpdate = true;
      }
      
      // Fix X position (within room boundaries with margin)
      const halfWidth = furniture.dimensions.width / 2;
      const roomHalfWidth = actualRoomDimensions.width / 2;
      
      if (correctedPos.x - halfWidth < -roomHalfWidth + margin) {
        correctedPos.x = -roomHalfWidth + halfWidth + margin;
        needsUpdate = true;
        console.log(`🔧 Correcting ${furniture.id} X position (too far left)`);
      } else if (correctedPos.x + halfWidth > roomHalfWidth - margin) {
        correctedPos.x = roomHalfWidth - halfWidth - margin;
        needsUpdate = true;
        console.log(`🔧 Correcting ${furniture.id} X position (too far right)`);
      }
      
      // Fix Z position (within room boundaries with margin)
      const halfDepth = furniture.dimensions.depth / 2;
      const roomHalfDepth = actualRoomDimensions.depth / 2;
      
      if (correctedPos.z - halfDepth < -roomHalfDepth + margin) {
        correctedPos.z = -roomHalfDepth + halfDepth + margin;
        needsUpdate = true;
        console.log(`🔧 Correcting ${furniture.id} Z position (too far back)`);
      } else if (correctedPos.z + halfDepth > roomHalfDepth - margin) {
        correctedPos.z = roomHalfDepth - halfDepth - margin;
        needsUpdate = true;
        console.log(`🔧 Correcting ${furniture.id} Z position (too far front)`);
      }
      
      if (correctedPos.x !== furniture.position.x || 
          correctedPos.y !== furniture.position.y || 
          correctedPos.z !== furniture.position.z) {
        correctedFurnitures[i] = {
          ...furniture,
          position: correctedPos
        };
      }
    }
    
    // Second pass: Resolve collisions by moving furniture apart
    const collisionMargin = 0.1;
    for (let i = 0; i < correctedFurnitures.length; i++) {
      for (let j = i + 1; j < correctedFurnitures.length; j++) {
        const f1 = correctedFurnitures[i];
        const f2 = correctedFurnitures[j];
        
        const box1 = {
          minX: f1.position.x - f1.dimensions.width / 2,
          maxX: f1.position.x + f1.dimensions.width / 2,
          minZ: f1.position.z - f1.dimensions.depth / 2,
          maxZ: f1.position.z + f1.dimensions.depth / 2,
        };
        
        const box2 = {
          minX: f2.position.x - f2.dimensions.width / 2,
          maxX: f2.position.x + f2.dimensions.width / 2,
          minZ: f2.position.z - f2.dimensions.depth / 2,
          maxZ: f2.position.z + f2.dimensions.depth / 2,
        };
        
        // Check if boxes overlap
        if (box1.minX < box2.maxX && box1.maxX > box2.minX &&
            box1.minZ < box2.maxZ && box1.maxZ > box2.minZ) {
          
          console.log(`🔧 Resolving collision between ${f1.id} and ${f2.id}`);
          
          // Calculate overlap
          const overlapX = Math.min(box1.maxX - box2.minX, box2.maxX - box1.minX);
          const overlapZ = Math.min(box1.maxZ - box2.minZ, box2.maxZ - box1.minZ);
          
          // Move along the axis with smaller overlap
          if (overlapX < overlapZ) {
            // Move apart on X axis
            const moveDistance = (overlapX / 2) + collisionMargin;
            if (f1.position.x < f2.position.x) {
              correctedFurnitures[i] = {
                ...f1,
                position: { ...f1.position, x: f1.position.x - moveDistance }
              };
              correctedFurnitures[j] = {
                ...f2,
                position: { ...f2.position, x: f2.position.x + moveDistance }
              };
            } else {
              correctedFurnitures[i] = {
                ...f1,
                position: { ...f1.position, x: f1.position.x + moveDistance }
              };
              correctedFurnitures[j] = {
                ...f2,
                position: { ...f2.position, x: f2.position.x - moveDistance }
              };
            }
          } else {
            // Move apart on Z axis
            const moveDistance = (overlapZ / 2) + collisionMargin;
            if (f1.position.z < f2.position.z) {
              correctedFurnitures[i] = {
                ...f1,
                position: { ...f1.position, z: f1.position.z - moveDistance }
              };
              correctedFurnitures[j] = {
                ...f2,
                position: { ...f2.position, z: f2.position.z + moveDistance }
              };
            } else {
              correctedFurnitures[i] = {
                ...f1,
                position: { ...f1.position, z: f1.position.z + moveDistance }
              };
              correctedFurnitures[j] = {
                ...f2,
                position: { ...f2.position, z: f2.position.z - moveDistance }
              };
            }
          }
          needsUpdate = true;
        }
      }
    }
    
    if (needsUpdate) {
      console.log('🔧 Auto-correcting furniture positions and resolving collisions');
      useEditorStore.setState({ furnitures: correctedFurnitures });
    }
    // Only run when furniture count changes or IDs change, not on every position update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [furnitures.length, furnitures.map(f => f.id).join(','), actualRoomDimensions.width, actualRoomDimensions.depth]);

  useEffect(() => {
    if (transformControlsRef.current && orbitControlsRef.current) {
      const controls = transformControlsRef.current;
      const orbit = orbitControlsRef.current;
      
      const onDraggingChanged = (event: any) => {
        orbit.enabled = !event.value;
      };
      
      controls.addEventListener('dragging-changed', onDraggingChanged);
      
      return () => {
        controls.removeEventListener('dragging-changed', onDraggingChanged);
      };
    }
  }, [selectedFurniture]);

  // Keyboard event handler for deleting furniture
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete or Backspace key
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        e.preventDefault();
        const deleteFurniture = useEditorStore.getState().deleteFurniture;
        
        // Delete all selected furniture
        selectedIds.forEach(id => {
          deleteFurniture(id);
          socketService.emitFurnitureDelete(id);
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedIds]);

  // PNG export handler
  useEffect(() => {
    const handleExportPNG = () => {
      try {
        // Render the scene
        gl.render(scene, camera);
        
        // Get the canvas and convert to data URL
        const canvas = gl.domElement;
        const dataURL = canvas.toDataURL('image/png');
        
        // Create download link
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = `furniture_layout_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        useToastStore.getState().addToast('✓ PNG 내보내기 완료', 'success');
      } catch (error) {
        console.error('PNG export failed:', error);
        useToastStore.getState().addToast('PNG 내보내기 실패', 'error');
      }
    };

    window.addEventListener('exportPNG', handleExportPNG);
    
    return () => {
      window.removeEventListener('exportPNG', handleExportPNG);
    };
  }, [gl, scene, camera]);

  // Lighting configuration based on time of day
  const lightingConfig = {
    morning: {
      position: [10, 10, 5] as [number, number, number],
      intensity: 1.2,
      color: '#FFFACD',
      ambient: 0.4,
    },
    afternoon: {
      position: [0, 10, 0] as [number, number, number],
      intensity: 1.5,
      color: '#FFFFFF',
      ambient: 0.6,
    },
    evening: {
      position: [-10, 5, 5] as [number, number, number],
      intensity: 0.8,
      color: '#FFB347',
      ambient: 0.3,
    },
    night: {
      position: [0, 5, 0] as [number, number, number],
      intensity: 0.3,
      color: '#4169E1',
      ambient: 0.1,
    },
  };

  const lighting = lightingConfig[timeOfDay];

  const handleCanvasClick = (e: any) => {
    if (measureMode === 'none') return;

    // Calculate intersection with ground plane
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectPoint);

    if (intersectPoint) {
      addMeasurePoint({ x: intersectPoint.x, y: 0, z: intersectPoint.z });
    }
  };

  return (
    <>
      {/* Strong ambient light for base illumination */}
      <ambientLight intensity={0.8} />
      
      {/* Main directional light from above */}
      <directionalLight
        position={[0, 10, 0]}
        intensity={2.0}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      
      {/* Key light (main light source) */}
      <directionalLight
        position={[10, 10, 10]}
        intensity={1.5}
        color="#ffffff"
      />
      
      {/* Fill lights from sides */}
      <directionalLight
        position={[-10, 5, 5]}
        intensity={1.0}
        color="#ffffff"
      />
      <directionalLight
        position={[10, 5, -5]}
        intensity={1.0}
        color="#ffffff"
      />
      
      {/* Back light */}
      <directionalLight
        position={[0, 5, -10]}
        intensity={0.8}
        color="#ffffff"
      />
      
      {/* Hemisphere light for natural sky/ground lighting */}
      <hemisphereLight
        args={['#ffffff', '#888888', 1.0]}
      />

      <Grid
        args={[20, 20]}
        cellSize={0.5}
        sectionSize={1}
        fadeDistance={30}
        fadeStrength={1}
        cellColor="#6b7280"
        sectionColor="#374151"
      />

      {/* Show 3D model (PLY or GLB) if available, otherwise show default room */}
      {projectId && fileType === 'glb' ? (
        <GlbModel 
          projectId={projectId} 
          glbFilePath={plyFilePath}
          roomDimensions={actualRoomDimensions}
          onRoomDimensionsChange={onRoomDimensionsChange}
        />
      ) : projectId && (fileType === 'ply' || hasPlyFile) ? (
        <PlyModel 
          projectId={projectId} 
          plyFilePath={plyFilePath}
          roomDimensions={actualRoomDimensions}
          onRoomDimensionsChange={onRoomDimensionsChange}
        />
      ) : (
        <Room roomDimensions={actualRoomDimensions} />
      )}

      {furnitures.map((furniture) => (
        <Furniture key={furniture.id} {...furniture} />
      ))}

      {/* Measurement points */}
      {measurePoints.map((point, i) => (
        <mesh key={i} position={[point.x, 0.1, point.z]}>
          <sphereGeometry args={[0.1]} />
          <meshBasicMaterial color="#ff0000" />
        </mesh>
      ))}

      {/* Distance line */}
      {measureMode === 'distance' && measurePoints.length === 2 && (
        <Line
          points={[
            [measurePoints[0].x, 0.1, measurePoints[0].z],
            [measurePoints[1].x, 0.1, measurePoints[1].z],
          ]}
          color="#00ff00"
          lineWidth={2}
        />
      )}

      <OrbitControls
        ref={orbitControlsRef}
        target={new THREE.Vector3(0, 1, 0)}
        enableDamping
        dampingFactor={0.05}
        maxPolarAngle={Math.PI / 2}
        minDistance={0.5}
        maxDistance={50}
      />

      {selectedFurniture && (
        <TransformControls
          ref={transformControlsRef}
          object={scene.getObjectByName(selectedFurniture.id) as any}
          mode={transformMode}
          showY={selectedFurniture.mountType === 'wall' || transformMode !== 'translate'}
          showX={transformMode !== 'rotate'}
          showZ={transformMode !== 'rotate'}
          onMouseDown={() => {
            // Store current position before dragging starts
            if (selectedFurniture) {
              previousPositionRef.current = { ...selectedFurniture.position };
              console.log('🖱️ Mouse down on furniture:', {
                id: selectedFurniture.id,
                type: selectedFurniture.type,
                mountType: selectedFurniture.mountType,
                position: selectedFurniture.position,
                showY: selectedFurniture.mountType === 'wall' || transformMode !== 'translate'
              });
            }
          }}
          onObjectChange={(e?: any) => {
            if (e && e.target && e.target.object) {
              const obj = e.target.object as THREE.Object3D;
              
              console.log('🔄 onObjectChange:', {
                mountType: selectedFurniture.mountType,
                transformMode,
                currentY: obj.position.y,
                furnitureId: selectedFurniture.id
              });
              
              // Handle Y position based on mount type
              if (selectedFurniture.mountType === 'wall') {
                // Wall-mounted items: allow Y movement, but keep within room height
                const maxHeight = actualRoomDimensions.height - selectedFurniture.dimensions.height / 2;
                const minHeight = selectedFurniture.dimensions.height / 2;
                const newY = Math.max(minHeight, Math.min(maxHeight, obj.position.y));
                console.log('🔼 Wall item Y adjustment:', {
                  before: obj.position.y,
                  after: newY,
                  minHeight,
                  maxHeight
                });
                obj.position.y = newY;
              } else {
                // Floor items: keep on ground
                const groundY = selectedFurniture.dimensions.height / 2;
                console.log('⬇️ Floor item Y fixed to:', groundY);
                obj.position.y = groundY;
              }
              
              // For rotate mode, only allow Y-axis rotation (left-right)
              if (transformMode === 'rotate') {
                // Lock X and Z rotation to 0
                obj.rotation.x = 0;
                obj.rotation.z = 0;
              }
              
              // For translate mode, also check boundaries and collisions
              if (transformMode === 'translate') {
                let snappedPos = { x: obj.position.x, y: obj.position.y, z: obj.position.z };
                
                const halfWidth = selectedFurniture.dimensions.width / 2;
                const halfDepth = selectedFurniture.dimensions.depth / 2;
                
                // Wall-mounted items: snap to walls (keep Y position)
                if (selectedFurniture.mountType === 'wall' && !usePlyBoundaries) {
                  const wallSnapThreshold = 0.5; // Snap within 50cm of wall
                  const roomHalfWidth = actualRoomDimensions.width / 2;
                  const roomHalfDepth = actualRoomDimensions.depth / 2;
                  const wallOffset = 0.05; // 5cm from wall surface
                  
                  console.log('🔍 Wall snap check:', {
                    currentPos: snappedPos,
                    roomHalfWidth,
                    roomHalfDepth
                  });
                  
                  // Check distance to each wall
                  const distToNorth = Math.abs(snappedPos.z + roomHalfDepth);
                  const distToSouth = Math.abs(snappedPos.z - roomHalfDepth);
                  const distToWest = Math.abs(snappedPos.x + roomHalfWidth);
                  const distToEast = Math.abs(snappedPos.x - roomHalfWidth);
                  
                  console.log('Wall distances:', { distToNorth, distToSouth, distToWest, distToEast });
                  
                  // Snap to nearest wall
                  const minDist = Math.min(distToNorth, distToSouth, distToWest, distToEast);
                  
                  if (minDist < wallSnapThreshold) {
                    const beforeY = snappedPos.y;
                    if (minDist === distToNorth) {
                      snappedPos.z = -roomHalfDepth + wallOffset;
                      console.log('📍 Snapped to north wall, Y preserved:', beforeY);
                    } else if (minDist === distToSouth) {
                      snappedPos.z = roomHalfDepth - wallOffset;
                      console.log('📍 Snapped to south wall, Y preserved:', beforeY);
                    } else if (minDist === distToWest) {
                      snappedPos.x = -roomHalfWidth + wallOffset;
                      console.log('📍 Snapped to west wall, Y preserved:', beforeY);
                    } else if (minDist === distToEast) {
                      snappedPos.x = roomHalfWidth - wallOffset;
                      console.log('📍 Snapped to east wall, Y preserved:', beforeY);
                    }
                    // Ensure Y is preserved
                    snappedPos.y = beforeY;
                  }
                }
                
                // Floor items: snap to nearby furniture edges
                const snapThreshold = 0.2; // Snap within 20cm
                
                let snappedX = false;
                let snappedZ = false;
                
                for (const other of furnitures) {
                  if (selectedFurniture.id === other.id) continue;
                  
                  const otherHalfWidth = other.dimensions.width / 2;
                  const otherHalfDepth = other.dimensions.depth / 2;
                  
                  const otherLeft = other.position.x - otherHalfWidth;
                  const otherRight = other.position.x + otherHalfWidth;
                  const otherBack = other.position.z - otherHalfDepth;
                  const otherFront = other.position.z + otherHalfDepth;
                  
                  // Snap X axis (left-right alignment) - only if not already snapped
                  if (!snappedX) {
                    // My right edge to other's left edge
                    const myRight = snappedPos.x + halfWidth;
                    const distToLeft = Math.abs(myRight - otherLeft);
                    if (distToLeft < snapThreshold) {
                      snappedPos.x = otherLeft - halfWidth;
                      snappedX = true;
                      console.log('📍 Snapped right edge to left edge', { distToLeft: distToLeft.toFixed(3) });
                    }
                    
                    // My left edge to other's right edge
                    const myLeft = snappedPos.x - halfWidth;
                    const distToRight = Math.abs(myLeft - otherRight);
                    if (!snappedX && distToRight < snapThreshold) {
                      snappedPos.x = otherRight + halfWidth;
                      snappedX = true;
                      console.log('📍 Snapped left edge to right edge', { distToRight: distToRight.toFixed(3) });
                    }
                  }
                  
                  // Snap Z axis (front-back alignment) - only if not already snapped
                  if (!snappedZ) {
                    // My front edge to other's back edge
                    const myFront = snappedPos.z + halfDepth;
                    const distToBack = Math.abs(myFront - otherBack);
                    if (distToBack < snapThreshold) {
                      snappedPos.z = otherBack - halfDepth;
                      snappedZ = true;
                      console.log('📍 Snapped front edge to back edge', { distToBack: distToBack.toFixed(3) });
                    }
                    
                    // My back edge to other's front edge
                    const myBack = snappedPos.z - halfDepth;
                    const distToFront = Math.abs(myBack - otherFront);
                    if (!snappedZ && distToFront < snapThreshold) {
                      snappedPos.z = otherFront + halfDepth;
                      snappedZ = true;
                      console.log('📍 Snapped back edge to front edge', { distToFront: distToFront.toFixed(3) });
                    }
                  }
                }
                
                // Apply snapped position (preserve Y for wall items)
                obj.position.x = snappedPos.x;
                obj.position.y = snappedPos.y;
                obj.position.z = snappedPos.z;
                
                // Push furniture inside walls if it's outside (instead of reverting)
                if (!usePlyBoundaries) {
                  const halfWidth = selectedFurniture.dimensions.width / 2;
                  const halfDepth = selectedFurniture.dimensions.depth / 2;
                  const roomHalfWidth = actualRoomDimensions.width / 2;
                  const roomHalfDepth = actualRoomDimensions.depth / 2;
                  
                  let correctedPos = { ...snappedPos };
                  let wasCorrected = false;
                  
                  // Check and correct X position
                  const furnitureMinX = correctedPos.x - halfWidth;
                  const furnitureMaxX = correctedPos.x + halfWidth;
                  
                  if (furnitureMinX < -roomHalfWidth) {
                    const penetration = -roomHalfWidth - furnitureMinX;
                    correctedPos.x += penetration;
                    wasCorrected = true;
                  } else if (furnitureMaxX > roomHalfWidth) {
                    const penetration = furnitureMaxX - roomHalfWidth;
                    correctedPos.x -= penetration;
                    wasCorrected = true;
                  }
                  
                  // Check and correct Z position
                  const furnitureMinZ = correctedPos.z - halfDepth;
                  const furnitureMaxZ = correctedPos.z + halfDepth;
                  
                  if (furnitureMinZ < -roomHalfDepth) {
                    const penetration = -roomHalfDepth - furnitureMinZ;
                    correctedPos.z += penetration;
                    wasCorrected = true;
                  } else if (furnitureMaxZ > roomHalfDepth) {
                    const penetration = furnitureMaxZ - roomHalfDepth;
                    correctedPos.z -= penetration;
                    wasCorrected = true;
                  }
                  
                  if (wasCorrected) {
                    obj.position.x = correctedPos.x;
                    obj.position.z = correctedPos.z;
                    snappedPos = correctedPos;
                  }
                }
                
                // Check collision with other furniture (not walls)
                // Skip collision check for wall-mounted items
                let hasCollision = false;
                const penetrationThreshold = 0.02;
                
                if (selectedFurniture.mountType !== 'wall') {
                  for (const other of furnitures) {
                    if (selectedFurniture.id === other.id) continue;
                    
                    // Skip collision check with wall-mounted items
                    if (other.mountType === 'wall') continue;
                  
                  const f1 = {
                    minX: snappedPos.x - selectedFurniture.dimensions.width / 2,
                    maxX: snappedPos.x + selectedFurniture.dimensions.width / 2,
                    minZ: snappedPos.z - selectedFurniture.dimensions.depth / 2,
                    maxZ: snappedPos.z + selectedFurniture.dimensions.depth / 2,
                  };
                  
                  const f2 = {
                    minX: other.position.x - other.dimensions.width / 2,
                    maxX: other.position.x + other.dimensions.width / 2,
                    minZ: other.position.z - other.dimensions.depth / 2,
                    maxZ: other.position.z + other.dimensions.depth / 2,
                  };
                  
                    const overlapX = Math.min(f1.maxX, f2.maxX) - Math.max(f1.minX, f2.minX);
                    const overlapZ = Math.min(f1.maxZ, f2.maxZ) - Math.max(f1.minZ, f2.minZ);
                    
                    if (overlapX > penetrationThreshold && overlapZ > penetrationThreshold) {
                      hasCollision = true;
                      break;
                    }
                  }
                }
                
                if (hasCollision) {
                  // Revert to previous valid position only for furniture collision
                  if (previousPositionRef.current) {
                    obj.position.x = previousPositionRef.current.x;
                    obj.position.y = previousPositionRef.current.y;
                    obj.position.z = previousPositionRef.current.z;
                  }
                  return;
                }
                
                // Update previous position to current valid position
                previousPositionRef.current = snappedPos;
              }
              
              const savedY = selectedFurniture.mountType === 'wall' ? obj.position.y : 0;
              
              console.log('💾 Saving furniture position:', {
                id: selectedFurniture.id,
                mountType: selectedFurniture.mountType,
                objY: obj.position.y,
                savedY,
                position: { x: obj.position.x, y: savedY, z: obj.position.z }
              });
              
              updateFurniture(selectedFurniture.id, {
                position: { 
                  x: obj.position.x, 
                  y: savedY, 
                  z: obj.position.z 
                },
                rotation: {
                  x: 0, // Always 0 for X rotation
                  y: (obj.rotation.y * 180) / Math.PI,
                  z: 0, // Always 0 for Z rotation
                },
                scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
              });
              
              socketService.emitFurnitureMove(
                selectedFurniture.id,
                { x: obj.position.x, y: savedY, z: obj.position.z },
                {
                  x: 0,
                  y: (obj.rotation.y * 180) / Math.PI,
                  z: 0,
                }
              );
            }
          }}
        />
      )}

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        onClick={handleCanvasClick}
        visible={false}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </>
  );
}

export function Scene({ 
  projectId, 
  hasPlyFile, 
  plyFilePath,
  fileType,
  roomDimensions,
  onRoomDimensionsChange
}: { 
  projectId?: number; 
  hasPlyFile?: boolean; 
  plyFilePath?: string;
  fileType?: 'ply' | 'glb' | null;
  roomDimensions?: { width: number; height: number; depth: number };
  onRoomDimensionsChange?: (dims: { width: number; height: number; depth: number }) => void;
}) {
  const addFurniture = useEditorStore((state) => state.addFurniture);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const furnitureData = e.dataTransfer.getData('furniture');
    if (!furnitureData) return;

    try {
      const catalogItem: FurnitureCatalogItem = JSON.parse(furnitureData);
      
      // Set initial position based on mount type
      let initialY = 0;
      if (catalogItem.mountType === 'wall') {
        // Wall-mounted items start at eye level (1.5m)
        initialY = 1.5;
      } else if (catalogItem.mountType === 'surface') {
        // Surface items start slightly above ground
        initialY = 0.5;
      }
      
      const newFurniture: FurnitureItem = {
        id: `${catalogItem.id}-${Date.now()}`,
        type: catalogItem.type,
        position: { x: 0, y: initialY, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        dimensions: catalogItem.dimensions,
        color: catalogItem.color,
        mountType: catalogItem.mountType,
      };

      console.log('➕ Adding furniture:', {
        id: newFurniture.id,
        type: newFurniture.type,
        mountType: newFurniture.mountType,
        initialY,
        catalogMountType: catalogItem.mountType
      });

      addFurniture(newFurniture);
      socketService.emitFurnitureAdd(newFurniture);
    } catch (error) {
      console.error('Failed to add furniture:', error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="w-full h-screen"
    >
      <Canvas 
        camera={{ position: [5, 5, 5], fov: 60 }} 
        shadows
        gl={{ 
          preserveDrawingBuffer: true,
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
          outputColorSpace: THREE.SRGBColorSpace
        }}
      >
        <SceneContent 
          projectId={projectId} 
          hasPlyFile={hasPlyFile} 
          plyFilePath={plyFilePath}
          fileType={fileType}
          roomDimensions={roomDimensions}
          onRoomDimensionsChange={onRoomDimensionsChange}
        />
      </Canvas>
    </div>
  );
}
