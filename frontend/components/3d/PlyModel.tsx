'use client';

import { useEffect, useRef, useState, Suspense, useMemo, memo } from 'react';
import { useLoader, useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import { applyAxisCorrectionToGeometry } from '@/lib/axisUtils';

interface PlyModelProps {
  projectId: number;
  plyFilePath?: string;
  roomDimensions?: {
    width: number;
    height: number;
    depth: number;
  };
  onRoomDimensionsChange?: (dims: { width: number; height: number; depth: number }) => void;
}

const PlyGeometry = memo(function PlyGeometry({ url, roomDimensions, onDimensionsDetected }: { 
  url: string;
  roomDimensions?: { width: number; height: number; depth: number };
  onDimensionsDetected?: (dims: { width: number; height: number; depth: number }) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modelOpacity, setModelOpacity] = useState(0.7);
  const [wallOpacities, setWallOpacities] = useState({
    north: 0.7,
    south: 0.7,
    east: 0.7,
    west: 0.7
  });
  
  const { camera } = useThree();
  
  // Use refs to access latest props without triggering re-renders
  const roomDimensionsRef = useRef(roomDimensions);
  const onDimensionsDetectedRef = useRef(onDimensionsDetected);
  
  // Update refs when props change (doesn't trigger re-render)
  useEffect(() => {
    roomDimensionsRef.current = roomDimensions;
    onDimensionsDetectedRef.current = onDimensionsDetected;
  }, [roomDimensions, onDimensionsDetected]);
  
  // Track last opacity update to avoid unnecessary state changes
  const lastOpacityRef = useRef<number>(0.7);
  const frameCountRef = useRef<number>(0);

  // Track camera position and adjust model opacity with wall-specific transparency
  useFrame(() => {
    if (!roomDimensions || !geometry) return;

    // Throttle opacity updates to every 2 frames to reduce re-renders
    frameCountRef.current++;
    if (frameCountRef.current % 2 !== 0) return;

    const cameraPos = camera.position;
    const halfWidth = roomDimensions.width / 2;
    const halfDepth = roomDimensions.depth / 2;
    const height = roomDimensions.height;

    // Check if camera is inside or outside the room
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

    // Base opacity for the model
    const baseOpacity = isInside ? 0.7 : 0.3;

    // Calculate wall-specific opacity (similar to Room.tsx logic)
    const newWallOpacities = {
      north: baseOpacity,
      south: baseOpacity,
      east: baseOpacity,
      west: baseOpacity
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
      // If no wall is blocking (all walls are behind camera), keep base opacity
      const hasBlockingWall = northBlocking || southBlocking || westBlocking || eastBlocking;

      if (hasBlockingWall) {
        // Only make walls in camera's viewing direction transparent
        // Keep base opacity for walls behind camera
        newWallOpacities.north = northBlocking ? 0.18 : baseOpacity;
        newWallOpacities.south = southBlocking ? 0.18 : baseOpacity;
        newWallOpacities.west = westBlocking ? 0.18 : baseOpacity;
        newWallOpacities.east = eastBlocking ? 0.18 : baseOpacity;
      } else {
        // No walls in camera's viewing direction are blocking
        // Keep all walls at base opacity (not transparent)
        newWallOpacities.north = baseOpacity;
        newWallOpacities.south = baseOpacity;
        newWallOpacities.west = baseOpacity;
        newWallOpacities.east = baseOpacity;
      }
    }

    // Smooth transition for wall opacities
    setWallOpacities(prev => ({
      north: prev.north + (newWallOpacities.north - prev.north) * 0.1,
      south: prev.south + (newWallOpacities.south - prev.south) * 0.1,
      east: prev.east + (newWallOpacities.east - prev.east) * 0.1,
      west: prev.west + (newWallOpacities.west - prev.west) * 0.1
    }));

    // For PLY model, use the opacity of walls in camera's viewing direction
    // If any wall in camera's viewing direction is blocking, use lower opacity
    // Otherwise, use base opacity (don't make model transparent if no wall is blocking)
    const hasBlockingWallInView = !isInside && (
      newWallOpacities.north < baseOpacity ||
      newWallOpacities.south < baseOpacity ||
      newWallOpacities.west < baseOpacity ||
      newWallOpacities.east < baseOpacity
    );

    // More visible = 0.18 instead of 0.12 (10% less transparent)
    const targetModelOpacity = hasBlockingWallInView ? 0.18 : baseOpacity;

    // Calculate smoothed opacity
    const currentOpacity = lastOpacityRef.current;
    const newOpacity = currentOpacity + (targetModelOpacity - currentOpacity) * 0.1;

    // Only update state if opacity changed significantly
    // This prevents unnecessary re-renders and material updates
    if (Math.abs(newOpacity - currentOpacity) > 0.001) {
      lastOpacityRef.current = newOpacity;
      setModelOpacity(newOpacity);
    }
  });

  const processGeometry = (loadedGeometry: THREE.BufferGeometry) => {
    // Center the geometry
    loadedGeometry.computeBoundingBox();
    if (loadedGeometry.boundingBox) {
      const center = new THREE.Vector3();
      loadedGeometry.boundingBox.getCenter(center);
      const size = new THREE.Vector3();
      loadedGeometry.boundingBox.getSize(size);

      // Center on X and Z axes, but align bottom to Y=0
      // Don't center Y axis - instead move the bottom (min.y) to origin
      loadedGeometry.translate(-center.x, -loadedGeometry.boundingBox.min.y, -center.z);

      // Apply axis correction BEFORE computing normals
      applyAxisCorrectionToGeometry(loadedGeometry);

      // Recompute bounding box after rotation
      loadedGeometry.computeBoundingBox();
      if (loadedGeometry.boundingBox) {
        const rotatedCenter = new THREE.Vector3();
        loadedGeometry.boundingBox.getCenter(rotatedCenter);
        const rotatedSize = new THREE.Vector3();
        loadedGeometry.boundingBox.getSize(rotatedSize);

        // Re-center on X and Z axes after rotation, keep bottom at Y=0
        loadedGeometry.translate(-rotatedCenter.x, -loadedGeometry.boundingBox.min.y, -rotatedCenter.z);


        // Update inferred dimensions with rotated size
        // Add 20% padding to make the room slightly larger than the model
        const currentRoomDims = roomDimensionsRef.current;
        const currentCallback = onDimensionsDetectedRef.current;

        if (currentRoomDims &&
            currentRoomDims.width === 0 &&
            currentRoomDims.height === 0 &&
            currentRoomDims.depth === 0 &&
            currentCallback) {
          const padding = 1.2; // 20% larger
          const inferredDims = {
            width: Math.abs(rotatedSize.x) * padding,
            height: Math.abs(rotatedSize.y) * padding,
            depth: Math.abs(rotatedSize.z) * padding
          };
          currentCallback(inferredDims);
        }
      }
    }

    // Compute normals for proper lighting (after axis correction)
    if (!loadedGeometry.attributes.normal) {
      loadedGeometry.computeVertexNormals();
    }

    // Handle vertex colors
    if (loadedGeometry.attributes.color) {
      const colors = loadedGeometry.attributes.color;

      // Check if normalization is needed
      const maxValue = Math.max(
        ...Array.from(colors.array).slice(0, Math.min(100, colors.array.length))
      );

      if (maxValue > 1.0) {
        const colorArray = colors.array;
        for (let i = 0; i < colorArray.length; i++) {
          colorArray[i] = colorArray[i] / 255.0;
        }
        colors.needsUpdate = true;
      }
    }
    
    setGeometry(loadedGeometry);
  };

  useEffect(() => {
    // Only load once when URL changes, not when roomDimensions or callbacks change
    if (!url) return;
    
    const loadPLY = async () => {
      try {
        const token = localStorage.getItem('token');

        // Try custom parser first (better face support)
        try {
          const { parsePLYWithFaces } = await import('@/lib/plyParser');
          const loadedGeometry = await parsePLYWithFaces(url, token || '');
          processGeometry(loadedGeometry);
          return;
        } catch (customError) {
          // Custom parser failed, fall back to standard PLYLoader
        }

        // Fallback to standard PLYLoader
        
        // Fetch the PLY file with authentication
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        // Load the PLY from blob URL
        const loader = new PLYLoader();
        
        // IMPORTANT: We need to parse the PLY file manually to get custom attributes
        // PLYLoader only loads standard attributes (position, normal, color, uv)
        // For Gaussian Splatting attributes (f_dc_*, f_rest_*, etc), we need custom parsing
        
        loader.load(
          blobUrl,
          (loadedGeometry: THREE.BufferGeometry) => {
            // Clean up blob URL
            URL.revokeObjectURL(blobUrl);
            processGeometry(loadedGeometry);
          },
          undefined,
          (err: unknown) => {
            // Extract safe error message without circular references
            // CRITICAL: Never use String() on Three.js error objects - they contain circular refs
            let errorMessage = 'Failed to load PLY file';

            try {
              // Priority 1: Extract error.message (most common case)
              if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
                errorMessage = `PLY load failed: ${err.message}`;
              }
              // Priority 2: If error is already a string
              else if (typeof err === 'string') {
                errorMessage = `PLY load failed: ${err}`;
              }
              // Priority 3: Try to get constructor name for debugging
              else if (err && typeof err === 'object' && err.constructor?.name) {
                errorMessage = `PLY load failed: ${err.constructor.name} error occurred`;
              }
              // Priority 4: Fallback (don't try String() on complex objects)
              else {
                errorMessage = 'PLY load failed: Unknown error occurred';
              }
            } catch (extractError) {
              // If even error extraction fails, use generic message
              errorMessage = 'PLY load failed: Error occurred during loading';
            }

            URL.revokeObjectURL(blobUrl);
            setLoadError(errorMessage);
          }
        );
      } catch (error: any) {
        setLoadError(error.message || 'Failed to fetch PLY file');
      }
    };
    
    loadPLY();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]); // Only reload when URL changes

  // Memoize scale calculation to prevent recalculation on every render
  // MUST be called before any conditional returns (React Hooks rules)
  const { scale, position } = useMemo(() => {
    const boundingBox = geometry?.boundingBox;
    let calculatedScale = 1;
    let calculatedPosition: [number, number, number] = [0, 0, 0];
    
    if (boundingBox && roomDimensions) {
      const size = new THREE.Vector3();
      boundingBox.getSize(size);
      
      // Check if room dimensions are all 0 (will be inferred from PLY)
      const hasRoomDims = roomDimensions.width > 0 || roomDimensions.height > 0 || roomDimensions.depth > 0;
      
      if (hasRoomDims) {
        // Scale PLY to match the specified room dimensions
        const scaleX = roomDimensions.width / Math.abs(size.x);
        const scaleY = roomDimensions.height / Math.abs(size.y);
        const scaleZ = roomDimensions.depth / Math.abs(size.z);
        
        calculatedScale = Math.max(scaleX, scaleY, scaleZ) * 1.5;
      } else {
        // Room dimensions are 0, use PLY as-is or scale to reasonable size
        const maxDim = Math.max(Math.abs(size.x), Math.abs(size.y), Math.abs(size.z));
        
        if (maxDim > 20) {
          calculatedScale = 30 / maxDim;
        } else if (maxDim < 2) {
          calculatedScale = 3 / maxDim;
        } else {
          calculatedScale = 1.5;
        }
      }
      
      // Geometry is already aligned with bottom at Y=0, so no Y offset needed
      calculatedPosition = [0, 0, 0];
    } else if (boundingBox) {
      // Fallback: scale to fit within reasonable size
      const size = new THREE.Vector3();
      boundingBox.getSize(size);
      const maxDim = Math.max(Math.abs(size.x), Math.abs(size.y), Math.abs(size.z));
      
      if (maxDim > 10) {
        calculatedScale = 10 / maxDim;
      } else if (maxDim < 1) {
        calculatedScale = 1 / maxDim;
      }
      
      // Geometry is already aligned with bottom at Y=0
      calculatedPosition = [0, 0, 0];
    }
    
    return { scale: calculatedScale, position: calculatedPosition };
  }, [geometry, roomDimensions?.width, roomDimensions?.height, roomDimensions?.depth]);

  if (loadError) {
    return (
      <Html center>
        <div style={{ color: 'red', background: 'white', padding: '10px', borderRadius: '5px' }}>
          PLY 로드 실패: {loadError}
        </div>
      </Html>
    );
  }

  if (!geometry) {
    return (
      <Html center>
        <div style={{ color: 'white', background: 'rgba(0,0,0,0.7)', padding: '10px', borderRadius: '5px' }}>
          PLY 파일 로딩 중...
        </div>
      </Html>
    );
  }

  // Check if this is a point cloud or mesh
  const hasIndices = geometry.index !== null;

  // Check if geometry has vertex colors
  const hasVertexColors = !!geometry.attributes.color;

  return (
    <group scale={[scale, scale, scale]} position={position}>
      {/* Render as mesh if it has indices, otherwise as points */}
      {hasIndices ? (
        <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
          <meshStandardMaterial
            vertexColors={hasVertexColors}
            color={hasVertexColors ? undefined : 0xcccccc}
            toneMapped={false}
            roughness={0.7}
            metalness={0.0}
            side={THREE.DoubleSide}
            wireframe={false}
            flatShading={false}
            transparent={true}
            opacity={modelOpacity}
            depthWrite={false}
            emissive={0x000000}
            emissiveIntensity={0}
          />
        </mesh>
      ) : (
        <points geometry={geometry}>
          <pointsMaterial
            size={0.02}
            vertexColors={hasVertexColors}
            color={hasVertexColors ? undefined : 0xcccccc}
            toneMapped={false}
            sizeAttenuation={true}
          />
        </points>
      )}
      
      {/* Debug: Bounding box helper - scaled room outline */}
      {roomDimensions && roomDimensions.width > 0 && roomDimensions.height > 0 && roomDimensions.depth > 0 && (
        <lineSegments position={[0, roomDimensions.height / 2 / scale, 0]}>
          <edgesGeometry attach="geometry" args={[new THREE.BoxGeometry(
            roomDimensions.width / scale,
            roomDimensions.height / scale,
            roomDimensions.depth / scale
          )]} />
          <lineBasicMaterial attach="material" color="#00ff00" linewidth={2} transparent opacity={0.5} />
        </lineSegments>
      )}
    </group>
  );
});

