/**
 * WebSocket hook for real-time collaboration.
 */

import { useEffect, useState } from 'react';
import type { ValidationResult } from '@/types/api';
import type { FurnitureItem } from '@/types/furniture';
import { socketService } from '@/lib/socket';
import { useEditorStore } from '@/store/editorStore';
import { useToastStore } from '@/store/toastStore';

interface UserJoinedEvent {
  nickname: string;
}

interface FurnitureUpdatedEvent {
  furniture_id: string;
  position: FurnitureItem['position'];
  rotation: FurnitureItem['rotation'];
}

interface FurnitureAddedEvent {
  furniture: FurnitureItem;
}

interface FurnitureDeletedEvent {
  furniture_id: string;
}

export function useSocket(projectId: number | null, userId: number | null) {
  const [isConnected, setIsConnected] = useState(false);
  const { updateFurniture, addFurniture, deleteFurniture } = useEditorStore();
  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => {
    if (!projectId || !userId) return;

    const socket = socketService.connect(projectId);

    socket.on('connect', () => {
      setIsConnected(true);
      addToast('Connected to collaboration server', 'success');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      addToast('Disconnected from server', 'warning');
    });

    socket.on('connect_error', (error: Error) => {
      console.error('Socket connection error:', error);
      addToast('실시간 협업 서버에 연결할 수 없습니다', 'error');
    });

    socket.on('join_error', (data: { message?: string }) => {
      addToast(data.message || '프로젝트 협업 세션에 참여할 수 없습니다', 'error');
    });

    socket.on('user_joined', (data: UserJoinedEvent) => {
      addToast(`${data.nickname}님이 입장하셨습니다`, 'info');
    });

    socket.on('furniture_updated', (data: FurnitureUpdatedEvent) => {
      updateFurniture(data.furniture_id, {
        position: data.position,
        rotation: data.rotation,
      });
    });

    socket.on('furniture_added', (data: FurnitureAddedEvent) => {
      // Only add if not already present (prevent duplicates from WebSocket)
      const { furnitures } = useEditorStore.getState();
      if (!furnitures.some(f => f.id === data.furniture.id)) {
        addFurniture(data.furniture);
      }
    });

    socket.on('furniture_deleted', (data: FurnitureDeletedEvent) => {
      deleteFurniture(data.furniture_id);
    });

    socket.on('validation_result', (data: ValidationResult) => {
      if (!data.valid) {
        data.collisions.forEach((collision) => {
          updateFurniture(collision.id1, { isColliding: true });
          updateFurniture(collision.id2, { isColliding: true });
        });
        addToast('⚠️ Collision detected', 'warning');
      }
    });

    return () => {
      socketService.disconnect();
      setIsConnected(false);
    };
  }, [projectId, userId, updateFurniture, addFurniture, deleteFurniture, addToast]);

  return { isConnected };
}
