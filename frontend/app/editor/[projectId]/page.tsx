'use client';

import { useEffect, useState } from 'react';
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
import { ConnectionStatus } from '@/components/ui/ConnectionStatus';
import { ToastContainer } from '@/components/ui/Toast';
import { MeasurePanel } from '@/components/ui/MeasurePanel';
import { LightingPanel } from '@/components/ui/LightingPanel';
import { useToastStore } from '@/store/toastStore';

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = parseInt(params.projectId as string);

  const { user, isAuthenticated, isLoading, fetchUser } = useAuthStore();
  const { loadLayout, saveLayout, hasUnsavedChanges } = useEditorStore();
  const addToast = useToastStore((state) => state.addToast);

  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [projectData, setProjectData] = useState<any>(null);

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
      console.log('PLY Info:', {
        has_ply_file: project.has_ply_file,
        ply_file_path: project.ply_file_path,
        ply_file_size: project.ply_file_size
      });
      setProjectData(project);

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
      <div className="flex-1 ml-80 relative">
        <Scene 
          projectId={projectId}
          hasPlyFile={projectData?.has_ply_file}
          plyFilePath={projectData?.ply_file_path}
          roomDimensions={projectData ? {
            width: projectData.room_width,
            height: projectData.room_height,
            depth: projectData.room_depth
          } : undefined}
        />
        <Toolbar />
        <MeasurePanel />
        <LightingPanel />
        <ConnectionStatus isConnected={isConnected} />
        
        {/* Debug Info - Below ConnectionStatus */}
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
              </>
            )}
          </div>
          <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--border-color)', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
            브라우저 콘솔(F12)을 확인하세요
          </div>
        </div>
        
        <ToastContainer />

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