export const PlyModel = memo(function PlyModel({ projectId, plyFilePath, roomDimensions, onRoomDimensionsChange }: PlyModelProps) {
  const [plyUrl, setPlyUrl] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(true);
  const [detectedDimensions, setDetectedDimensions] = useState<{ width: number; height: number; depth: number } | null>(null);

  useEffect(() => {
    if (projectId) {
      // Construct the API URL to download the PLY file with auth token
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8008/api/v1';
      const url = `${apiUrl}/files/download-ply/${projectId}`;
      setPlyUrl(url);

      // Hide debug info after 5 seconds
      setTimeout(() => setShowDebug(false), 5000);
    }
  }, [projectId, plyFilePath]);

  const handleDimensionsDetected = (dims: { width: number; height: number; depth: number }) => {
    setDetectedDimensions(dims);

    // Notify parent component about the detected dimensions
    if (onRoomDimensionsChange && roomDimensions &&
        roomDimensions.width === 0 && roomDimensions.height === 0 && roomDimensions.depth === 0) {
      onRoomDimensionsChange(dims);
    }
  };

  // Use detected dimensions if room dimensions are all 0
  const effectiveRoomDimensions = roomDimensions && 
    (roomDimensions.width === 0 && roomDimensions.height === 0 && roomDimensions.depth === 0)
    ? detectedDimensions || roomDimensions
    : roomDimensions;

  if (!plyUrl) {
    return (
      <Html center>
        <div style={{ 
          color: 'yellow', 
          background: 'rgba(0,0,0,0.8)', 
          padding: '15px', 
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div>⚠️ PLY 모델 정보 없음</div>
          <div style={{ fontSize: '12px', marginTop: '5px' }}>
            Project ID: {projectId || 'N/A'}
          </div>
        </div>
      </Html>
    );
  }

  return (
    <Suspense fallback={
      <Html center>
        <div style={{ color: 'white', background: 'rgba(0,0,0,0.7)', padding: '10px', borderRadius: '5px' }}>
          PLY 모델 준비 중...
        </div>
      </Html>
    }>
      <group>
        <PlyGeometry 
          url={plyUrl} 
          roomDimensions={effectiveRoomDimensions}
          onDimensionsDetected={handleDimensionsDetected}
        />
      </group>
    </Suspense>
  );
});
