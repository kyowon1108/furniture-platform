'use client';

import { useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';

// This component needs to be inside Canvas to access useThree, 
// but since we are using it as a UI overlay in page.tsx, we'll make it a pure UI component
// and communicate via a store or event bus if needed.
// For now, let's assume it's a UI overlay that dispatches events.

export function CameraControls() {
  const handleViewChange = (view: 'top' | 'front' | 'side' | 'iso') => {
    let action = 'resetView';
    if (view === 'top') action = 'viewTop';
    if (view === 'front') action = 'viewFront';
    if (view === 'side') action = 'viewSide';
    if (view === 'iso') action = 'resetView';

    window.dispatchEvent(new CustomEvent('cameraControl', { detail: { action } }));
  };

  const handleZoom = (delta: number) => {
    const action = delta > 0 ? 'zoomOut' : 'zoomIn';
    window.dispatchEvent(new CustomEvent('cameraControl', { detail: { action } }));
  };

  return (
    <div className="absolute bottom-24 right-4 z-40 flex flex-col gap-2">
      <div className="nano-glass p-2 rounded-xl border border-[var(--border-color)] shadow-[var(--shadow-xl)] flex flex-col gap-1">
        <button
          onClick={() => handleZoom(-1)}
          className="p-2 text-[var(--text-secondary)] hover:text-white hover:bg-white/5 rounded-lg transition-all"
          title="줌 인 (+)"
        >
          ➕
        </button>
        <button
          onClick={() => handleZoom(1)}
          className="p-2 text-[var(--text-secondary)] hover:text-white hover:bg-white/5 rounded-lg transition-all"
          title="줌 아웃 (-)"
        >
          ➖
        </button>
      </div>

      <div className="nano-glass p-2 rounded-xl border border-[var(--border-color)] shadow-[var(--shadow-xl)] grid grid-cols-2 gap-1">
        <button
          onClick={() => handleViewChange('top')}
          className="p-2 text-xs font-medium text-[var(--text-secondary)] hover:text-white hover:bg-white/5 rounded-lg transition-all"
        >
          Top
        </button>
        <button
          onClick={() => handleViewChange('front')}
          className="p-2 text-xs font-medium text-[var(--text-secondary)] hover:text-white hover:bg-white/5 rounded-lg transition-all"
        >
          Front
        </button>
        <button
          onClick={() => handleViewChange('side')}
          className="p-2 text-xs font-medium text-[var(--text-secondary)] hover:text-white hover:bg-white/5 rounded-lg transition-all"
        >
          Side
        </button>
        <button
          onClick={() => handleViewChange('iso')}
          className="p-2 text-xs font-medium text-[var(--text-secondary)] hover:text-white hover:bg-white/5 rounded-lg transition-all"
        >
          Iso
        </button>
      </div>
    </div>
  );
}
