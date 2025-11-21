'use client';

import * as THREE from 'three';

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

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial 
          color="#e8e8e8" 
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* Back Wall (North) - Semi-transparent */}
      <mesh position={[0, height / 2, -halfDepth]} receiveShadow castShadow>
        <boxGeometry args={[width, height, wallThickness]} />
        <meshStandardMaterial 
          color="#f0f0f0" 
          roughness={0.8}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Front Wall (South) - Semi-transparent */}
      <mesh position={[0, height / 2, halfDepth]} receiveShadow castShadow>
        <boxGeometry args={[width, height, wallThickness]} />
        <meshStandardMaterial 
          color="#f0f0f0" 
          roughness={0.8}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Left Wall (West) - Semi-transparent */}
      <mesh position={[-halfWidth, height / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[wallThickness, height, depth]} />
        <meshStandardMaterial 
          color="#f0f0f0" 
          roughness={0.8}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Right Wall (East) - Semi-transparent */}
      <mesh position={[halfWidth, height / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[wallThickness, height, depth]} />
        <meshStandardMaterial 
          color="#f0f0f0" 
          roughness={0.8}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Ceiling - Semi-transparent */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, height, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial 
          color="#ffffff" 
          roughness={0.9}
          transparent
          opacity={0.1}
          side={2}
        />
      </mesh>

      {/* Baseboard lines for detail */}
      <lineSegments>
        <edgesGeometry attach="geometry" args={[new THREE.BoxGeometry(width, height, depth)]} />
        <lineBasicMaterial attach="material" color="#999999" linewidth={1} />
      </lineSegments>
    </group>
  );
}
