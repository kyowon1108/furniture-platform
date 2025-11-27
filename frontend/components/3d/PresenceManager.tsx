import { useEffect, useState, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useEditorStore } from '@/store/editorStore';
import { useAuthStore } from '@/store/authStore';
import { socketService } from '@/lib/socket';
import { CollaboratorCursor } from './CollaboratorCursor';
import * as THREE from 'three';

interface Collaborator {
  userId: string;
  sid: string;
  cursorPosition: [number, number, number];
  color: string;
}

export function PresenceManager() {
  const { projectId } = useEditorStore();
  const { user } = useAuthStore();
  const { raycaster, camera, scene } = useThree();
  const [collaborators, setCollaborators] = useState<Record<string, Collaborator>>({});

  // Throttling for sending updates
  const lastUpdateRef = useRef<number>(0);
  const UPDATE_INTERVAL = 50; // 50ms throttle

  // Generate a random color for this user
  const myColor = useRef<string>(`#${Math.floor(Math.random() * 16777215).toString(16)}`);

  useEffect(() => {
    if (!projectId || !user) return;

    const handlePresenceUpdated = (data: Collaborator) => {
      setCollaborators(prev => ({
        ...prev,
        [data.sid]: data
      }));
    };

    const handleUserLeft = (data: { sid: string }) => {
      setCollaborators(prev => {
        const next = { ...prev };
        delete next[data.sid];
        return next;
      });
    };

    socketService.on('presence_updated', handlePresenceUpdated);
    socketService.on('user_left', handleUserLeft);

    return () => {
      socketService.off('presence_updated', handlePresenceUpdated);
      socketService.off('user_left', handleUserLeft);
    };
  }, [projectId, user]);

  // Track mouse movement and send updates
  useFrame((state) => {
    if (!projectId || !user) return;

    const now = Date.now();
    if (now - lastUpdateRef.current < UPDATE_INTERVAL) return;

    // Raycast to find ground position
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    raycaster.setFromCamera(state.pointer, camera);
    const point = raycaster.ray.intersectPlane(plane, intersectPoint);

    if (point) {
      // Send update
      socketService.emit('update_presence', {
        project_id: projectId,
        user_id: user.id,
        cursor_position: [point.x, point.y, point.z],
        color: myColor.current
      });
      lastUpdateRef.current = now;
    }
  });

  return (
    <group>
      {Object.values(collaborators).map((collab) => (
        <CollaboratorCursor
          key={collab.sid}
          position={collab.cursorPosition}
          color={collab.color}
          userId={collab.userId}
        />
      ))}
    </group>
  );
}
