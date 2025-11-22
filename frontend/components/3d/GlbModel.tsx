'use client';

import { useEffect, useRef, useState, Suspense, useMemo, memo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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
  
  // Use refs to access latest props without triggering re-renders
  const roomDimensionsRef = useRef(roomDimensions);
  const onDimensionsDetectedRef = useRef(onDimensionsDetected);
  
  // Update refs when props change (doesn't trigger re-render)
  useEffect(() => {
    roomDimensionsRef.current = roomDimensions;
    onDimensionsDetectedRef.current = onDimensionsDetected;
  }, [roomDimensions, onDimensionsDetected]);

  useEffect(() => {
    // Only load once when URL changes
    if (!url) return;
    
    const loadGLB = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('Loading GLB from:', url);
        
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
            console.log('========================================');
            console.log('🎨 GLB LOADED - DETAILED ANALYSIS');
            console.log('========================================');
            console.log('GLTF:', gltf);
            console.log('Scene:', gltf.scene);
            
            // Clean up blob URL
            URL.revokeObjectURL(blobUrl);
            
            // Get bounding box
            const box = new THREE.Box3().setFromObject(gltf.scene);
            const size = new THREE.Vector3();
            box.getSize(size);
            const center = new THREE.Vector3();
            box.getCenter(center);
            
            console.log('Bounding Box:', {
              min: box.min,
              max: box.max,
              center: center,
              size: size
            });
            
            // Center on X and Z axes, but align bottom to Y=0
            // Don't center Y axis - instead move the bottom (min.y) to origin
            gltf.scene.position.set(-center.x, -box.min.y, -center.z);
            console.log('GLB centered on XZ, bottom aligned to Y=0');
            
            // GLB files are typically already in Y-up format (Three.js standard)
            // So we DON'T apply axis correction for GLB files
            console.log('GLB file - no axis correction needed (already Y-up)');
            
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
              console.log('Using GLB dimensions as room dimensions (1:1 scale):', actualDims);
              currentCallback(actualDims);
            }
            
            // Enable shadows and ensure materials/textures are properly loaded
            console.log('🎨 Processing GLB materials and textures...');
            gltf.scene.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                const mesh = child as THREE.Mesh;
                console.log(`Mesh: ${mesh.name || 'unnamed'}`);
                
                if (mesh.material) {
                  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                  materials.forEach((mat, idx) => {
                    console.log(`  Material ${idx}: ${mat.name || 'unnamed'}`, {
                      type: mat.type,
                      hasMap: 'map' in mat && !!(mat as any).map,
                      hasColor: 'color' in mat,
                      transparent: mat.transparent,
                      opacity: mat.opacity
                    });
                    
                    // Force texture update if exists
                    if ('map' in mat && (mat as any).map) {
                      const texture = (mat as any).map;
                      texture.needsUpdate = true;
                      // Ensure proper color space for textures
                      texture.colorSpace = THREE.SRGBColorSpace;
                      console.log(`    ✅ Texture found and updated`);
                    }
                    
                    // BRIGHTNESS BOOST: Increase overall brightness by 50%
                    
                    // CRITICAL: Disable tone mapping to preserve brightness
                    if ('toneMapped' in mat) {
                      (mat as any).toneMapped = false;
                      console.log(`    🚫 Tone mapping disabled`);
                    }
                    
                    // Method 1: Increase base color brightness significantly
                    if ('color' in mat && (mat as any).color) {
                      const color = (mat as any).color;
                      // Multiply RGB values by 2.0 (100% brighter) since tone mapping is off
                      color.r = Math.min(color.r * 2.0, 1.0);
                      color.g = Math.min(color.g * 2.0, 1.0);
                      color.b = Math.min(color.b * 2.0, 1.0);
                      console.log(`    🔆 Brightness boosted 100%: #${color.getHexString()}`);
                    }
                    
                    // Method 2: Strong emissive lighting (self-illumination)
                    if ('emissive' in mat) {
                      // Copy base color to emissive for strong self-illumination
                      if ('color' in mat && (mat as any).color) {
                        (mat as any).emissive = (mat as any).color.clone().multiplyScalar(0.5);
                      }
                      if ('emissiveIntensity' in mat) {
                        (mat as any).emissiveIntensity = 1.0;
                      }
                      console.log(`    💡 Strong emissive added`);
                    }
                    
                    // Method 3: Reduce roughness for more reflectivity
                    if ('roughness' in mat) {
                      const currentRoughness = (mat as any).roughness || 1.0;
                      (mat as any).roughness = Math.max(currentRoughness * 0.5, 0.2);
                      console.log(`    ✨ Roughness reduced to ${(mat as any).roughness.toFixed(2)}`);
                    }
                    
                    // Ensure material is updated
                    mat.needsUpdate = true;
                    
                    // Log color if available
                    if ('color' in mat && (mat as any).color) {
                      console.log(`    Color: #${(mat as any).color.getHexString()}`);
                    }
                  });
                }
              }
            });
            console.log('✅ GLB materials and textures processed');
            
            console.log('========================================');
            
            setModel(gltf.scene);
          },
          (progress) => {
            console.log('Loading GLB:', (progress.loaded / progress.total * 100).toFixed(2) + '%');
          },
          (err: unknown) => {
            const error = err as Error;
            console.error('Error loading GLB:', error);
            URL.revokeObjectURL(blobUrl);
            setLoadError(error.message || 'Failed to load GLB file');
          }
        );
      } catch (error: any) {
        console.error('Error fetching GLB:', error);
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
    let calculatedScale = 1;
    let calculatedPosition: [number, number, number] = [0, 0, 0];
    
    console.log('GLB Model dimensions:', {
      width: size.x.toFixed(2) + 'm',
      height: size.y.toFixed(2) + 'm',
      depth: size.z.toFixed(2) + 'm',
      scale: '1:1 (preserving real-world scale)'
    });
    
    // Model is already aligned with bottom at Y=0, so no Y offset needed
    calculatedPosition = [0, 0, 0];
    
    return { scale: calculatedScale, position: calculatedPosition };
  }, [model]);

  if (loadError) {
    return (
      <Html center>
        <div style={{ color: 'red', background: 'white', padding: '10px', borderRadius: '5px' }}>
          GLB 로드 실패: {loadError}
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
    console.log('=== GLB Model Mount ===');
    console.log('Project ID:', projectId);
    console.log('GLB File Path:', glbFilePath);
    
    if (projectId) {
      // Construct the API URL to download the GLB file with auth token
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const token = localStorage.getItem('token');
      const url = `${apiUrl}/files/download-3d/${projectId}`;
      
      console.log('GLB Model - URL:', url);
      console.log('GLB Model - Has Token:', !!token);
      
      setGlbUrl(url);
    } else {
      console.log('GLB Model - No project ID');
    }
  }, [projectId, glbFilePath]);

  const handleDimensionsDetected = (dims: { width: number; height: number; depth: number }) => {
    console.log('Dimensions detected from GLB:', dims);
    setDetectedDimensions(dims);
    
    // Notify parent component about the detected dimensions
    if (onRoomDimensionsChange && roomDimensions && 
        roomDimensions.width === 0 && roomDimensions.height === 0 && roomDimensions.depth === 0) {
      console.log('🏠 Updating room dimensions in parent:', dims);
      onRoomDimensionsChange(dims);
    }
  };

  // Use detected dimensions if room dimensions are all 0
  const effectiveRoomDimensions = roomDimensions && 
    (roomDimensions.width === 0 && roomDimensions.height === 0 && roomDimensions.depth === 0)
    ? detectedDimensions || roomDimensions
    : roomDimensions;

  if (!glbUrl) {
    console.log('GLB Model - No URL, showing placeholder');
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
