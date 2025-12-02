'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useEditorStore } from '@/store/editorStore';
import { useKeyboard } from '@/hooks/useKeyboard';
import { useSocket } from '@/hooks/useSocket';
import { useAutoSave } from '@/hooks/useAutoSave';
import { projectsAPI } from '@/lib/api';
import { Scene } from '@/components/3d/Scene';
import { Toolbar } from '@/components/ui/Toolbar';
import { Sidebar } from '@/components/ui/Sidebar';
import { ToastContainer } from '@/components/ui/Toast';
import { MeasurePanel } from '@/components/ui/MeasurePanel';
import { LightingPanel } from '@/components/ui/LightingPanel';
import { CameraControls } from '@/components/ui/CameraControls';
import { useToastStore } from '@/store/toastStore';
// Initialize logger to capture all console logs
import '@/lib/logger';
import { DebugInfo } from '@/components/3d/DebugInfo';
import { UserListPanel } from '@/components/ui/UserListPanel';

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = parseInt(params.projectId as string);

  const { user, isAuthenticated, isLoading, fetchUser } = useAuthStore();
  const { loadLayout, saveLayout, hasUnsavedChanges, isSidebarCollapsed, setProjectOwnerId } = useEditorStore();
  const addToast = useToastStore((state) => state.addToast);

  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [projectData, setProjectData] = useState<any>(null);
  const [roomDimensions, setRoomDimensions] = useState<{ width: number; height: number; depth: number } | undefined>(undefined);

  // Memoize the callback to prevent Scene from re-rendering
  const handleRoomDimensionsChange = useCallback((dims: { width: number; height: number; depth: number }) => {
    setRoomDimensions(dims);
  }, []);

  // Initialize auth
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Check authentication
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Load project and layout
  useEffect(() => {
    if (isAuthenticated && projectId) {
      loadProject();
    }
  }, [isAuthenticated, projectId]);

  const loadProject = async () => {
    try {
      setIsLoadingProject(true);
      const project = await projectsAPI.get(projectId);
      console.log('Loaded project data:', project);
      console.log('3D File Info:', {
        has_3d_file: (project as any).has_3d_file,
        file_type: (project as any).file_type,
        file_path: (project as any).file_path,
        file_size: (project as any).file_size,
        // Legacy
        has_ply_file: project.has_ply_file,
        ply_file_path: project.ply_file_path,
        ply_file_size: project.ply_file_size
      });
      setProjectData(project);
      setProjectOwnerId(project.owner_id);

      // Check if 3D file exists
      if (!(project as any).has_3d_file && !project.has_ply_file) {
        console.log('No 3D file found, redirecting to room builder');
        addToast('방 구조가 설정되지 않았습니다. 구조를 먼저 설정해주세요.', 'info');
        router.push(`/room-builder/${projectId}`);
        return;
      }

      // Set initial room dimensions from project data
      // Only set if dimensions are valid (non-zero)
      // If DB has 0 values, wait for GLB dimension detection
      console.log('📏 Raw project dimensions from DB:', {
        room_width: project.room_width,
        room_height: project.room_height,
        room_depth: project.room_depth,
        type: {
          width: typeof project.room_width,
          height: typeof project.room_height,
          depth: typeof project.room_depth
        }
      });

      if (project.room_width > 0 && project.room_depth > 0) {
        const dims = {
          width: project.room_width,
          height: project.room_height || 2.5, // Default height if not set
          depth: project.room_depth
        };
        setRoomDimensions(dims);
        console.log('✅ Room dimensions SET from DB:', dims);
      } else {
        console.log('⏳ Room dimensions from DB are 0 or undefined, waiting for GLB dimension detection');
        // Keep roomDimensions as undefined - GLB will detect and update via onRoomDimensionsChange
      }

      // Load layout using store method
      await loadLayout(projectId);

      addToast('프로젝트를 불러왔습니다', 'success');
    } catch (error) {
      console.error('Failed to load project:', error);
      addToast('프로젝트를 불러오는데 실패했습니다', 'error');
      router.push('/projects');
    } finally {
      setIsLoadingProject(false);
    }
  };

  // Setup auto-save (5 seconds)
  useAutoSave(5000);

  // Setup keyboard shortcuts (including Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveLayout();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveLayout]);

  useKeyboard();

  // Setup WebSocket connection
  const { isConnected } = useSocket(projectId || null, user?.id || null);

  // Listen for locking events
  useEffect(() => {
    const { socketService } = require('@/lib/socket');
    const { addLockedItem, removeLockedItem, setLockedItems, clearSelection, selectedIds } = useEditorStore.getState();

    const handleObjectLocked = (data: { furniture_id: string; locked_by: string }) => {
      addLockedItem(data.furniture_id, data.locked_by);
    };

    const handleObjectUnlocked = (data: { furniture_id: string }) => {
      removeLockedItem(data.furniture_id);
    };

    const handleLockRejected = (data: { furniture_id: string; locked_by: string }) => {
      addToast('다른 사용자가 편집 중인 가구입니다 🔒', 'warning');
      addLockedItem(data.furniture_id, data.locked_by);

      // Force deselect if we selected it locally
      const currentSelected = useEditorStore.getState().selectedIds;
      if (currentSelected.includes(data.furniture_id)) {
        useEditorStore.getState().selectFurniture(data.furniture_id, true); // Toggle off? No, selectFurniture handles toggle.
        // Better to just clear selection or remove specific ID
        // But selectFurniture logic is complex.
        // Let's just use clearSelection for now as single select is common
        useEditorStore.getState().clearSelection();
      }
    };

    const handleCurrentLocks = (data: { locks: Array<{ furniture_id: string; locked_by: string }> }) => {
      const locksMap: Record<string, string> = {};
      data.locks.forEach(lock => {
        locksMap[lock.furniture_id] = lock.locked_by;
      });
      setLockedItems(locksMap);
    };

    socketService.on('object_locked', handleObjectLocked);
    socketService.on('object_unlocked', handleObjectUnlocked);
    socketService.on('lock_rejected', handleLockRejected);
    socketService.on('current_locks', handleCurrentLocks);

    return () => {
      socketService.off('object_locked', handleObjectLocked);
      socketService.off('object_unlocked', handleObjectUnlocked);
      socketService.off('lock_rejected', handleLockRejected);
      socketService.off('current_locks', handleCurrentLocks);
    };
  }, [addToast]);

  if (isLoading || isLoadingProject) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-xl" style={{ color: 'var(--text-primary)' }}>에디터를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Editor Area */}
      <div
        className="relative transition-all duration-300 ease-in-out h-full"
        style={{
          marginLeft: isSidebarCollapsed ? '60px' : '320px',
          width: `calc(100vw - ${isSidebarCollapsed ? '60px' : '320px'})`
        }}
      >
        <Scene
          projectId={projectId}
          hasPlyFile={(projectData as any)?.has_3d_file || projectData?.has_ply_file}
          plyFilePath={(projectData as any)?.file_path || projectData?.ply_file_path}
          fileType={((projectData as any)?.file_type as 'ply' | 'glb' | null) || (projectData?.has_ply_file ? 'ply' : null)}
          roomDimensions={roomDimensions}
          onRoomDimensionsChange={handleRoomDimensionsChange}
          buildMode={(projectData as any)?.build_mode as 'template' | 'free_build' | undefined}
          roomStructure={(projectData as any)?.room_structure}
        />
        <Toolbar />
        <MeasurePanel />
        <LightingPanel />
        <CameraControls />
        <UserListPanel />
        <ToastContainer />
        <DebugInfo roomDimensions={roomDimensions} />

        {/* Unsaved Changes Warning */}
        {hasUnsavedChanges && (
          <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2 px-4 py-2 shadow-lg" style={{
            background: 'var(--warning)',
            color: 'white',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-xl)'
          }}>
            <span className="animate-pulse">⚠️</span>
            <span>저장되지 않은 변경사항</span>
          </div>
        )}
      </div>
    </div>
  );
}
