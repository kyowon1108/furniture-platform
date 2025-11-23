'use client';

import { useEffect, useRef, useState, Suspense, useMemo, memo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { useThree, useFrame } from '@react-three/fiber';

interface GlbModelProps {
  projectId: number;
  glbFilePath?: string;
  roomDimensions?: {
    width: number;
    height: number;
    depth: number;
  };
}

const GlbGeometry = memo(function GlbGeometry({ url, roomDimensions, onDimensionsDetected }: { 
  url: string;
  roomDimensions?: { width: number; height: number; depth: number };
  onDimensionsDetected?: (dims: { width: number; height: number; depth: number }) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const { camera } = useThree();
  
  // Use refs to access latest props without triggering re-renders
  const roomDimensionsRef = useRef(roomDimensions);
  const onDimensionsDetectedRef = useRef(onDimensionsDetected);
  
  // Update refs when props change (doesn't trigger re-render)
  useEffect(() => {
    roomDimensionsRef.current = roomDimensions;
    onDimensionsDetectedRef.current = onDimensionsDetected;
  }, [roomDimensions, onDimensionsDetected]);
  
  // Track last opacity value to avoid unnecessary updates
  const lastOpacityRef = useRef<number>(1.0);

  // Cache materials list to avoid traverse() on every frame
  const materialsListRef = useRef<THREE.Material[]>([]);

  // Build materials list once when model loads
  useEffect(() => {
    if (!model) return;

    const materials: THREE.Material[] = [];
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.push(...mats);

          // Set transparent flag once during initialization
          mats.forEach((mat) => {
            if (!mat.transparent) {
              mat.transparent = true;
              mat.needsUpdate = true;
            }
          });
        }
      }
    });
    materialsListRef.current = materials;

    // Log to console and file
    const logMessage = `GLB model materials cached: ${materials.length} materials`;
    console.log(logMessage);
    console.log('[GLB_MODEL_LOADED]', {
      timestamp: new Date().toISOString(),
      materialsCount: materials.length,
      materialTypes: materials.map(m => m.type).filter((v, i, a) => a.indexOf(v) === i)
    });
  }, [model]);

  // Track camera position and adjust model opacity dynamically with wall-specific transparency
  // OPTIMIZED: Use cached materials list instead of traverse()
  useFrame(() => {
    if (!model || !roomDimensions || materialsListRef.current.length === 0) return;

    const cameraPos = camera.position;
    const halfWidth = roomDimensions.width / 2;
    const halfDepth = roomDimensions.depth / 2;
    const height = roomDimensions.height;

    // Check if camera is inside or outside the room
    const isInside =
      Math.abs(cameraPos.x) < halfWidth &&
      Math.abs(cameraPos.z) < halfDepth &&
      cameraPos.y > 0 && cameraPos.y < height;

    // Base opacity for the model
    const baseOpacity = isInside ? 0.7 : 0.3;

    // Calculate wall-specific opacity (similar to Room.tsx logic)
    let wallOpacity = baseOpacity;

    if (!isInside) {
      // Room center (for direction calculation)
      const roomCenter = new THREE.Vector3(0, height / 2, 0);

      // Direction from camera to room center
      const directionToRoom = new THREE.Vector3()
        .subVectors(roomCenter, cameraPos)
        .normalize();

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
        north: new THREE.Vector3(0, 0, 1),
        south: new THREE.Vector3(0, 0, -1),
        west: new THREE.Vector3(1, 0, 0),
        east: new THREE.Vector3(-1, 0, 0)
      };

      // Check each wall: is it in the camera's viewing direction?
      const checkWall = (wallPos: THREE.Vector3, wallNormal: THREE.Vector3) => {
        const toWall = new THREE.Vector3().subVectors(wallPos, cameraPos).normalize();
        const isInFront = cameraDirection.dot(toWall) > 0;
        const ray = new THREE.Ray(cameraPos, directionToRoom);
        const wallPlane = new THREE.Plane();
        wallPlane.setFromNormalAndCoplanarPoint(wallNormal, wallPos);
        const intersect = new THREE.Vector3();
        const intersects = ray.intersectPlane(wallPlane, intersect);
        return isInFront && intersects;
      };

      const hasBlockingWallInView =
        checkWall(wallPositions.north, wallNormals.north) ||
        checkWall(wallPositions.south, wallNormals.south) ||
        checkWall(wallPositions.west, wallNormals.west) ||
        checkWall(wallPositions.east, wallNormals.east);

      if (hasBlockingWallInView) {
        wallOpacity = 0.18;
      }
    }

    // Calculate target opacity with smoothing
    const currentOpacity = lastOpacityRef.current;
    const targetOpacity = wallOpacity;
    const newOpacity = currentOpacity + (targetOpacity - currentOpacity) * 0.1;

    // Only update materials if opacity actually changed significantly
    if (Math.abs(newOpacity - currentOpacity) > 0.001) {
      lastOpacityRef.current = newOpacity;

      // CRITICAL: Use cached materials list instead of traverse()
      // This prevents creating new objects every frame and causing memory pressure
      materialsListRef.current.forEach((mat) => {
        mat.opacity = newOpacity;
      });
    }
  });

  useEffect(() => {
    // Only load once when URL changes
    if (!url) return;
    
    const loadGLB = async () => {
      try {
        const token = localStorage.getItem('token');

        // Fetch the GLB file with authentication
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
        
        // Load the GLB from blob URL
        const loader = new GLTFLoader();
        
        loader.load(
          blobUrl,
          (gltf) => {
            // GLB loaded successfully
            // Don't log gltf object - it contains circular references (GLTFParser -> plugins -> extensions -> parser)

            // Clean up blob URL
            URL.revokeObjectURL(blobUrl);

            // Get bounding box
            const box = new THREE.Box3().setFromObject(gltf.scene);
            const size = new THREE.Vector3();
            box.getSize(size);
            const center = new THREE.Vector3();
            box.getCenter(center);

            // Center on X and Z axes, but align bottom to Y=0
            // Don't center Y axis - instead move the bottom (min.y) to origin
            gltf.scene.position.set(-center.x, -box.min.y, -center.z);

            // GLB files are typically already in Y-up format (Three.js standard)
            // So we DON'T apply axis correction for GLB files

            // Always use GLB dimensions as the room dimensions
            // GLB files contain accurate real-world measurements
            const currentCallback = onDimensionsDetectedRef.current;

            if (currentCallback) {
              // Use actual GLB dimensions without padding
              // The GLB already represents the real room
              const actualDims = {
                width: Math.abs(size.x),
                height: Math.abs(size.y),
                depth: Math.abs(size.z)
              };
              currentCallback(actualDims);
            }

            // Enable shadows and ensure materials/textures are properly loaded
            gltf.scene.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                const mesh = child as THREE.Mesh;

                if (mesh.material) {
                  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                  materials.forEach((mat) => {
                    // Force texture update if exists
                    if ('map' in mat && (mat as any).map) {
                      const texture = (mat as any).map;
                      texture.needsUpdate = true;
                      // Ensure proper color space for textures
                      texture.colorSpace = THREE.SRGBColorSpace;
                    }

                    // ========================================
                    // MATERIAL SETTINGS FOR ACCURATE COLOR REPRODUCTION
                    // ========================================

                    // CRITICAL: Disable tone mapping on materials to preserve original colors
                    // The scene-level tone mapping (ACESFilmic) would alter the colors
                    // For accurate color reproduction, materials should bypass tone mapping
                    if ('toneMapped' in mat) {
                      (mat as any).toneMapped = false;
                    }

                    // Remove any emissive lighting to ensure materials respond to scene lights
                    // Emissive makes objects self-illuminated and prevents proper lighting simulation
                    if ('emissive' in mat) {
                      if ((mat as any).emissive) {
                        // Reset emissive to black (no self-illumination)
                        if ((mat as any).emissive.isColor) {
                          (mat as any).emissive.setHex(0x000000);
                        } else {
                          (mat as any).emissive = new THREE.Color(0x000000);
                        }
                      }
                      // Set emissive intensity to 0
                      if ('emissiveIntensity' in mat) {
                        (mat as any).emissiveIntensity = 0;
                      }
                    }


                    // Ensure material is updated
                    mat.needsUpdate = true;
                  });
                }
              }
            });
            
            setModel(gltf.scene);
          },
          undefined,
          (err: unknown) => {
            // Extract safe error message without circular references
            // CRITICAL: Never use String() on Three.js error objects - they contain circular refs
            let errorMessage = 'Failed to load GLB file';

            try {
              // Priority 1: Extract error.message (most common case)
              if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
                errorMessage = `GLB load failed: ${err.message}`;
              }
              // Priority 2: If error is already a string
              else if (typeof err === 'string') {
                errorMessage = `GLB load failed: ${err}`;
              }
              // Priority 3: Try to get constructor name for debugging
              else if (err && typeof err === 'object' && err.constructor?.name) {
                errorMessage = `GLB load failed: ${err.constructor.name} error occurred`;
              }
              // Priority 4: Fallback (don't try String() on complex objects)
              else {
                errorMessage = 'GLB load failed: Unknown error occurred';
              }
            } catch (extractError) {
              // If even error extraction fails, use generic message
              errorMessage = 'GLB load failed: Error occurred during loading';
            }

            URL.revokeObjectURL(blobUrl);
            setLoadError(errorMessage);
          }
        );
      } catch (error: any) {
        setLoadError(error.message || 'Failed to fetch GLB file');
      }
    };
    
    loadGLB();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]); // Only reload when URL changes

  // Memoize scale calculation to prevent recalculation on every render
  // MUST be called before any conditional returns (React Hooks rules)
  const { scale, position } = useMemo(() => {
    if (!model) return { scale: 1, position: [0, 0, 0] as [number, number, number] };
    
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    
    // GLB files contain real-world scale information
    // We should preserve the original scale (1:1) and not distort it
    const calculatedScale = 1;
    const calculatedPosition: [number, number, number] = [0, 0, 0];

    return { scale: calculatedScale, position: calculatedPosition };
  }, [model]);

  if (loadError) {
    // Extract safe error message
    let displayError = loadError;
    if (typeof loadError === 'object' && loadError !== null) {
      if ('message' in loadError) {
        displayError = String(loadError.message);
      } else {
        displayError = String(loadError);
      }
    }
    
    return (
      <Html center>
        <div style={{ 
          color: 'red', 
          background: 'white', 
          padding: '15px', 
          borderRadius: '5px',
          maxWidth: '500px',
          wordBreak: 'break-word',
          fontSize: '14px',
          lineHeight: '1.5',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>❌ GLB 로드 실패</div>
          <div style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{displayError}</div>
        </div>
      </Html>
    );
  }

  if (!model) {
    return (
      <Html center>
        <div style={{ color: 'white', background: 'rgba(0,0,0,0.7)', padding: '10px', borderRadius: '5px' }}>
          GLB 파일 로딩 중...
        </div>
      </Html>
    );
  }

  return (
    <group ref={groupRef} scale={[scale, scale, scale]} position={position}>
      <primitive object={model} />
    </group>
  );
});

export const GlbModel = memo(function GlbModel({ projectId, glbFilePath, roomDimensions, onRoomDimensionsChange }: GlbModelProps & { 
  onRoomDimensionsChange?: (dims: { width: number; height: number; depth: number }) => void;
}) {
  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const [detectedDimensions, setDetectedDimensions] = useState<{ width: number; height: number; depth: number } | null>(null);

  useEffect(() => {
    if (projectId) {
      // Construct the API URL to download the GLB file with auth token
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8008/api/v1';
      const url = `${apiUrl}/files/download-3d/${projectId}`;
      setGlbUrl(url);
    }
  }, [projectId, glbFilePath]);

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

  if (!glbUrl) {
    return (
      <Html center>
        <div style={{ 
          color: 'yellow', 
          background: 'rgba(0,0,0,0.8)', 
          padding: '15px', 
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div>⚠️ GLB 모델 정보 없음</div>
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
          GLB 모델 준비 중...
        </div>
      </Html>
    }>
      <group>
        <GlbGeometry 
          url={glbUrl} 
          roomDimensions={effectiveRoomDimensions}
          onDimensionsDetected={handleDimensionsDetected}
        />
      </group>
    </Suspense>
  );
});
