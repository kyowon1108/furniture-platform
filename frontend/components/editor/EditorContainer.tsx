'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useEditorStore } from '@/store/editorStore';
import { useToastStore } from '@/store/toastStore';
import { useKeyboard } from '@/hooks/useKeyboard';
import { useSocket } from '@/hooks/useSocket';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useLockingEvents } from '@/hooks/useLockingEvents';
import { projectsAPI } from '@/lib/api';
import { EditorView } from './EditorView';
// Initialize logger
import '@/lib/logger';

interface ProjectData {
  has_3d_file?: boolean;
  has_ply_file?: boolean;
  download_url?: string;
  file_type?: 'ply' | 'glb' | null;
  build_mode?: 'template' | 'free_build';
  room_structure?: any;
  room_width: number;
  room_height: number;
  room_depth: number;
  owner_id: number;
}

interface EditorContainerProps {
  projectId: number;
}

export function EditorContainer({ projectId }: EditorContainerProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { loadLayout, saveLayout, setProjectOwnerId } = useEditorStore();
  const addToast = useToastStore((state) => state.addToast);

  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [initialRoomDimensions, setInitialRoomDimensions] = useState<
    { width: number; height: number; depth: number } | undefined
  >(undefined);

  // Load project data
  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      setIsLoadingProject(true);
      const project = await projectsAPI.get(projectId);

      console.log('Loaded project data:', project);
      setProjectData(project as ProjectData);
      setProjectOwnerId(project.owner_id);

      // Check if 3D file exists
      if (!(project as any).has_3d_file && !project.has_ply_file) {
        console.log('No 3D file found, redirecting to room builder');
        addToast('방 구조가 설정되지 않았습니다. 구조를 먼저 설정해주세요.', 'info');
        router.push(`/room-builder/${projectId}`);
        return;
      }

      // Set initial room dimensions if valid
      if (project.room_width > 0 && project.room_depth > 0) {
        setInitialRoomDimensions({
          width: project.room_width,
          height: project.room_height || 2.5,
          depth: project.room_depth,
        });
      }

      // Load layout
      await loadLayout(projectId);
      addToast('프로젝트를 불러왔습니다', 'success');
    } catch (error) {
      console.error('Failed to load project:', error);
      addToast('프로젝트를 불러오는데 실패했습니다', 'error');
      setTimeout(() => router.push('/projects'), 2000);
    } finally {
      setIsLoadingProject(false);
    }
  };

  // Setup auto-save (5 seconds)
  useAutoSave(5000);

  // Setup Ctrl+S keyboard shortcut
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

  // Setup other keyboard shortcuts
  useKeyboard();

  // Setup WebSocket connection
  useSocket(projectId, user?.id || null);

  // Setup locking event handlers
  useLockingEvents();

  // Loading state
  if (isLoadingProject || !projectData) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg-primary)' }}
      >
        <div className="text-xl" style={{ color: 'var(--text-primary)' }}>
          에디터를 불러오는 중...
        </div>
      </div>
    );
  }

  return (
    <EditorView
      projectId={projectId}
      projectData={projectData}
      initialRoomDimensions={initialRoomDimensions}
    />
  );
}
