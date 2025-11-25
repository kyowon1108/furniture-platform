'use client';

import * as THREE from 'three';
import { useMemo } from 'react';

interface CollisionDummyProps {
  roomDimensions?: {
    width: number;
    height: number;
    depth: number;
  };
}

export function CollisionDummy({ roomDimensions }: CollisionDummyProps) {
  // Detect room template based on dimensions
  const dummyObjects = useMemo(() => {
    if (!roomDimensions) return [];

    const { width, depth } = roomDimensions;
    const dummies: Array<{
      id: string;
      position: [number, number, number];
      dimensions: { width: number; height: number; depth: number };
    }> = [];

    // L-shaped room detection
    // Only check for actual 5x5 size (with small tolerance for floating point)
    // Don't assume L-shape when dimensions are 0x0
    const isLShaped = (width >= 4.9 && width <= 5.1 && depth >= 4.9 && depth <= 5.1);

    if (isLShaped) {
      // Add dummy object in top-right cutout area
      // The cutout is 2x2 in the top-right corner
      // Room is centered at (0,0), so:
      // - Right edge is at X = +2.5
      // - Left edge is at X = -2.5
      // - Front edge is at Z = +2.5
      // - Back edge is at Z = -2.5
      // For a cutout in the top-right (when looking from above):
      // - Cutout should be at positive X (right) and negative Z (back)

      console.log('Creating L-shaped room collision dummy:', {
        roomWidth: width,
        roomDepth: depth,
        cutoutPosition: [1.5, 1.5, 1.5],
        cutoutSize: { width: 2, height: 3, depth: 2 }
      });

      dummies.push({
        id: 'l-shape-cutout',
        position: [1.5, 1.5, 1.5], // Top-right position (positive Z for front)
        dimensions: { width: 2, height: 3, depth: 2 }
      });
    }

    // U-shaped room detection (can be added later)
    // if (width === 6 && depth === 6) {
    //   // Add dummy objects for U-shaped cutout
    // }

    return dummies;
  }, [roomDimensions?.width, roomDimensions?.depth]); // More specific dependencies

  // Don't render anything if no dummy objects needed
  if (dummyObjects.length === 0) return null;

  return (
    <group name="collision-dummies">
      {dummyObjects.map(dummy => (
        <mesh
          key={dummy.id}
          position={dummy.position}
          userData={{
            isDummy: true,
            id: dummy.id,
            dimensions: dummy.dimensions,
            position: {
              x: dummy.position[0],
              y: dummy.position[1],
              z: dummy.position[2]
            },
            rotation: { x: 0, y: 0, z: 0 },
            mountType: 'floor'
          }}
        >
          <boxGeometry args={[dummy.dimensions.width, dummy.dimensions.height, dummy.dimensions.depth]} />
          <meshBasicMaterial
            color="#ff0000"
            transparent={true}
            opacity={0} // Invisible in production
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}