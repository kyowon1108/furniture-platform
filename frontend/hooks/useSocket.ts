/**
 * WebSocket hook for real-time collaboration.
 */

import { useEffect, useState } from 'react';
import { socketService } from '@/lib/socket';
import { useEditorStore } from '@/store/editorStore';
import { useToastStore } from '@/store/toastStore';

export function useSocket(projectId: number | null, userId: number | null) {
  const [isConnected, setIsConnected] = useState(false);
  const { updateFurniture, addFurniture, deleteFurniture } = useEditorStore();
  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => {
    if (!projectId || !userId) return;

    const socket = socketService.connect(projectId, userId);

    socket.on('connect', () => {
      setIsConnected(true);
      addToast('Connected to collaboration server', 'success');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      addToast('Disconnected from server', 'warning');
    });

    socket.on('user_joined', (data: any) => {
      console.log('User joined:', data);
      addToast(`User ${data.user_id} joined`, 'info');
    });

    socket.on('user_left', (data: any) => {
      console.log('User left:', data);
    });

    socket.on('furniture_updated', (data: any) => {
      updateFurniture(data.furniture_id, {
        position: data.position,
        rotation: data.rotation,
      });
    });

    socket.on('furniture_added', (data: any) => {
      // Only add if not already present (prevent duplicates from WebSocket)
      const { furnitures } = useEditorStore.getState();
      if (!furnitures.some(f => f.id === data.furniture.id)) {
        addFurniture(data.furniture);
      } else {
        console.log('⚠️ Furniture already exists, skipping WebSocket add:', data.furniture.id);
      }
    });

    socket.on('furniture_deleted', (data: any) => {
      deleteFurniture(data.furniture_id);
    });

    socket.on('validation_result', (data: any) => {
      if (!data.valid) {
        data.collisions.forEach((collision: any) => {
          updateFurniture(collision.id1, { isColliding: true });
          updateFurniture(collision.id2, { isColliding: true });
        });
        addToast('⚠️ Collision detected', 'warning');
      }
    });

    socket.on('collision_detected', (data: any) => {
      console.log('Collision detected:', data);
    });

    return () => {
      socketService.disconnect();
      setIsConnected(false);
    };
  }, [projectId, userId, updateFurniture, addFurniture, deleteFurniture, addToast]);

  return { isConnected };
}
