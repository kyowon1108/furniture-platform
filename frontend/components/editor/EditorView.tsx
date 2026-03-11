'use client';

import { useCallback, useState } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { useUIStore } from '@/store/uiStore';
import { Scene } from '@/components/3d/Scene';
import { Toolbar } from '@/components/ui/Toolbar';
import { Sidebar } from '@/components/ui/Sidebar';
import { ToastContainer } from '@/components/ui/Toast';
import { MeasurePanel } from '@/components/ui/MeasurePanel';
import { LightingPanel } from '@/components/ui/LightingPanel';
import { CameraControls } from '@/components/ui/CameraControls';
import { UserListPanel } from '@/components/ui/UserListPanel';
import { DebugInfo } from '@/components/3d/DebugInfo';

interface ProjectData {
  has_3d_file?: boolean;
  has_ply_file?: boolean;
  download_url?: string;
  file_type?: 'ply' | 'glb' | null;
  build_mode?: 'template' | 'free_build';
  room_structure?: any;
  room_width?: number;
  room_height?: number;
  room_depth?: number;
}

interface EditorViewProps {
  projectId: number;
  projectData: ProjectData;
  initialRoomDimensions?: { width: number; height: number; depth: number };
}

export function EditorView({ projectId, projectData, initialRoomDimensions }: EditorViewProps) {
  const { hasUnsavedChanges } = useEditorStore();
  const { isSidebarCollapsed } = useUIStore();
  const [roomDimensions, setRoomDimensions] = useState(initialRoomDimensions);

  // Memoize callback to prevent Scene re-rendering
  const handleRoomDimensionsChange = useCallback(
    (dims: { width: number; height: number; depth: number }) => {
      setRoomDimensions(dims);
    },
    []
  );

  return (
    <div className="relative flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Editor Area */}
      <div
        className="relative transition-all duration-300 ease-in-out h-full"
        style={{
          marginLeft: isSidebarCollapsed ? '60px' : '320px',
          width: `calc(100vw - ${isSidebarCollapsed ? '60px' : '320px'})`,
        }}
      >
        <Scene
          projectId={projectId}
          hasPlyFile={projectData?.has_3d_file || projectData?.has_ply_file}
          plyFilePath={projectData?.download_url}
          fileType={projectData?.file_type || (projectData?.has_ply_file ? 'ply' : null)}
          roomDimensions={roomDimensions}
          onRoomDimensionsChange={handleRoomDimensionsChange}
          buildMode={projectData?.build_mode}
          roomStructure={projectData?.room_structure}
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
          <div
            className="absolute bottom-4 right-4 z-10 flex items-center gap-2 px-4 py-2 shadow-lg"
            style={{
              background: 'var(--warning)',
              color: 'white',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <span className="animate-pulse">⚠️</span>
            <span>저장되지 않은 변경사항</span>
          </div>
        )}
      </div>
    </div>
  );
}
