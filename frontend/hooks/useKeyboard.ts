/**
 * Keyboard shortcuts hook for editor controls.
 */

import { useEffect } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { TransformMode } from '@/types/furniture';

export function useKeyboard(onSave?: () => void) {
  const {
    setTransformMode,
    selectedIds,
    deleteFurniture,
    undo,
    redo,
    copySelected,
    paste,
  } = useEditorStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }

      // Copy/Paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        copySelected();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        paste();
        return;
      }

      // Transform mode shortcuts
      if (e.key === 't' || e.key === 'T') {
        setTransformMode('translate' as TransformMode);
      } else if (e.key === 'r' || e.key === 'R') {
        setTransformMode('rotate' as TransformMode);
      } else if (e.key === 's' || e.key === 'S') {
        if (e.ctrlKey || e.metaKey) {
          // Ctrl+S or Cmd+S for save
          e.preventDefault();
          onSave?.();
        } else {
          setTransformMode('scale' as TransformMode);
        }
      }

      // Delete selected furniture
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          selectedIds.forEach((id) => deleteFurniture(id));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setTransformMode, selectedIds, deleteFurniture, undo, redo, copySelected, paste, onSave]);
}
