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
import { useRef, useEffect, useMemo } from 'react';

// Helper function to calculate rotated dimensions (bounding box after rotation)
function getRotatedDimensions(
  dimensions: { width: number; height: number; depth: number },
  rotationY: number
): { width: number; height: number; depth: number } {
  // Normalize rotation to 0-360 degrees
  const degrees = ((rotationY * 180) / Math.PI) % 360;
  const normalizedDegrees = degrees < 0 ? degrees + 360 : degrees;
  
  // For 90 and 270 degrees, width and depth are swapped
  // For 0 and 180 degrees, dimensions stay the same
  // For other angles, calculate bounding box
  
  const is90 = Math.abs(normalizedDegrees - 90) < 1 || Math.abs(normalizedDegrees - 270) < 1;
  const is180 = Math.abs(normalizedDegrees - 180) < 1;
  const is0 = Math.abs(normalizedDegrees) < 1 || Math.abs(normalizedDegrees - 360) < 1;
  
  if (is90) {
    // 90 or 270 degrees: swap width and depth
    return {
      width: dimensions.depth,
      height: dimensions.height,
      depth: dimensions.width
    };
  } else if (is0 || is180) {
    // 0 or 180 degrees: no change
    return {
      width: dimensions.width,
      height: dimensions.height,
      depth: dimensions.depth
    };
  } else {
    // Other angles: calculate bounding box
    const radians = Math.abs(rotationY);
    const sin = Math.abs(Math.sin(radians));
    const cos = Math.abs(Math.cos(radians));
    
    const rotatedWidth = dimensions.width * cos + dimensions.depth * sin;
    const rotatedDepth = dimensions.width * sin + dimensions.depth * cos;
    
    return {
      width: rotatedWidth,
      height: dimensions.height,
      depth: rotatedDepth
    };
  }
}

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
  const dummyObjectsRef = useRef<Array<{ id: string; position: any; dimensions: any; }>>([]);

  const selectedFurniture = selectedIds.length === 1 ? furnitures.find(f => f.id === selectedIds[0]) : null;
  const previousPositionRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const previousRotationRef = useRef<number | null>(null);
  const lastRotationToastTimeRef = useRef<number>(0);
  const ROTATION_TOAST_COOLDOWN = 2000; // 2초 동안 중복 메시지 방지

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
    // Get rotated dimensions for accurate collision detection
    const rotatedDims = getRotatedDimensions(
      furniture.dimensions,
      (furniture.rotation.y * Math.PI) / 180
    );

    const halfWidth = rotatedDims.width / 2;
    const halfDepth = rotatedDims.depth / 2;

    console.log('=== Checking position validity ===', {
      furnitureId: furniture.id,
      newPos,
      originalDimensions: furniture.dimensions,
      rotatedDimensions: rotatedDims,
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

      // Add small margin to prevent furniture from touching walls
      const wallMargin = 0.05; // 5cm margin from walls

      // Calculate furniture edges
      const furnitureMinX = newPos.x - halfWidth;
      const furnitureMaxX = newPos.x + halfWidth;
      const furnitureMinZ = newPos.z - halfDepth;
      const furnitureMaxZ = newPos.z + halfDepth;

      // Calculate room boundaries with margin
      const roomMinX = -roomHalfWidth + wallMargin;
      const roomMaxX = roomHalfWidth - wallMargin;
      const roomMinZ = -roomHalfDepth + wallMargin;
      const roomMaxZ = roomHalfDepth - wallMargin;

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
    
    // Check collision with dummy objects (for L-shaped and other template rooms)
    // First try to find by name
    let dummyGroup = scene.getObjectByName('collision-dummies');

    // If not found, traverse scene to find dummies
    if (!dummyGroup) {
      scene.traverse((obj) => {
        if (obj.name === 'collision-dummies') {
          dummyGroup = obj;
        }
      });
    }

    // Also check for individual dummy objects
    const dummyObjects: any[] = [];
    scene.traverse((obj) => {
      if (obj.userData?.isDummy) {
        dummyObjects.push(obj);
      }
    });

    console.log('🔍 Checking for dummy collision:', {
      groupFound: !!dummyGroup,
      groupChildren: dummyGroup?.children?.length || 0,
      directDummies: dummyObjects.length,
      sceneChildren: scene.children.length
    });

    // Check collision with all dummy objects found
    for (const dummy of dummyObjects) {
      const dummyDims = dummy.userData.dimensions;
      const dummyPos = dummy.userData.position;

      console.log('🔍 Checking collision with dummy:', {
        id: dummy.userData.id,
        dummyPos,
        dummyDims,
        furniturePos: newPos,
        furnitureDims: { width: halfWidth * 2, depth: halfDepth * 2 }
      });

      // Check collision with dummy object
      const f1 = {
        minX: newPos.x - halfWidth,
        maxX: newPos.x + halfWidth,
        minZ: newPos.z - halfDepth,
        maxZ: newPos.z + halfDepth,
      };

      const f2 = {
        minX: dummyPos.x - dummyDims.width / 2,
        maxX: dummyPos.x + dummyDims.width / 2,
        minZ: dummyPos.z - dummyDims.depth / 2,
        maxZ: dummyPos.z + dummyDims.depth / 2,
      };

      // Calculate overlap
      const overlapX = Math.min(f1.maxX, f2.maxX) - Math.max(f1.minX, f2.minX);
      const overlapZ = Math.min(f1.maxZ, f2.maxZ) - Math.max(f1.minZ, f2.minZ);

      console.log('🔍 Collision calculation:', {
        overlapX,
        overlapZ,
        isColliding: overlapX > 0 && overlapZ > 0,
        f1,
        f2
      });

      if (overlapX > 0 && overlapZ > 0) {
        console.log('❌ Collision detected with dummy object:', dummy.userData.id, {
          overlapX: overlapX.toFixed(3),
          overlapZ: overlapZ.toFixed(3),
          f1,
          f2
        });
        return false;
      }
    }

    // Check collision with other furniture
    // Comprehensive 3D collision detection
    const penetrationThreshold = 0.02;

    for (const other of furnitures) {
      if (furniture.id === other.id) continue;
      
      const isWallItem = furniture.mountType === 'wall';
      const isOtherWallItem = other.mountType === 'wall';
      const isSurfaceItem = furniture.mountType === 'surface';
      const isOtherSurfaceItem = other.mountType === 'surface';
      
      // Wall-mounted items and floor items are in different spaces - no collision
      if (isWallItem && !isOtherWallItem && !isOtherSurfaceItem) continue;
      if (!isWallItem && !isSurfaceItem && isOtherWallItem) continue;
      
      // Calculate rotated dimensions for other furniture
      const otherRotatedDims = getRotatedDimensions(
        other.dimensions,
        (other.rotation.y * Math.PI) / 180
      );
      
      const f1 = {
        minX: newPos.x - halfWidth,
        maxX: newPos.x + halfWidth,
        minZ: newPos.z - halfDepth,
        maxZ: newPos.z + halfDepth,
      };
      
      const f2 = {
        minX: other.position.x - otherRotatedDims.width / 2,
        maxX: other.position.x + otherRotatedDims.width / 2,
        minZ: other.position.z - otherRotatedDims.depth / 2,
        maxZ: other.position.z + otherRotatedDims.depth / 2,
      };
      
      // Calculate actual overlap (penetration)
      const overlapX = Math.min(f1.maxX, f2.maxX) - Math.max(f1.minX, f2.minX);
      const overlapZ = Math.min(f1.maxZ, f2.maxZ) - Math.max(f1.minZ, f2.minZ);
      
      // Y-axis (height) collision check
      let overlapY = false;
      
      if (isWallItem && isOtherWallItem) {
        // Both are wall items: check Y-axis overlap
        const f1MinY = newPos.y - furniture.dimensions.height / 2;
        const f1MaxY = newPos.y + furniture.dimensions.height / 2;
        const f2MinY = other.position.y - other.dimensions.height / 2;
        const f2MaxY = other.position.y + other.dimensions.height / 2;
        
        overlapY = !(f1MaxY < f2MinY || f1MinY > f2MaxY);
      } else if (!isWallItem && !isOtherWallItem) {
        // Both are floor items: check if their height ranges overlap
        const f1MinY = 0;
        const f1MaxY = furniture.dimensions.height;
        const f2MinY = 0;
        const f2MaxY = other.dimensions.height;
        
        overlapY = !(f1MaxY < f2MinY || f1MinY > f2MaxY);
      } else if (isSurfaceItem || isOtherSurfaceItem) {
        // Surface items: check based on their actual Y position
        const f1MinY = newPos.y - furniture.dimensions.height / 2;
        const f1MaxY = newPos.y + furniture.dimensions.height / 2;
        const f2MinY = other.position.y - other.dimensions.height / 2;
        const f2MaxY = other.position.y + other.dimensions.height / 2;
        
        overlapY = !(f1MaxY < f2MinY || f1MinY > f2MaxY);
      }
      
      // Only reject if there's significant penetration in all axes
      if (overlapX > penetrationThreshold && overlapZ > penetrationThreshold && overlapY) {
        console.log('❌ Collision detected with furniture:', other.id, {
          overlapX: overlapX.toFixed(3),
          overlapZ: overlapZ.toFixed(3),
          overlapY,
          threshold: penetrationThreshold,
          f1,
          f2,
          isWallItem,
          isOtherWallItem
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
      // Comprehensive 3D collision detection
      for (const other of furnitures) {
        if (furniture.id === other.id) continue;
        
        const isWallItem = furniture.mountType === 'wall';
        const isOtherWallItem = other.mountType === 'wall';
        const isSurfaceItem = furniture.mountType === 'surface';
        const isOtherSurfaceItem = other.mountType === 'surface';
        
        // Wall-mounted items and floor items are in different spaces - no collision
        if (isWallItem && !isOtherWallItem && !isOtherSurfaceItem) continue;
        if (!isWallItem && !isSurfaceItem && isOtherWallItem) continue;
        
        // Calculate rotated dimensions
        const f1RotatedDims = getRotatedDimensions(
          furniture.dimensions,
          (furniture.rotation.y * Math.PI) / 180
        );
        const f2RotatedDims = getRotatedDimensions(
          other.dimensions,
          (other.rotation.y * Math.PI) / 180
        );
        
        // XZ plane collision check
        const f1 = {
          minX: furniture.position.x - f1RotatedDims.width / 2,
          maxX: furniture.position.x + f1RotatedDims.width / 2,
          minZ: furniture.position.z - f1RotatedDims.depth / 2,
          maxZ: furniture.position.z + f1RotatedDims.depth / 2,
        };
        
        const f2 = {
          minX: other.position.x - f2RotatedDims.width / 2,
          maxX: other.position.x + f2RotatedDims.width / 2,
          minZ: other.position.z - f2RotatedDims.depth / 2,
          maxZ: other.position.z + f2RotatedDims.depth / 2,
        };
        
        // Calculate actual overlap (penetration)
        const overlapX = Math.min(f1.maxX, f2.maxX) - Math.max(f1.minX, f2.minX);
        const overlapZ = Math.min(f1.maxZ, f2.maxZ) - Math.max(f1.minZ, f2.minZ);
        
        // Y-axis (height) collision check
        let overlapY = false;
        
        if (isWallItem && isOtherWallItem) {
          // Both are wall items: check Y-axis overlap
          const f1MinY = furniture.position.y - furniture.dimensions.height / 2;
          const f1MaxY = furniture.position.y + furniture.dimensions.height / 2;
          const f2MinY = other.position.y - other.dimensions.height / 2;
          const f2MaxY = other.position.y + other.dimensions.height / 2;
          
          overlapY = !(f1MaxY < f2MinY || f1MinY > f2MaxY);
        } else if (!isWallItem && !isOtherWallItem) {
          // Both are floor items: check if their height ranges overlap
          const f1MinY = 0;
          const f1MaxY = furniture.dimensions.height;
          const f2MinY = 0;
          const f2MaxY = other.dimensions.height;
          
          overlapY = !(f1MaxY < f2MinY || f1MinY > f2MaxY);
        } else if (isSurfaceItem || isOtherSurfaceItem) {
          // Surface items: check based on their actual Y position
          const f1MinY = furniture.position.y - furniture.dimensions.height / 2;
          const f1MaxY = furniture.position.y + furniture.dimensions.height / 2;
          const f2MinY = other.position.y - other.dimensions.height / 2;
          const f2MaxY = other.position.y + other.dimensions.height / 2;
          
          overlapY = !(f1MaxY < f2MinY || f1MinY > f2MaxY);
        }
        
        // Only mark as colliding if there's significant penetration in all axes
        if (overlapX > penetrationThreshold && overlapZ > penetrationThreshold && overlapY) {
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

  // CRITICAL: This useEffect should NOT modify existing furniture positions
  // It should only check boundaries and collisions, but NOT auto-correct
  // Auto-correction should only happen during user interaction (onObjectChange)
  // 
  // REMOVED: Auto-correction logic that was moving furniture when new items were added
  // This was causing existing furniture to move when new furniture was added
  //
  // The collision detection and boundary checking is now handled in:
  // 1. onObjectChange - when user moves/rotates furniture
  // 2. handleRotate in Furniture.tsx - when user clicks 90deg rotation button
  //
  // This ensures that furniture positions are only modified by user actions,
  // not by automatic background processes

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

  // WebGL Context Loss Prevention and Recovery
  useEffect(() => {
    const canvas = gl.domElement;

    const handleContextLost = (event: Event) => {
      event.preventDefault();

      // Get WebGL debug info
      const glContext = canvas.getContext('webgl2') || canvas.getContext('webgl');
      let debugInfo = 'Unknown';

      if (glContext) {
        const debugRendererInfo = glContext.getExtension('WEBGL_debug_renderer_info');
        if (debugRendererInfo) {
          const renderer = glContext.getParameter(debugRendererInfo.UNMASKED_RENDERER_WEBGL);
          const vendor = glContext.getParameter(debugRendererInfo.UNMASKED_VENDOR_WEBGL);
          debugInfo = `${vendor} - ${renderer}`;
        }
      }

      const memoryInfo = {
        programs: gl.info.programs,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures
      };

      // Log to console
      console.error('⚠️ WebGL Context Lost - attempting recovery...');
      console.error('GPU Info:', debugInfo);
      console.error('Memory info:', memoryInfo);

      // IMPORTANT: Log to file for debugging
      console.error('[WEBGL_CONTEXT_LOST]', {
        timestamp: new Date().toISOString(),
        gpuInfo: debugInfo,
        memory: memoryInfo,
        url: window.location.href,
        userAgent: navigator.userAgent
      });

      useToastStore.getState().addToast('⚠️ 렌더링 컨텍스트 손실 - 복구 중...', 'error');
    };

    const handleContextRestored = () => {
      console.log('✅ WebGL Context Restored');

      // Log to file
      console.log('[WEBGL_CONTEXT_RESTORED]', {
        timestamp: new Date().toISOString()
      });

      useToastStore.getState().addToast('✅ 렌더링 복구 완료', 'success');

      // Re-apply tone mapping settings after context restoration
      gl.toneMapping = THREE.ACESFilmicToneMapping;
      gl.toneMappingExposure = 1.0;
      gl.outputColorSpace = THREE.SRGBColorSpace;
    };

    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

    // Log initial WebGL info
    const webglInfo = {
      maxTextures: gl.capabilities.maxTextures,
      maxVertexTextures: gl.capabilities.maxVertexTextures,
      maxTextureSize: gl.capabilities.maxTextureSize,
      maxCubemapSize: gl.capabilities.maxCubemapSize,
      maxAttributes: gl.capabilities.maxAttributes,
      maxVertexUniforms: gl.capabilities.maxVertexUniforms,
      maxVaryings: gl.capabilities.maxVaryings,
      maxFragmentUniforms: gl.capabilities.maxFragmentUniforms,
      precision: gl.capabilities.precision,
      logarithmicDepthBuffer: gl.capabilities.logarithmicDepthBuffer,
      maxSamples: gl.capabilities.maxSamples
    };

    console.log('📊 WebGL Renderer Info:', webglInfo);

    // IMPORTANT: Log to file for debugging
    console.log('[WEBGL_INIT]', {
      timestamp: new Date().toISOString(),
      capabilities: webglInfo,
      renderer: gl.info.render,
      memory: {
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures
      }
    });

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, [gl]);

  // Lighting configuration based on time of day - memoized to prevent recreation
  // REDUCED lighting intensity to prevent colors from appearing too bright
  const lightingConfig = useMemo(() => ({
    morning: {
      position: [10, 10, 5] as [number, number, number],
      intensity: 1.2,  // Increased for better visibility
      color: '#FFFACD',
      ambient: 0.6,    // Increased for better visibility
    },
    afternoon: {
      position: [0, 10, 0] as [number, number, number],
      intensity: 1.5,  // Increased for better visibility
      color: '#FFFFFF',
      ambient: 0.7,    // Increased for better visibility
    },
    evening: {
      position: [-10, 5, 5] as [number, number, number],
      intensity: 0.8,  // Increased for better visibility
      color: '#FFB347',
      ambient: 0.5,    // Increased for better visibility
    },
    night: {
      position: [0, 5, 0] as [number, number, number],
      intensity: 0.3,  // Increased for better visibility
      color: '#4169E1',
      ambient: 0.3,    // Increased for better visibility
    },
  }), []); // Empty dependency array - config is constant

  const lighting = useMemo(() => {
    const config = lightingConfig[timeOfDay];
    return config;
  }, [timeOfDay, lightingConfig]);

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
      {/* Ambient light - base illumination based on time of day */}
      <ambientLight
        key={`ambient-${timeOfDay}`}
        intensity={lighting.ambient}
      />
      
      {/* Main directional light - primary light source based on time of day */}
      <directionalLight
        key={`main-${timeOfDay}`}
        position={lighting.position}
        intensity={lighting.intensity}
        color={lighting.color}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      
      {/* Key light (main light source) - adjusted based on time of day */}
      <directionalLight
        key={`key-${timeOfDay}`}
        position={[10, 10, 10]}
        intensity={lighting.intensity * 0.8}
        color={lighting.color}
      />
      
      {/* Fill lights from sides - adjusted based on time of day */}
      <directionalLight
        key={`fill1-${timeOfDay}`}
        position={[-10, 5, 5]}
        intensity={lighting.intensity * 0.5}
        color={lighting.color}
      />
      <directionalLight
        key={`fill2-${timeOfDay}`}
        position={[10, 5, -5]}
        intensity={lighting.intensity * 0.5}
        color={lighting.color}
      />
      
      {/* Back light - adjusted based on time of day */}
      <directionalLight
        key={`back-${timeOfDay}`}
        position={[0, 5, -10]}
        intensity={lighting.intensity * 0.4}
        color={lighting.color}
      />
      
      {/* Hemisphere light for natural sky/ground lighting - adjusted based on time of day */}
      <hemisphereLight
        key={`hemisphere-${timeOfDay}`}
        color={lighting.color}
        groundColor={timeOfDay === 'night' ? '#222222' : '#888888'}
        intensity={lighting.ambient * 0.5}
      />

      <Grid
        args={[20, 20]}
        cellSize={0.5}
        sectionSize={1}
        fadeDistance={100}
        fadeStrength={0.5}
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
        <Furniture 
          key={furniture.id} 
          {...furniture} 
          roomDimensions={actualRoomDimensions}
          hasPlyFile={hasPlyFile}
        />
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

      {/* 크기 조절 기능 비활성화 - scale 모드일 때는 TransformControls를 렌더링하지 않음 */}
      {selectedFurniture && transformMode !== 'scale' && (
        <TransformControls
          ref={transformControlsRef}
          object={scene.getObjectByName(selectedFurniture.id) as any}
          mode={transformMode}
          showY={selectedFurniture.mountType === 'wall' || transformMode !== 'translate'}
          showX={transformMode !== 'rotate'}
          showZ={transformMode !== 'rotate'}
          onMouseDown={() => {
            // Store current position and rotation before dragging starts
            if (selectedFurniture) {
              previousPositionRef.current = { ...selectedFurniture.position };
              previousRotationRef.current = selectedFurniture.rotation.y;
              console.log('🖱️ Mouse down on furniture:', {
                id: selectedFurniture.id,
                type: selectedFurniture.type,
                mountType: selectedFurniture.mountType,
                position: selectedFurniture.position,
                rotation: selectedFurniture.rotation.y,
                transformMode,
                showY: selectedFurniture.mountType === 'wall' || transformMode !== 'translate'
              });
            }
          }}
          onObjectChange={(e?: any) => {
            if (e && e.target && e.target.object) {
              const obj = e.target.object as THREE.Object3D;
              
              // Check if rotation has changed (regardless of transform mode)
              const currentRotationDeg = (obj.rotation.y * 180) / Math.PI;
              const previousRotationDeg = previousRotationRef.current !== null 
                ? previousRotationRef.current 
                : selectedFurniture.rotation.y;
              const rotationChanged = Math.abs(currentRotationDeg - previousRotationDeg) > 0.1; // 0.1 degree threshold
              
              const isRotateMode = transformMode === 'rotate';
              
              console.log('🔄 onObjectChange:', {
                mountType: selectedFurniture.mountType,
                transformMode,
                isRotateMode,
                currentY: obj.position.y,
                furnitureId: selectedFurniture.id,
                currentRotation: currentRotationDeg,
                previousRotation: previousRotationDeg,
                rotationChanged,
                position: { x: obj.position.x, y: obj.position.y, z: obj.position.z }
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
              } else if (transformMode === 'translate') {
                // Floor items: only fix Y when actually translating
                const groundY = selectedFurniture.dimensions.height / 2;
                // Check if Y position significantly differs from ground level
                if (Math.abs(obj.position.y - groundY) > 0.01) {
                  console.log('⬇️ Floor item Y adjusted to:', groundY);
                  obj.position.y = groundY;
                }
              }
              
              // CRITICAL: In rotate mode, ALWAYS check boundaries on every change
              // This prevents furniture from penetrating walls when rotating
              // Also check if rotation has changed (for translate mode with rotation)
              const storedRotation = furnitures.find(f => f.id === selectedFurniture.id)?.rotation.y || 0;
              const storedRotationDeg = storedRotation;
              const rotationDiffersFromStored = Math.abs(currentRotationDeg - storedRotationDeg) > 0.1;
              
              // ============================================================
              // CRITICAL: ROTATION BOUNDARY CHECK FOR ROTATE MODE
              // ============================================================
              // In rotate mode, we MUST check boundaries on EVERY onObjectChange call
              // This prevents furniture from penetrating walls when rotating
              // We check BEFORE saving to ensure invalid rotations are never saved
              // ============================================================
              
              // ALWAYS check rotation boundaries if we're in rotate mode
              // This is the most critical check to prevent wall penetration
              if (isRotateMode) {
                console.log('🔄 ========== ROTATE MODE DETECTED ==========');
                console.log('🔄 Starting boundary check for rotation...');
                
                // STEP 1: Lock X and Z rotation to 0 (only Y-axis rotation allowed)
                obj.rotation.x = 0;
                obj.rotation.z = 0;
                
                // STEP 2: Calculate rotated dimensions based on current rotation
                // This is critical: when a rectangular furniture rotates, its bounding box changes
                const rotatedDims = getRotatedDimensions(
                  selectedFurniture.dimensions,
                  obj.rotation.y
                );
                
                const halfWidth = rotatedDims.width / 2;
                const halfDepth = rotatedDims.depth / 2;
                
                console.log('📐 Rotated dimensions calculation:', {
                  furnitureId: selectedFurniture.id,
                  currentRotation: currentRotationDeg,
                  previousRotation: previousRotationDeg,
                  storedRotation: storedRotationDeg,
                  originalDims: selectedFurniture.dimensions,
                  rotatedDims,
                  halfWidth,
                  halfDepth,
                  position: { x: obj.position.x, y: obj.position.y, z: obj.position.z }
                });
                
                // STEP 3: Check room boundaries (for all room types)
                let wouldExceedBounds = false;
                let boundaryDetails: any = {};
                
                if (usePlyBoundaries) {
                  // For PLY files with 0 dimensions, use a very large boundary (50 units)
                  const maxBoundary = 50;
                  const checkX = Math.abs(obj.position.x) + halfWidth > maxBoundary;
                  const checkZ = Math.abs(obj.position.z) + halfDepth > maxBoundary;
                  wouldExceedBounds = checkX || checkZ;
                  
                  boundaryDetails = {
                    type: 'PLY',
                    checkX,
                    checkZ,
                    absX: Math.abs(obj.position.x),
                    absZ: Math.abs(obj.position.z),
                    halfWidth,
                    halfDepth,
                    maxBoundary
                  };
                } else {
                  // For regular rooms, check against actual room dimensions
                  const roomHalfWidth = actualRoomDimensions.width / 2;
                  const roomHalfDepth = actualRoomDimensions.depth / 2;
                  
                  const minX = obj.position.x - halfWidth;
                  const maxX = obj.position.x + halfWidth;
                  const minZ = obj.position.z - halfDepth;
                  const maxZ = obj.position.z + halfDepth;
                  
                  const checkMinX = minX < -roomHalfWidth;
                  const checkMaxX = maxX > roomHalfWidth;
                  const checkMinZ = minZ < -roomHalfDepth;
                  const checkMaxZ = maxZ > roomHalfDepth;
                  
                  wouldExceedBounds = checkMinX || checkMaxX || checkMinZ || checkMaxZ;
                  
                  boundaryDetails = {
                    type: 'ROOM',
                    roomHalfWidth,
                    roomHalfDepth,
                    minX,
                    maxX,
                    minZ,
                    maxZ,
                    checkMinX,
                    checkMaxX,
                    checkMinZ,
                    checkMaxZ
                  };
                }
                
                console.log('🔍 ========== Boundary Check Result ==========');
                console.log('🔍 Would exceed bounds:', wouldExceedBounds);
                console.log('🔍 Boundary details:', boundaryDetails);
                console.log('🔍 Room dimensions:', actualRoomDimensions);
                console.log('🔍 Furniture position:', { x: obj.position.x, y: obj.position.y, z: obj.position.z });
                console.log('🔍 Rotated half dimensions:', { halfWidth, halfDepth });
                console.log('🔍 ============================================');
                
                // STEP 4: Check collision with other furniture using rotated dimensions
                let hasCollision = false;
                let collisionDetails: any = null;
                const penetrationThreshold = 0.02;
                
                for (const other of furnitures) {
                  if (selectedFurniture.id === other.id) continue;
                  
                  const isWallItem = selectedFurniture.mountType === 'wall';
                  const isOtherWallItem = other.mountType === 'wall';
                  const isSurfaceItem = selectedFurniture.mountType === 'surface';
                  const isOtherSurfaceItem = other.mountType === 'surface';
                  
                  // Wall-mounted items and floor items are in different spaces - no collision
                  // Wall items are on walls, floor items are on floor
                  if (isWallItem && !isOtherWallItem && !isOtherSurfaceItem) continue;
                  if (!isWallItem && !isSurfaceItem && isOtherWallItem) continue;
                  
                  // Calculate rotated dimensions for other furniture if needed
                  const otherRotatedDims = getRotatedDimensions(
                    other.dimensions,
                    (other.rotation.y * Math.PI) / 180
                  );
                  
                  // XZ plane collision check
                  const f1 = {
                    minX: obj.position.x - halfWidth,
                    maxX: obj.position.x + halfWidth,
                    minZ: obj.position.z - halfDepth,
                    maxZ: obj.position.z + halfDepth,
                  };
                  
                  const f2 = {
                    minX: other.position.x - otherRotatedDims.width / 2,
                    maxX: other.position.x + otherRotatedDims.width / 2,
                    minZ: other.position.z - otherRotatedDims.depth / 2,
                    maxZ: other.position.z + otherRotatedDims.depth / 2,
                  };
                  
                  const overlapX = Math.min(f1.maxX, f2.maxX) - Math.max(f1.minX, f2.minX);
                  const overlapZ = Math.min(f1.maxZ, f2.maxZ) - Math.max(f1.minZ, f2.minZ);
                  
                  // Y-axis (height) collision check
                  // For wall items: check Y-axis overlap (both must be wall items)
                  // For floor items: check if their height ranges overlap
                  let overlapY = false;
                  
                  if (isWallItem && isOtherWallItem) {
                    // Both are wall items: check Y-axis overlap
                    const f1MinY = obj.position.y - selectedFurniture.dimensions.height / 2;
                    const f1MaxY = obj.position.y + selectedFurniture.dimensions.height / 2;
                    const f2MinY = other.position.y - other.dimensions.height / 2;
                    const f2MaxY = other.position.y + other.dimensions.height / 2;
                    
                    overlapY = !(f1MaxY < f2MinY || f1MinY > f2MaxY);
                  } else if (!isWallItem && !isOtherWallItem) {
                    // Both are floor items: check if their height ranges overlap
                    // Floor items sit on the ground, so check from ground (y=0) to their height
                    const f1MinY = 0; // Floor items start at ground
                    const f1MaxY = selectedFurniture.dimensions.height; // Floor items extend to their height
                    const f2MinY = 0; // Other floor item starts at ground
                    const f2MaxY = other.dimensions.height; // Other floor item extends to its height
                    
                    overlapY = !(f1MaxY < f2MinY || f1MinY > f2MaxY);
                  } else if (isSurfaceItem || isOtherSurfaceItem) {
                    // Surface items: check based on their actual Y position
                    const f1MinY = obj.position.y - selectedFurniture.dimensions.height / 2;
                    const f1MaxY = obj.position.y + selectedFurniture.dimensions.height / 2;
                    const f2MinY = other.position.y - other.dimensions.height / 2;
                    const f2MaxY = other.position.y + other.dimensions.height / 2;
                    
                    overlapY = !(f1MaxY < f2MinY || f1MinY > f2MaxY);
                  }
                  
                  // Collision occurs if XZ overlap AND Y overlap
                  if (overlapX > penetrationThreshold && overlapZ > penetrationThreshold && overlapY) {
                    hasCollision = true;
                    collisionDetails = {
                      otherId: other.id,
                      otherType: other.type,
                      overlapX: overlapX.toFixed(3),
                      overlapZ: overlapZ.toFixed(3),
                      overlapY,
                      f1: { ...f1, minY: isWallItem ? obj.position.y - selectedFurniture.dimensions.height / 2 : 0, maxY: isWallItem ? obj.position.y + selectedFurniture.dimensions.height / 2 : selectedFurniture.dimensions.height },
                      f2: { ...f2, minY: isOtherWallItem ? other.position.y - other.dimensions.height / 2 : 0, maxY: isOtherWallItem ? other.position.y + other.dimensions.height / 2 : other.dimensions.height },
                      isWallItem,
                      isOtherWallItem
                    };
                    console.log('❌ Collision detected with furniture:', collisionDetails);
                    break;
                  }
                }
                
                // STEP 5: If rotation would cause boundary violation or collision, REVERT IT
                if (wouldExceedBounds || hasCollision) {
                  // Revert rotation to previous valid value
                  let prevRotationRad: number;
                  
                  if (previousRotationRef.current !== null) {
                    // Use stored previous rotation (most reliable)
                    prevRotationRad = (previousRotationRef.current * Math.PI) / 180;
                  } else {
                    // Fallback: use stored furniture rotation from state
                    const storedRot = furnitures.find(f => f.id === selectedFurniture.id)?.rotation.y || 0;
                    prevRotationRad = (storedRot * Math.PI) / 180;
                  }
                  
                  // CRITICAL: Revert rotation immediately
                  obj.rotation.y = prevRotationRad;
                  
                  // Show user-friendly error message (with cooldown to prevent spam)
                  const now = Date.now();
                  if (now - lastRotationToastTimeRef.current > ROTATION_TOAST_COOLDOWN) {
                    const reason = wouldExceedBounds ? '벽' : '다른 가구';
                    useToastStore.getState().addToast(`공간이 부족하여 회전할 수 없습니다 (${reason}과 충돌)`, 'error');
                    lastRotationToastTimeRef.current = now;
                  }
                  
                  console.log('❌ ========== ROTATION BLOCKED - REVERTED ==========');
                  console.log('❌ Reason:', wouldExceedBounds ? '벽 충돌' : '가구 충돌');
                  console.log('❌ Would exceed bounds:', wouldExceedBounds);
                  console.log('❌ Has collision:', hasCollision);
                  console.log('❌ Current rotation:', currentRotationDeg);
                  console.log('❌ Previous rotation:', previousRotationRef.current);
                  console.log('❌ Stored rotation:', storedRotationDeg);
                  console.log('❌ Reverted rotation:', (obj.rotation.y * 180) / Math.PI);
                  console.log('❌ Rotated dimensions:', rotatedDims);
                  console.log('❌ Position:', obj.position);
                  console.log('❌ Boundary details:', boundaryDetails);
                  if (collisionDetails) {
                    console.log('❌ Collision details:', collisionDetails);
                  }
                  console.log('❌ ================================================');
                  
                  // CRITICAL: Return early to prevent saving invalid rotation
                  // This ensures updateFurniture is never called with invalid rotation
                  return;
                }
                
                // STEP 6: Rotation is valid - update previous rotation reference
                // This ensures next rotation check uses the correct previous value
                previousRotationRef.current = currentRotationDeg;
                console.log('✅ ========== ROTATION VALID ==========');
                console.log('✅ Rotation Y:', previousRotationRef.current);
                console.log('✅ Rotated dimensions:', rotatedDims);
                console.log('✅ Position:', obj.position);
                console.log('✅ Proceeding to save...');
                console.log('✅ ====================================');
              } else if (rotationChanged || rotationDiffersFromStored) {
                // For translate mode, check rotation boundaries if rotation changed
                // This handles cases where rotation happens in translate mode
                console.log('🔄 Rotation check (TRANSLATE MODE - rotation changed):', {
                  furnitureId: selectedFurniture.id,
                  currentRotation: currentRotationDeg,
                  previousRotation: previousRotationDeg,
                  storedRotation: storedRotationDeg,
                  rotationChanged,
                  rotationDiffersFromStored
                });
                
                // Lock X and Z rotation to 0
                obj.rotation.x = 0;
                obj.rotation.z = 0;
                
                // Calculate rotated dimensions
                const rotatedDims = getRotatedDimensions(
                  selectedFurniture.dimensions,
                  obj.rotation.y
                );
                
                const halfWidth = rotatedDims.width / 2;
                const halfDepth = rotatedDims.depth / 2;
                
                // Check room boundaries
                let wouldExceedBounds = false;
                
                if (usePlyBoundaries) {
                  const maxBoundary = 50;
                  const checkX = Math.abs(obj.position.x) + halfWidth > maxBoundary;
                  const checkZ = Math.abs(obj.position.z) + halfDepth > maxBoundary;
                  wouldExceedBounds = checkX || checkZ;
                } else {
                  const roomHalfWidth = actualRoomDimensions.width / 2;
                  const roomHalfDepth = actualRoomDimensions.depth / 2;
                  
                  const minX = obj.position.x - halfWidth;
                  const maxX = obj.position.x + halfWidth;
                  const minZ = obj.position.z - halfDepth;
                  const maxZ = obj.position.z + halfDepth;
                  
                  wouldExceedBounds = 
                    minX < -roomHalfWidth ||
                    maxX > roomHalfWidth ||
                    minZ < -roomHalfDepth ||
                    maxZ > roomHalfDepth;
                }
                
                // Check collision with other furniture (translate mode - rotation changed)
                // Comprehensive 3D collision detection
                let hasCollision = false;
                const penetrationThreshold = 0.02;
                
                for (const other of furnitures) {
                  if (selectedFurniture.id === other.id) continue;
                  
                  const isWallItem = selectedFurniture.mountType === 'wall';
                  const isOtherWallItem = other.mountType === 'wall';
                  const isSurfaceItem = selectedFurniture.mountType === 'surface';
                  const isOtherSurfaceItem = other.mountType === 'surface';
                  
                  // Wall-mounted items and floor items are in different spaces - no collision
                  if (isWallItem && !isOtherWallItem && !isOtherSurfaceItem) continue;
                  if (!isWallItem && !isSurfaceItem && isOtherWallItem) continue;
                  
                  // Calculate rotated dimensions for other furniture
                  const otherRotatedDims = getRotatedDimensions(
                    other.dimensions,
                    (other.rotation.y * Math.PI) / 180
                  );
                  
                  // XZ plane collision check
                  const f1 = {
                    minX: obj.position.x - halfWidth,
                    maxX: obj.position.x + halfWidth,
                    minZ: obj.position.z - halfDepth,
                    maxZ: obj.position.z + halfDepth,
                  };
                  
                  const f2 = {
                    minX: other.position.x - otherRotatedDims.width / 2,
                    maxX: other.position.x + otherRotatedDims.width / 2,
                    minZ: other.position.z - otherRotatedDims.depth / 2,
                    maxZ: other.position.z + otherRotatedDims.depth / 2,
                  };
                  
                  const overlapX = Math.min(f1.maxX, f2.maxX) - Math.max(f1.minX, f2.minX);
                  const overlapZ = Math.min(f1.maxZ, f2.maxZ) - Math.max(f1.minZ, f2.minZ);
                  
                  // Y-axis (height) collision check
                  let overlapY = false;
                  
                  if (isWallItem && isOtherWallItem) {
                    // Both are wall items: check Y-axis overlap
                    const f1MinY = obj.position.y - selectedFurniture.dimensions.height / 2;
                    const f1MaxY = obj.position.y + selectedFurniture.dimensions.height / 2;
                    const f2MinY = other.position.y - other.dimensions.height / 2;
                    const f2MaxY = other.position.y + other.dimensions.height / 2;
                    
                    overlapY = !(f1MaxY < f2MinY || f1MinY > f2MaxY);
                  } else if (!isWallItem && !isOtherWallItem) {
                    // Both are floor items: check if their height ranges overlap
                    const f1MinY = 0;
                    const f1MaxY = selectedFurniture.dimensions.height;
                    const f2MinY = 0;
                    const f2MaxY = other.dimensions.height;
                    
                    overlapY = !(f1MaxY < f2MinY || f1MinY > f2MaxY);
                  } else if (isSurfaceItem || isOtherSurfaceItem) {
                    // Surface items: check based on their actual Y position
                    const f1MinY = obj.position.y - selectedFurniture.dimensions.height / 2;
                    const f1MaxY = obj.position.y + selectedFurniture.dimensions.height / 2;
                    const f2MinY = other.position.y - other.dimensions.height / 2;
                    const f2MaxY = other.position.y + other.dimensions.height / 2;
                    
                    overlapY = !(f1MaxY < f2MinY || f1MinY > f2MaxY);
                  }
                  
                  // Collision occurs if XZ overlap AND Y overlap
                  if (overlapX > penetrationThreshold && overlapZ > penetrationThreshold && overlapY) {
                    hasCollision = true;
                    break;
                  }
                }
                
                // If rotation would cause boundary violation or collision, revert it
                if (wouldExceedBounds || hasCollision) {
                  const prevRotationRad = previousRotationRef.current !== null 
                    ? (previousRotationRef.current * Math.PI) / 180
                    : (furnitures.find(f => f.id === selectedFurniture.id)?.rotation.y || 0) * Math.PI / 180;
                  
                  obj.rotation.y = prevRotationRad;
                  
                  const reason = wouldExceedBounds ? '벽' : '다른 가구';
                  useToastStore.getState().addToast(`공간이 부족하여 회전할 수 없습니다 (${reason}과 충돌)`, 'error');
                  console.log('❌ Rotation blocked (translate mode):', {
                    wouldExceedBounds,
                    hasCollision,
                    revertedRotation: (obj.rotation.y * 180) / Math.PI
                  });
                  return;
                }
                
                // Rotation is valid
                previousRotationRef.current = currentRotationDeg;
              }
              
              // For translate mode, also check boundaries and collisions
              // ALWAYS use rotated dimensions based on current rotation (not just when rotation changed)
              if (transformMode === 'translate') {
                let snappedPos = { x: obj.position.x, y: obj.position.y, z: obj.position.z };
                
                // ALWAYS calculate rotated dimensions based on current rotation
                // This ensures boundary checking works correctly even if rotationChanged is false
                const rotatedDims = getRotatedDimensions(selectedFurniture.dimensions, obj.rotation.y);
                
                const halfWidth = rotatedDims.width / 2;
                const halfDepth = rotatedDims.depth / 2;
                
                console.log('📐 Translate mode - using dimensions:', {
                  rotationChanged,
                  originalDims: selectedFurniture.dimensions,
                  rotatedDims,
                  currentRotation: currentRotationDeg,
                  previousRotation: previousRotationDeg,
                  halfWidth,
                  halfDepth
                });
                
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
                // Use rotated dimensions for boundary checking
                if (!usePlyBoundaries) {
                  const roomHalfWidth = actualRoomDimensions.width / 2;
                  const roomHalfDepth = actualRoomDimensions.depth / 2;
                  
                  let correctedPos = { ...snappedPos };
                  let wasCorrected = false;
                  
                  // Check and correct X position using rotated dimensions
                  const furnitureMinX = correctedPos.x - halfWidth;
                  const furnitureMaxX = correctedPos.x + halfWidth;
                  
                  if (furnitureMinX < -roomHalfWidth) {
                    const penetration = -roomHalfWidth - furnitureMinX;
                    correctedPos.x += penetration;
                    wasCorrected = true;
                    console.log('🔧 Correcting X position (too far left):', {
                      before: snappedPos.x,
                      after: correctedPos.x,
                      penetration,
                      halfWidth
                    });
                  } else if (furnitureMaxX > roomHalfWidth) {
                    const penetration = furnitureMaxX - roomHalfWidth;
                    correctedPos.x -= penetration;
                    wasCorrected = true;
                    console.log('🔧 Correcting X position (too far right):', {
                      before: snappedPos.x,
                      after: correctedPos.x,
                      penetration,
                      halfWidth
                    });
                  }
                  
                  // Check and correct Z position using rotated dimensions
                  const furnitureMinZ = correctedPos.z - halfDepth;
                  const furnitureMaxZ = correctedPos.z + halfDepth;
                  
                  if (furnitureMinZ < -roomHalfDepth) {
                    const penetration = -roomHalfDepth - furnitureMinZ;
                    correctedPos.z += penetration;
                    wasCorrected = true;
                    console.log('🔧 Correcting Z position (too far back):', {
                      before: snappedPos.z,
                      after: correctedPos.z,
                      penetration,
                      halfDepth
                    });
                  } else if (furnitureMaxZ > roomHalfDepth) {
                    const penetration = furnitureMaxZ - roomHalfDepth;
                    correctedPos.z -= penetration;
                    wasCorrected = true;
                    console.log('🔧 Correcting Z position (too far front):', {
                      before: snappedPos.z,
                      after: correctedPos.z,
                      penetration,
                      halfDepth
                    });
                  }
                  
                  if (wasCorrected) {
                    obj.position.x = correctedPos.x;
                    obj.position.z = correctedPos.z;
                    snappedPos = correctedPos;
                  }
                }
                
                // Check collision with other furniture
                // Comprehensive 3D collision detection considering mount types and heights
                let hasCollision = false;
                const penetrationThreshold = 0.02;
                
                for (const other of furnitures) {
                  if (selectedFurniture.id === other.id) continue;
                  
                  const isWallItem = selectedFurniture.mountType === 'wall';
                  const isOtherWallItem = other.mountType === 'wall';
                  const isSurfaceItem = selectedFurniture.mountType === 'surface';
                  const isOtherSurfaceItem = other.mountType === 'surface';
                  
                  // Wall-mounted items and floor items are in different spaces - no collision
                  // Wall items are on walls, floor items are on floor
                  if (isWallItem && !isOtherWallItem && !isOtherSurfaceItem) continue;
                  if (!isWallItem && !isSurfaceItem && isOtherWallItem) continue;
                  
                  // Calculate rotated dimensions for other furniture
                  const otherRotatedDims = getRotatedDimensions(
                    other.dimensions,
                    (other.rotation.y * Math.PI) / 180
                  );
                  
                  // XZ plane collision check
                  const f1 = {
                    minX: snappedPos.x - halfWidth,
                    maxX: snappedPos.x + halfWidth,
                    minZ: snappedPos.z - halfDepth,
                    maxZ: snappedPos.z + halfDepth,
                  };
                  
                  const f2 = {
                    minX: other.position.x - otherRotatedDims.width / 2,
                    maxX: other.position.x + otherRotatedDims.width / 2,
                    minZ: other.position.z - otherRotatedDims.depth / 2,
                    maxZ: other.position.z + otherRotatedDims.depth / 2,
                  };
                  
                  const overlapX = Math.min(f1.maxX, f2.maxX) - Math.max(f1.minX, f2.minX);
                  const overlapZ = Math.min(f1.maxZ, f2.maxZ) - Math.max(f1.minZ, f2.minZ);
                  
                  // Y-axis (height) collision check
                  let overlapY = false;
                  
                  if (isWallItem && isOtherWallItem) {
                    // Both are wall items: check Y-axis overlap
                    const f1MinY = obj.position.y - selectedFurniture.dimensions.height / 2;
                    const f1MaxY = obj.position.y + selectedFurniture.dimensions.height / 2;
                    const f2MinY = other.position.y - other.dimensions.height / 2;
                    const f2MaxY = other.position.y + other.dimensions.height / 2;
                    
                    overlapY = !(f1MaxY < f2MinY || f1MinY > f2MaxY);
                  } else if (!isWallItem && !isOtherWallItem) {
                    // Both are floor items: check if their height ranges overlap
                    // Floor items sit on the ground, so check from ground (y=0) to their height
                    const f1MinY = 0; // Floor items start at ground
                    const f1MaxY = selectedFurniture.dimensions.height; // Floor items extend to their height
                    const f2MinY = 0; // Other floor item starts at ground
                    const f2MaxY = other.dimensions.height; // Other floor item extends to its height
                    
                    overlapY = !(f1MaxY < f2MinY || f1MinY > f2MaxY);
                  } else if (isSurfaceItem || isOtherSurfaceItem) {
                    // Surface items: check based on their actual Y position
                    const f1MinY = obj.position.y - selectedFurniture.dimensions.height / 2;
                    const f1MaxY = obj.position.y + selectedFurniture.dimensions.height / 2;
                    const f2MinY = other.position.y - other.dimensions.height / 2;
                    const f2MaxY = other.position.y + other.dimensions.height / 2;
                    
                    overlapY = !(f1MaxY < f2MinY || f1MinY > f2MaxY);
                  }
                  
                  // Collision occurs if XZ overlap AND Y overlap
                  if (overlapX > penetrationThreshold && overlapZ > penetrationThreshold && overlapY) {
                    hasCollision = true;
                    console.log('❌ Collision detected (translate mode):', {
                      otherId: other.id,
                      otherType: other.type,
                      overlapX: overlapX.toFixed(3),
                      overlapZ: overlapZ.toFixed(3),
                      overlapY,
                      isWallItem,
                      isOtherWallItem
                    });
                    break;
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
                
                // Update previous rotation if rotation changed in translate mode
                if (rotationChanged) {
                  previousRotationRef.current = currentRotationDeg;
                  console.log('🔄 Translate mode - rotation updated:', {
                    previousRotation: previousRotationDeg,
                    currentRotation: currentRotationDeg
                  });
                }
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
