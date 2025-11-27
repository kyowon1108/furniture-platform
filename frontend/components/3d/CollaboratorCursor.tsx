import { Html } from '@react-three/drei';
import { Vector3 } from 'three';

interface CollaboratorCursorProps {
  position: [number, number, number];
  color: string;
  userId: string;
}

export function CollaboratorCursor({ position, color, userId }: CollaboratorCursorProps) {
  return (
    <group position={position}>
      {/* Cursor Sphere */}
      <mesh>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>

      {/* User Label */}
      <Html position={[0, 0.2, 0]} center>
        <div
          style={{
            background: color,
            padding: '2px 6px',
            borderRadius: '4px',
            color: 'white',
            fontSize: '10px',
            whiteSpace: 'nowrap',
            fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        >
          User {userId}
        </div>
      </Html>
    </group>
  );
}
