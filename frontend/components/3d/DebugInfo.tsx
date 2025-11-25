'use client';

import { useEditorStore } from '@/store/editorStore';
import { useEffect, useState } from 'react';

interface DebugInfoProps {
  roomDimensions?: {
    width: number;
    height: number;
    depth: number;
  };
}

export function DebugInfo({ roomDimensions }: DebugInfoProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Toggle debug info with 'd' key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'd' && e.ctrlKey) {
        e.preventDefault();
        setVisible(v => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontFamily: 'monospace',
      fontSize: '12px',
      zIndex: 1000,
    }}>
      <h3>Debug Info (Ctrl+D to toggle)</h3>
      <div>Room Dimensions:</div>
      {roomDimensions ? (
        <>
          <div>Width: {roomDimensions.width}m</div>
          <div>Height: {roomDimensions.height}m</div>
          <div>Depth: {roomDimensions.depth}m</div>
        </>
      ) : (
        <div>No room dimensions</div>
      )}
    </div>
  );
}