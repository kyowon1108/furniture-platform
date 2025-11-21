'use client';

import { useRef } from 'react';
import * as THREE from 'three';
import { useEditorStore } from '@/store/editorStore';
import type { FurnitureItem } from '@/types/furniture';

// Render different furniture types with realistic shapes
function FurnitureModel({ type, dimensions, color, onClick }: any) {
  const { width, height, depth } = dimensions;

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

export function Furniture(props: FurnitureItem) {
  const groupRef = useRef<THREE.Group>(null);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const selectFurniture = useEditorStore((state) => state.selectFurniture);
  const updateFurniture = useEditorStore((state) => state.updateFurniture);

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
    console.log('🖼️ Rendering wall furniture:', {
      id: props.id,
      type: props.type,
      mountType: props.mountType,
      propsY: props.position.y,
      finalY: finalPosition[1]
    });
  } else {
    // Floor/surface items: bottom sits on the ground (y=0)
    // The furniture models are centered, so we lift them by half their height
    finalPosition = [
      props.position.x,
      props.dimensions.height / 2, // Lift by half height so bottom touches ground
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
