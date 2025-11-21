'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';

interface PlyModelProps {
  projectId: number;
  plyFilePath?: string;
  roomDimensions?: {
    width: number;
    height: number;
    depth: number;
  };
}

function PlyGeometry({ url, roomDimensions, onDimensionsDetected }: { 
  url: string;
  roomDimensions?: { width: number; height: number; depth: number };
  onDimensionsDetected?: (dims: { width: number; height: number; depth: number }) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadPLY = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('Loading PLY from:', url);
        
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
        loader.load(
          blobUrl,
          (loadedGeometry: THREE.BufferGeometry) => {
            console.log('PLY loaded successfully:', loadedGeometry);
            
            // Clean up blob URL
            URL.revokeObjectURL(blobUrl);
            
            // Center the geometry
            loadedGeometry.computeBoundingBox();
            if (loadedGeometry.boundingBox) {
              const center = new THREE.Vector3();
              loadedGeometry.boundingBox.getCenter(center);
              const size = new THREE.Vector3();
              loadedGeometry.boundingBox.getSize(size);
              
              console.log('PLY Bounding Box:', {
                min: loadedGeometry.boundingBox.min,
                max: loadedGeometry.boundingBox.max,
                center: center,
                size: size
              });
              
              // If room dimensions are all 0, infer from PLY
              if (roomDimensions && 
                  roomDimensions.width === 0 && 
                  roomDimensions.height === 0 && 
                  roomDimensions.depth === 0 &&
                  onDimensionsDetected) {
                const inferredDims = {
                  width: Math.abs(size.x),
                  height: Math.abs(size.y),
                  depth: Math.abs(size.z)
                };
                console.log('Inferred room dimensions from PLY:', inferredDims);
                onDimensionsDetected(inferredDims);
              }
              
              loadedGeometry.translate(-center.x, -center.y, -center.z);
            }
            
            // Compute normals for proper lighting
            loadedGeometry.computeVertexNormals();
            
            console.log('PLY Geometry:', {
              vertices: loadedGeometry.attributes.position?.count || 0,
              hasNormals: !!loadedGeometry.attributes.normal,
              hasColors: !!loadedGeometry.attributes.color
            });
            
            setGeometry(loadedGeometry);
          },
          (progress: ProgressEvent) => {
            console.log('Loading PLY:', (progress.loaded / progress.total * 100).toFixed(2) + '%');
          },
          (err: unknown) => {
            const error = err as Error;
            console.error('Error loading PLY:', error);
            URL.revokeObjectURL(blobUrl);
            setLoadError(error.message || 'Failed to load PLY file');
          }
        );
      } catch (error: any) {
        console.error('Error fetching PLY:', error);
        setLoadError(error.message || 'Failed to fetch PLY file');
      }
    };
    
    loadPLY();
  }, [url, roomDimensions, onDimensionsDetected]);

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

  // Calculate scale to fit the model to room dimensions
  const boundingBox = geometry.boundingBox;
  let scale = 1;
  let position: [number, number, number] = [0, 0, 0];
  
  if (boundingBox && roomDimensions) {
    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    
    // Check if room dimensions are all 0 (will be inferred from PLY)
    const hasRoomDims = roomDimensions.width > 0 || roomDimensions.height > 0 || roomDimensions.depth > 0;
    
    if (hasRoomDims) {
      // Scale PLY to fit the specified room dimensions
      const scaleX = roomDimensions.width / size.x;
      const scaleY = roomDimensions.height / size.y;
      const scaleZ = roomDimensions.depth / size.z;
      
      // Use uniform scale based on the smallest dimension to maintain proportions
      scale = Math.min(scaleX, scaleY, scaleZ);
      
      console.log('PLY Model original size:', size);
      console.log('Room dimensions:', roomDimensions);
      console.log('Scale factors:', { scaleX, scaleY, scaleZ });
      console.log('Final scale (uniform):', scale);
    } else {
      // Room dimensions are 0, use PLY as-is or scale to reasonable size
      const maxDim = Math.max(size.x, size.y, size.z);
      
      if (maxDim > 20) {
        scale = 20 / maxDim;
      } else if (maxDim < 2) {
        scale = 2 / maxDim;
      }
      
      console.log('PLY Model size (auto-scale):', size);
      console.log('PLY Model scale:', scale);
    }
    
    // Position at ground level
    position = [0, 0, 0];
  } else if (boundingBox) {
    // Fallback: scale to fit within reasonable size
    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    
    if (maxDim > 10) {
      scale = 10 / maxDim;
    } else if (maxDim < 1) {
      scale = 1 / maxDim;
    }
    
    console.log('PLY Model size (fallback):', size);
    console.log('PLY Model scale:', scale);
  }

  // Check if this is a point cloud or mesh
  const hasIndices = geometry.index !== null;
  const vertexCount = geometry.attributes.position?.count || 0;
  
  console.log('Rendering PLY:', { hasIndices, vertexCount, scale });

  return (
    <group scale={[scale, scale, scale]} position={position}>
      {/* Render as mesh if it has indices, otherwise as points */}
      {hasIndices ? (
        <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
          <meshStandardMaterial 
            color="#a0b0c0" 
            roughness={0.8}
            metalness={0.1}
            side={THREE.DoubleSide}
            wireframe={false}
            transparent={true}
            opacity={0.7}
          />
        </mesh>
      ) : (
        <points geometry={geometry}>
          <pointsMaterial 
            size={0.02} 
            color="#a0b0c0"
            sizeAttenuation={true}
            transparent={true}
            opacity={0.8}
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
}

export function PlyModel({ projectId, plyFilePath, roomDimensions }: PlyModelProps) {
  const [plyUrl, setPlyUrl] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(true);
  const [detectedDimensions, setDetectedDimensions] = useState<{ width: number; height: number; depth: number } | null>(null);

  useEffect(() => {
    console.log('=== PLY Model Mount ===');
    console.log('Project ID:', projectId);
    console.log('PLY File Path:', plyFilePath);
    
    if (projectId) {
      // Construct the API URL to download the PLY file with auth token
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const token = localStorage.getItem('token');
      const url = `${apiUrl}/files/download-ply/${projectId}`;
      
      console.log('PLY Model - URL:', url);
      console.log('PLY Model - Has Token:', !!token);
      
      setPlyUrl(url);
      
      // Hide debug info after 5 seconds
      setTimeout(() => setShowDebug(false), 5000);
    } else {
      console.log('PLY Model - No project ID');
    }
  }, [projectId, plyFilePath]);

  const handleDimensionsDetected = (dims: { width: number; height: number; depth: number }) => {
    console.log('Dimensions detected from PLY:', dims);
    setDetectedDimensions(dims);
  };

  // Use detected dimensions if room dimensions are all 0
  const effectiveRoomDimensions = roomDimensions && 
    (roomDimensions.width === 0 && roomDimensions.height === 0 && roomDimensions.depth === 0)
    ? detectedDimensions || roomDimensions
    : roomDimensions;

  if (!plyUrl) {
    console.log('PLY Model - No URL, showing placeholder');
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
}
