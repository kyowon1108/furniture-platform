/**
 * Auto-save hook for periodic layout saving.
 */

import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/store/editorStore';

export function useAutoSave(intervalMs: number = 5000) {
  const { saveLayout, hasUnsavedChanges, isSaving } = useEditorStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (hasUnsavedChanges && !isSaving) {
        console.log('Auto-saving layout...');
        saveLayout();
      }
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [saveLayout, hasUnsavedChanges, isSaving, intervalMs]);
}
