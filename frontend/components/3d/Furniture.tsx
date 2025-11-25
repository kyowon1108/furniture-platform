'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { useEditorStore } from '@/store/editorStore';
import { useToastStore } from '@/store/toastStore';
import type { FurnitureItem } from '@/types/furniture';

// Helper function to calculate rotated dimensions (bounding box after rotation)
function getRotatedDimensions(
  dimensions: { width: number; height: number; depth: number },
  rotationY: number
): { width: number; height: number; depth: number } {
  // Normalize rotation to 0-360 degrees
  const degrees = rotationY % 360;
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
    const radians = (normalizedDegrees * Math.PI) / 180;
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

// GLB Model component for loading actual 3D models from S3
function GlbFurnitureModel({ glbUrl, dimensions, onClick }: {
  glbUrl: string;
  dimensions: { width: number; height: number; depth: number };
  onClick: (e: any) => void;
}) {
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!glbUrl) return;

    const loader = new GLTFLoader();

    loader.load(
      glbUrl,
      (gltf) => {
        // Calculate bounding box to scale model correctly
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        // Use 1:1 scale - GLB dimensions from catalog should match actual GLB
        // The dimensions were extracted from the GLB itself in split_glb.py
        const scale = 1;

        gltf.scene.scale.setScalar(scale);

        // Center on XZ, align bottom to y=0
        gltf.scene.position.set(
          -center.x,
          -box.min.y, // Align bottom to y=0
          -center.z
        );

        // Enable shadows
        gltf.scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        setModel(gltf.scene);
      },
      undefined,
      (err) => {
        console.error('Failed to load GLB:', glbUrl, err);
        setError('GLB 로드 실패');
      }
    );
  }, [glbUrl, dimensions]);

  if (error || !model) {
    // Fallback to simple box while loading or on error
    return (
      <mesh onClick={onClick} castShadow receiveShadow>
        <boxGeometry args={[dimensions.width, dimensions.height, dimensions.depth]} />
        <meshStandardMaterial color={error ? '#ff0000' : '#888888'} wireframe={!error} />
      </mesh>
    );
  }

  return (
    <group onClick={onClick}>
      <primitive object={model} />
    </group>
  );
}

