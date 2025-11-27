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

      // Set initial room dimensions from project data
      setRoomDimensions({
        width: project.room_width,
        height: project.room_height,
        depth: project.room_depth
      });

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
        />
        <Toolbar />
        <MeasurePanel />
        <LightingPanel />
        <CameraControls />
        <CameraControls />
        <UserListPanel />

        {/* Debug Info - 주석 처리 (추후 필요시 해제)
        <div className="lighting-panel absolute top-36 left-4 z-50 w-64">
          <h3 className="lighting-title">🔍 Debug Info</h3>
          <div className="space-y-1" style={{ fontSize: '0.75rem' }}>
            <div style={{ color: 'var(--text-secondary)' }}>
              Project ID: <span style={{ color: 'var(--success)', fontWeight: '600' }}>{projectId}</span>
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>
              Project Data: <span style={{ color: projectData ? 'var(--success)' : 'var(--error)', fontWeight: '600' }}>{projectData ? 'Loaded' : 'Not Loaded'}</span>
            </div>
            {projectData && (
              <>
                <div style={{ color: 'var(--text-secondary)' }}>
                  Has PLY: <span style={{ color: projectData.has_ply_file ? 'var(--success)' : 'var(--error)', fontWeight: '600' }}>{String(projectData.has_ply_file)}</span>
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>
                  PLY Path: <span style={{ color: 'var(--accent-primary)', fontWeight: '500' }}>{projectData.ply_file_path || 'null'}</span>
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>
                  PLY Size: <span style={{ color: 'var(--accent-primary)', fontWeight: '500' }}>{projectData.ply_file_size ? `${(projectData.ply_file_size / 1024 / 1024).toFixed(2)} MB` : 'null'}</span>
                </div>
                <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: '600', marginBottom: '0.25rem' }}>Room Size:</div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    W: <span style={{ color: 'var(--accent-primary)', fontWeight: '500' }}>{projectData.room_width || 0}</span> ×
                    H: <span style={{ color: 'var(--accent-primary)', fontWeight: '500' }}>{projectData.room_height || 0}</span> ×
                    D: <span style={{ color: 'var(--accent-primary)', fontWeight: '500' }}>{projectData.room_depth || 0}</span>
                  </div>
                </div>
                <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
                  <button
                    onClick={async () => {
                      if (!projectData.has_ply_file) {
                        alert('이 프로젝트에는 PLY 파일이 없습니다.');
                        return;
                      }
                      try {
                        const { filesAPI } = await import('@/lib/api');
                        const info = await filesAPI.getPlyInfo(projectId);
                        console.log('========================================');
                        console.log('🎨 PLY FILE INFO FROM BACKEND');
                        console.log('========================================');
                        console.log('Has Colors:', info.has_colors);
                        console.log('Color Properties:', info.color_properties);
                        console.log('All Properties:', info.all_properties);
                        console.log('Color Samples:', info.color_samples);
                        console.log('========================================');
                        alert(`PLY Info:\nHas Colors: ${info.has_colors}\nColor Properties: ${info.color_properties.join(', ')}\nAll Properties: ${info.all_properties.join(', ')}\n\nCheck console for details!`);
                      } catch (error: any) {
                        console.error('Error getting PLY info:', error);
                        alert(`Error: ${error.response?.data?.detail || error.message || 'Unknown error'}\n\nCheck console for details.`);
                      }
                    }}
                    className="lighting-button text-xs w-full"
                    style={{ padding: '0.5rem', marginTop: '0.5rem' }}
                    disabled={!projectData.has_ply_file}
                  >
                    🔍 Check PLY Color Info
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--border-color)', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
            브라우저 콘솔(F12)을 확인하세요
          </div>
        </div>
        */}

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
