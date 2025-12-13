/**
 * Hook for handling WebSocket locking events
 */
import { useEffect } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { useToastStore } from '@/store/toastStore';
import { socketService } from '@/lib/socket';

export function useLockingEvents() {
  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => {
    const {
      addLockedItem,
      removeLockedItem,
      setLockedItems,
      clearSelection,
    } = useEditorStore.getState();

    const handleObjectLocked = (data: { furniture_id: string; locked_by: string }) => {
      addLockedItem(data.furniture_id, data.locked_by);
    };

    const handleObjectUnlocked = (data: { furniture_id: string }) => {
      removeLockedItem(data.furniture_id);
    };

    const handleLockRejected = (data: { furniture_id: string; locked_by: string }) => {
      addToast('다른 사용자가 편집 중인 가구입니다', 'warning');
      addLockedItem(data.furniture_id, data.locked_by);

      // Deselect if we had it selected
      const currentSelected = useEditorStore.getState().selectedIds;
      if (currentSelected.includes(data.furniture_id)) {
        clearSelection();
      }
    };

    const handleCurrentLocks = (data: { locks: Array<{ furniture_id: string; locked_by: string }> }) => {
      const locksMap: Record<string, string> = {};
      data.locks.forEach(lock => {
        locksMap[lock.furniture_id] = lock.locked_by;
      });
      setLockedItems(locksMap);
    };

    // Subscribe to events
    socketService.on('object_locked', handleObjectLocked);
    socketService.on('object_unlocked', handleObjectUnlocked);
    socketService.on('lock_rejected', handleLockRejected);
    socketService.on('current_locks', handleCurrentLocks);

    // Cleanup
    return () => {
      socketService.off('object_locked', handleObjectLocked);
      socketService.off('object_unlocked', handleObjectUnlocked);
      socketService.off('lock_rejected', handleLockRejected);
      socketService.off('current_locks', handleCurrentLocks);
    };
  }, [addToast]);
}