// Render different furniture types with realistic shapes
function FurnitureModel({ type, dimensions, color, onClick, glbUrl }: any) {
  const { width, height, depth } = dimensions;

  // If glbUrl is provided, render the actual GLB model
  if (glbUrl) {
    return <GlbFurnitureModel glbUrl={glbUrl} dimensions={dimensions} onClick={onClick} />;
  }

  switch (type) {
    case 'bed':
      return (
        <group onClick={onClick}>
          {/* Mattress */}
          <mesh position={[0, -height * 0.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, height * 0.3, depth]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
          {/* Headboard */}
          <mesh position={[0, height * 0.1, -depth * 0.45]} castShadow receiveShadow>
            <boxGeometry args={[width, height * 0.6, depth * 0.1]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
          {/* Legs */}
          {[
            [-width * 0.4, -height * 0.425, -depth * 0.4],
            [width * 0.4, -height * 0.425, -depth * 0.4],
            [-width * 0.4, -height * 0.425, depth * 0.4],
            [width * 0.4, -height * 0.425, depth * 0.4],
          ].map((pos, i) => (
            <mesh key={i} position={pos as [number, number, number]} castShadow>
              <cylinderGeometry args={[0.05, 0.05, height * 0.15]} />
              <meshStandardMaterial color="#4a4a4a" metalness={0.5} />
            </mesh>
          ))}
        </group>
      );

    case 'chair':
      return (
        <group onClick={onClick}>
          {/* Seat */}
          <mesh position={[0, -height * 0.1, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, height * 0.1, depth]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
          {/* Backrest */}
          <mesh position={[0, height * 0.2, -depth * 0.4]} castShadow receiveShadow>
            <boxGeometry args={[width, height * 0.5, depth * 0.1]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
          {/* Legs */}
          {[
            [-width * 0.35, -height * 0.3, -depth * 0.35],
            [width * 0.35, -height * 0.3, -depth * 0.35],
            [-width * 0.35, -height * 0.3, depth * 0.35],
            [width * 0.35, -height * 0.3, depth * 0.35],
          ].map((pos, i) => (
            <mesh key={i} position={pos as [number, number, number]} castShadow>
              <cylinderGeometry args={[0.03, 0.03, height * 0.4]} />
              <meshStandardMaterial color="#4a4a4a" metalness={0.5} />
            </mesh>
          ))}
        </group>
      );

    case 'desk':
    case 'table':
      return (
        <group onClick={onClick}>
          {/* Tabletop */}
          <mesh position={[0, height * 0.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, height * 0.1, depth]} />
            <meshStandardMaterial color={color} roughness={0.6} metalness={0.1} />
          </mesh>
          {/* Legs */}
          {[
            [-width * 0.45, -height * 0.05, -depth * 0.45],
            [width * 0.45, -height * 0.05, -depth * 0.45],
            [-width * 0.45, -height * 0.05, depth * 0.45],
            [width * 0.45, -height * 0.05, depth * 0.45],
          ].map((pos, i) => (
            <mesh key={i} position={pos as [number, number, number]} castShadow>
              <boxGeometry args={[0.08, height * 0.9, 0.08]} />
              <meshStandardMaterial color="#4a4a4a" roughness={0.5} />
            </mesh>
          ))}
        </group>
      );

    case 'wardrobe':
      return (
        <group onClick={onClick}>
          {/* Main body */}
          <mesh position={[0, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
          {/* Door handles */}
          <mesh position={[-width * 0.2, height * 0.1, depth * 0.51]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.1]} />
            <meshStandardMaterial color="#888888" metalness={0.8} />
          </mesh>
          <mesh position={[width * 0.2, height * 0.1, depth * 0.51]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.1]} />
            <meshStandardMaterial color="#888888" metalness={0.8} />
          </mesh>
          {/* Door line */}
          <mesh position={[0, 0, depth * 0.51]}>
            <boxGeometry args={[0.02, height, 0.01]} />
            <meshStandardMaterial color="#333333" />
          </mesh>
        </group>
      );

    case 'sofa':
      return (
        <group onClick={onClick}>
          {/* Seat */}
          <mesh position={[0, -height * 0.15, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, height * 0.3, depth * 0.7]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
          {/* Backrest */}
          <mesh position={[0, height * 0.15, -depth * 0.3]} castShadow receiveShadow>
            <boxGeometry args={[width, height * 0.5, depth * 0.2]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
          {/* Armrests */}
          <mesh position={[-width * 0.45, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[width * 0.1, height * 0.4, depth * 0.7]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
          <mesh position={[width * 0.45, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[width * 0.1, height * 0.4, depth * 0.7]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
        </group>
      );

    case 'shelf':
      return (
        <group onClick={onClick}>
          {/* Shelves */}
          {[0, 0.33, 0.66, 1].map((ratio, i) => (
            <mesh key={i} position={[0, height * ratio - height * 0.5, 0]} castShadow receiveShadow>
              <boxGeometry args={[width, height * 0.05, depth]} />
              <meshStandardMaterial color={color} roughness={0.6} />
            </mesh>
          ))}
          {/* Side panels */}
          <mesh position={[-width * 0.48, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[width * 0.04, height, depth]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
          <mesh position={[width * 0.48, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[width * 0.04, height, depth]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
        </group>
      );

    case 'wall-lamp':
      return (
        <group onClick={onClick}>
          {/* Wall mount */}
          <mesh position={[0, 0, depth * 0.3]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[width * 0.3, width * 0.3, depth * 0.2]} />
            <meshStandardMaterial color="#888888" metalness={0.7} />
          </mesh>
          {/* Lamp shade */}
          <mesh position={[0, 0, -depth * 0.2]} castShadow receiveShadow>
            <coneGeometry args={[width * 0.8, height * 0.6, 8]} />
            <meshStandardMaterial color={color} roughness={0.3} emissive={color} emissiveIntensity={0.3} />
          </mesh>
          {/* Light bulb glow */}
          <pointLight position={[0, -height * 0.2, 0]} color={color} intensity={0.5} distance={2} />
        </group>
      );

    case 'wall-tv':
      return (
        <group onClick={onClick}>
          {/* TV screen */}
          <mesh position={[0, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, height, depth * 0.3]} />
            <meshStandardMaterial color="#000000" roughness={0.1} metalness={0.9} />
          </mesh>
          {/* Screen bezel */}
          <mesh position={[0, 0, -depth * 0.2]}>
            <planeGeometry args={[width * 0.95, height * 0.95]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          {/* Wall mount */}
          <mesh position={[0, 0, depth * 0.4]} castShadow>
            <boxGeometry args={[width * 0.3, height * 0.2, depth * 0.5]} />
            <meshStandardMaterial color="#333333" metalness={0.8} />
          </mesh>
        </group>
      );

    case 'wall-art':
      return (
        <group onClick={onClick}>
          {/* Frame */}
          <mesh position={[0, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
          {/* Picture/canvas */}
          <mesh position={[0, 0, -depth * 0.6]}>
            <planeGeometry args={[width * 0.9, height * 0.9]} />
            <meshStandardMaterial color="#f0f0f0" />
          </mesh>
        </group>
      );

    case 'monitor':
      return (
        <group onClick={onClick}>
          {/* Monitor screen */}
          <mesh position={[0, height * 0.3, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, height * 0.7, depth * 0.3]} />
            <meshStandardMaterial color="#000000" roughness={0.1} metalness={0.9} />
          </mesh>
          {/* Screen display */}
          <mesh position={[0, height * 0.3, -depth * 0.2]}>
            <planeGeometry args={[width * 0.95, height * 0.65]} />
            <meshStandardMaterial color="#1a1a1a" emissive="#0a0a0a" emissiveIntensity={0.2} />
          </mesh>
          {/* Stand/base */}
          <mesh position={[0, -height * 0.1, 0]} castShadow>
            <cylinderGeometry args={[depth * 0.3, depth * 0.4, height * 0.2]} />
            <meshStandardMaterial color="#333333" metalness={0.7} />
          </mesh>
        </group>
      );

    case 'printer':
      return (
        <group onClick={onClick}>
          {/* Main body */}
          <mesh position={[0, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial color={color} roughness={0.5} />
          </mesh>
          {/* Control panel */}
          <mesh position={[0, height * 0.4, depth * 0.51]} castShadow>
            <boxGeometry args={[width * 0.6, height * 0.15, depth * 0.05]} />
            <meshStandardMaterial color="#000000" />
          </mesh>
          {/* Paper tray */}
          <mesh position={[0, -height * 0.3, depth * 0.51]} castShadow>
            <boxGeometry args={[width * 0.8, height * 0.2, depth * 0.1]} />
            <meshStandardMaterial color="#666666" />
          </mesh>
        </group>
      );

    case 'filing-cabinet':
      return (
        <group onClick={onClick}>
          {/* Main body */}
          <mesh position={[0, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
          {/* Drawer handles */}
          {[0.3, -0.3].map((yOffset, i) => (
            <mesh key={i} position={[0, yOffset * height, depth * 0.51]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.03, 0.03, 0.15]} />
              <meshStandardMaterial color="#888888" metalness={0.8} />
            </mesh>
          ))}
          {/* Drawer lines */}
          {[0.3, -0.3].map((yOffset, i) => (
            <mesh key={i} position={[0, yOffset * height, depth * 0.51]}>
              <boxGeometry args={[width * 0.9, 0.02, 0.01]} />
              <meshStandardMaterial color="#333333" />
            </mesh>
          ))}
        </group>
      );

    case 'whiteboard':
      return (
        <group onClick={onClick}>
          {/* Board frame */}
          <mesh position={[0, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial color="#888888" roughness={0.5} />
          </mesh>
          {/* White surface */}
          <mesh position={[0, 0, -depth * 0.6]}>
            <planeGeometry args={[width * 0.95, height * 0.95]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.3} />
          </mesh>
          {/* Marker tray */}
          <mesh position={[0, -height * 0.48, depth * 0.3]} castShadow>
            <boxGeometry args={[width * 0.8, height * 0.05, depth * 0.3]} />
            <meshStandardMaterial color="#666666" />
          </mesh>
        </group>
      );

    case 'clock':
      return (
        <group onClick={onClick}>
          {/* Clock body */}
          <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[width * 0.5, width * 0.5, depth, 32]} />
            <meshStandardMaterial color={color} roughness={0.3} metalness={0.7} />
          </mesh>
          {/* Clock face */}
          <mesh position={[0, 0, -depth * 0.6]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[width * 0.45, 32]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
          {/* Hour hand */}
          <mesh position={[0, 0, -depth * 0.5]} rotation={[Math.PI / 2, 0, Math.PI / 6]}>
            <boxGeometry args={[0.02, width * 0.3, 0.02]} />
            <meshStandardMaterial color="#000000" />
          </mesh>
          {/* Minute hand */}
          <mesh position={[0, 0, -depth * 0.5]} rotation={[Math.PI / 2, 0, Math.PI / 3]}>
            <boxGeometry args={[0.02, width * 0.4, 0.02]} />
            <meshStandardMaterial color="#000000" />
          </mesh>
          {/* Center dot */}
          <mesh position={[0, 0, -depth * 0.4]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, depth * 0.2]} />
            <meshStandardMaterial color="#000000" />
          </mesh>
        </group>
      );

    case 'mirror':
      return (
        <group onClick={onClick}>
          {/* Frame */}
          <mesh position={[0, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial color={color} roughness={0.4} metalness={0.6} />
          </mesh>
          {/* Mirror surface */}
          <mesh position={[0, 0, -depth * 0.6]}>
            <planeGeometry args={[width * 0.9, height * 0.9]} />
            <meshStandardMaterial 
              color="#c0c0c0" 
              roughness={0.1} 
              metalness={0.9}
              envMapIntensity={1}
            />
          </mesh>
        </group>
      );

    case 'shelving-unit':
      return (
        <group onClick={onClick}>
          {/* Shelves */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <mesh key={i} position={[0, height * ratio - height * 0.5, 0]} castShadow receiveShadow>
              <boxGeometry args={[width, height * 0.03, depth]} />
              <meshStandardMaterial color={color} roughness={0.6} />
            </mesh>
          ))}
          {/* Side panels */}
          <mesh position={[-width * 0.48, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[width * 0.04, height, depth]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
          <mesh position={[width * 0.48, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[width * 0.04, height, depth]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
          {/* Back panel */}
          <mesh position={[0, 0, -depth * 0.48]} castShadow receiveShadow>
            <boxGeometry args={[width, height, depth * 0.04]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
        </group>
      );

    case 'desk-lamp':
      return (
        <group onClick={onClick}>
          {/* Base */}
          <mesh position={[0, -height * 0.4, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[width * 0.8, width * 0.8, height * 0.1]} />
            <meshStandardMaterial color="#333333" metalness={0.7} />
          </mesh>
          {/* Arm */}
          <mesh position={[0, -height * 0.1, 0]} castShadow>
            <cylinderGeometry args={[width * 0.1, width * 0.1, height * 0.6]} />
            <meshStandardMaterial color={color} metalness={0.6} />
          </mesh>
          {/* Lamp head */}
          <mesh position={[0, height * 0.3, 0]} castShadow receiveShadow>
            <coneGeometry args={[width * 0.6, height * 0.3, 8]} />
            <meshStandardMaterial color={color} roughness={0.3} emissive={color} emissiveIntensity={0.2} />
          </mesh>
          {/* Light */}
          <pointLight position={[0, height * 0.2, 0]} color="#ffffff" intensity={0.3} distance={1.5} />
        </group>
      );

    case 'decoration':
      return (
        <group onClick={onClick}>
          {/* Vase/pot body */}
          <mesh position={[0, 0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[width * 0.4, width * 0.6, height * 0.7, 16]} />
            <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
          </mesh>
          {/* Top rim */}
          <mesh position={[0, height * 0.35, 0]} castShadow receiveShadow>
            <torusGeometry args={[width * 0.45, width * 0.1, 8, 16]} />
            <meshStandardMaterial color={color} roughness={0.3} />
          </mesh>
        </group>
      );

    default:
      // Fallback to simple box
      return (
        <mesh onClick={onClick} castShadow receiveShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color={color} />
        </mesh>
      );
  }
}

interface FurnitureProps extends FurnitureItem {
  roomDimensions?: { width: number; height: number; depth: number };
  hasPlyFile?: boolean;
}

export function Furniture(props: FurnitureProps) {
  const groupRef = useRef<THREE.Group>(null);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const selectFurniture = useEditorStore((state) => state.selectFurniture);
  const updateFurniture = useEditorStore((state) => state.updateFurniture);
  const furnitures = useEditorStore((state) => state.furnitures);
  const lastToastTimeRef = useRef<number>(0);
  const TOAST_COOLDOWN = 2000; // 2초 동안 중복 메시지 방지

  const isSelected = selectedIds.includes(props.id);
  const color = props.isColliding ? '#ef4444' : props.color || '#3b82f6';

  const handleClick = (e: any) => {
    e.stopPropagation();
    selectFurniture(props.id, e.nativeEvent.ctrlKey || e.nativeEvent.metaKey);
  };

  const handleRotate = (e: any) => {
    e.stopPropagation();
    
    // Rotate 90 degrees clockwise each click
    const currentRotation = props.rotation.y;
    const newRotationY = (currentRotation + 90) % 360;
    
    // Calculate rotated dimensions
    const rotatedDims = getRotatedDimensions(props.dimensions, newRotationY);
    const halfWidth = rotatedDims.width / 2;
    const halfDepth = rotatedDims.depth / 2;
    
    // Check room boundaries
    // Use provided room dimensions or default values
    const roomDims = props.roomDimensions || { width: 10, depth: 8, height: 3 };
    const usePlyBoundaries = props.hasPlyFile && 
      roomDims.width === 0 && 
      roomDims.height === 0 && 
      roomDims.depth === 0;
    
    let wouldExceedBounds = false;
    
    if (usePlyBoundaries) {
      // For PLY files with 0 dimensions, use a very large boundary (50 units)
      const maxBoundary = 50;
      const checkX = Math.abs(props.position.x) + halfWidth > maxBoundary;
      const checkZ = Math.abs(props.position.z) + halfDepth > maxBoundary;
      wouldExceedBounds = checkX || checkZ;
    } else {
      // For regular rooms, check against actual room dimensions
      const roomHalfWidth = roomDims.width / 2;
      const roomHalfDepth = roomDims.depth / 2;
      
      const minX = props.position.x - halfWidth;
      const maxX = props.position.x + halfWidth;
      const minZ = props.position.z - halfDepth;
      const maxZ = props.position.z + halfDepth;
      
      wouldExceedBounds = 
        minX < -roomHalfWidth ||
        maxX > roomHalfWidth ||
        minZ < -roomHalfDepth ||
        maxZ > roomHalfDepth;
    }
    
    // Check collision with other furniture
    let hasCollision = false;
    const penetrationThreshold = 0.02;
    
    for (const other of furnitures) {
      if (props.id === other.id) continue;
      
      const isWallItem = props.mountType === 'wall';
      const isOtherWallItem = other.mountType === 'wall';
      const isSurfaceItem = props.mountType === 'surface';
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
        minX: props.position.x - halfWidth,
        maxX: props.position.x + halfWidth,
        minZ: props.position.z - halfDepth,
        maxZ: props.position.z + halfDepth,
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
        const f1MinY = props.position.y - props.dimensions.height / 2;
        const f1MaxY = props.position.y + props.dimensions.height / 2;
        const f2MinY = other.position.y - other.dimensions.height / 2;
        const f2MaxY = other.position.y + other.dimensions.height / 2;
        
        overlapY = !(f1MaxY < f2MinY || f1MinY > f2MaxY);
      } else if (!isWallItem && !isOtherWallItem) {
        // Both are floor items: check if their height ranges overlap
        const f1MinY = 0;
        const f1MaxY = props.dimensions.height;
        const f2MinY = 0;
        const f2MaxY = other.dimensions.height;
        
        overlapY = !(f1MaxY < f2MinY || f1MinY > f2MaxY);
      } else if (isSurfaceItem || isOtherSurfaceItem) {
        // Surface items: check based on their actual Y position
        const f1MinY = props.position.y - props.dimensions.height / 2;
        const f1MaxY = props.position.y + props.dimensions.height / 2;
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
    
    // If rotation would cause boundary violation or collision, block it
    if (wouldExceedBounds || hasCollision) {
      const now = Date.now();
      // Only show toast if enough time has passed since last toast
      if (now - lastToastTimeRef.current > TOAST_COOLDOWN) {
        const reason = wouldExceedBounds ? '벽' : '다른 가구';
        useToastStore.getState().addToast(`공간이 부족하여 회전할 수 없습니다 (${reason}과 충돌)`, 'error');
        lastToastTimeRef.current = now;
      }
      console.log('❌ Rotation blocked (90deg button):', {
        wouldExceedBounds,
        hasCollision,
        currentRotation,
        newRotationY,
        rotatedDims,
        position: props.position
      });
      return;
    }
    
    // Rotation is valid - proceed with update
    updateFurniture(props.id, {
      rotation: {
        x: 0,
        y: newRotationY,
        z: 0,
      }
    });
  };

  // Position furniture based on mount type
  let finalPosition: [number, number, number];

  if (props.mountType === 'wall') {
    // Wall-mounted items: use Y position directly (height from ground)
    finalPosition = [
      props.position.x,
      props.position.y, // Use actual Y position for wall items
      props.position.z
    ];
  } else if (props.glbUrl) {
    // GLB models: GlbFurnitureModel already aligns bottom to y=0
    // So we don't need to lift by half height
    finalPosition = [
      props.position.x,
      0,
      props.position.z
    ];
  } else {
    // Procedural models: centered around origin, lift by half height
    finalPosition = [
      props.position.x,
      props.dimensions.height / 2,
      props.position.z
    ];
  }

  return (
    <group
      ref={groupRef}
      name={props.id}
      position={finalPosition}
      rotation={[
        0, // X rotation always 0 (no pitch)
        (props.rotation.y * Math.PI) / 180, // Y rotation only (yaw)
        0, // Z rotation always 0 (no roll)
      ]}
      scale={[props.scale.x, props.scale.y, props.scale.z]}
    >
      <FurnitureModel
        type={props.type}
        dimensions={props.dimensions}
        color={color}
        onClick={handleClick}
        glbUrl={props.glbUrl}
      />

      {isSelected && (
        <>
          <lineSegments>
            <boxGeometry args={[props.dimensions.width, props.dimensions.height, props.dimensions.depth]} />
            <edgesGeometry attach="geometry" />
            <lineBasicMaterial color="#fbbf24" linewidth={2} />
          </lineSegments>
          
          {/* Single rotation button - positioned above the furniture */}
          {(() => {
            const buttonHeight = props.dimensions.height + 0.5;
            const buttonSize = 0.4;
            
            return (
              <group position={[0, buttonHeight, 0]}>
                {/* Circular base */}
                <mesh onClick={handleRotate} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[buttonSize, buttonSize, 0.1, 32]} />
                  <meshBasicMaterial color="#4ade80" transparent opacity={0.8} />
                </mesh>
                
                {/* Rotation arrow symbol */}
                <mesh onClick={handleRotate} position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[buttonSize * 0.6, buttonSize * 0.1, 8, 16, Math.PI * 1.5]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
                
                {/* Arrow head */}
                <mesh onClick={handleRotate} position={[buttonSize * 0.6, 0.06, 0]} rotation={[0, 0, Math.PI / 4]}>
                  <coneGeometry args={[buttonSize * 0.2, buttonSize * 0.3, 3]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
              </group>
            );
          })()}
        </>
      )}
    </group>
  );
}
