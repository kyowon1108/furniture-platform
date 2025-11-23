/**
 * WebSocket client for real-time collaboration.
 */

import { io, Socket } from 'socket.io-client';
import type { FurnitureItem, Vector3 } from '@/types/furniture';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8008';

class SocketService {
  private socket: Socket | null = null;
  private projectId: number | null = null;

  connect(projectId: number, userId: number): Socket {
    this.projectId = projectId;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.socket?.emit('join_project', {
        project_id: projectId,
        user_id: userId,
      });
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.projectId = null;
    }
  }

  emitFurnitureMove(furnitureId: string, position: Vector3, rotation: Vector3) {
    if (this.socket && this.projectId) {
      this.socket.emit('furniture_move', {
        project_id: this.projectId,
        furniture_id: furnitureId,
        position,
        rotation,
      });
    }
  }

  emitFurnitureAdd(furniture: FurnitureItem) {
    if (this.socket && this.projectId) {
      this.socket.emit('furniture_add', {
        project_id: this.projectId,
        furniture,
      });
    }
  }

  emitFurnitureDelete(furnitureId: string) {
    if (this.socket && this.projectId) {
      this.socket.emit('furniture_delete', {
        project_id: this.projectId,
        furniture_id: furnitureId,
      });
    }
  }

  validateLayout(furnitureState: any, roomDimensions: any) {
    if (this.socket && this.projectId) {
      this.socket.emit('validate_furniture', {
        project_id: this.projectId,
        furniture_state: furnitureState,
        room_dimensions: roomDimensions,
      });
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void) {
    this.socket?.off(event, callback);
  }
}

export const socketService = new SocketService();
