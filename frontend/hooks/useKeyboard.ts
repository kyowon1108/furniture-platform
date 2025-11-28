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
      // Ignore shortcuts when typing in input fields
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' ||
                       target.tagName === 'TEXTAREA' ||
                       target.isContentEditable;

      // Undo/Redo (allow even when typing)
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

      // Save (allow even when typing)
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        onSave?.();
        return;
      }

      // Skip other shortcuts when typing in input fields
      if (isTyping) return;

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

      // Transform mode shortcuts (only when not typing)
      if (e.key === 't' || e.key === 'T') {
        setTransformMode('translate' as TransformMode);
      } else if (e.key === 'r' || e.key === 'R') {
        setTransformMode('rotate' as TransformMode);
      } else if (e.key === 's' || e.key === 'S') {
        setTransformMode('scale' as TransformMode);
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
