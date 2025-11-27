'use client';

import { useEditorStore } from '@/store/editorStore';
import { useToastStore } from '@/store/toastStore';
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

export function Toolbar() {
  const {
    undo,
    redo,
    canUndo,
    canRedo,
    deleteSelected,
    selectedIds,
    clearSelection,
    saveLayout,
    lastSaved,
    projectId,
    projectOwnerId,
    hasUnsavedChanges
  } = useEditorStore();

  const { user } = useAuthStore();
  const [isSharing, setIsSharing] = useState(false);
  const { addToast } = useToastStore();

  const handleShare = async () => {
    if (!projectId) return;

    try {
      const { projectsAPI } = await import('@/lib/api');
      await projectsAPI.toggleShare(projectId, true);

      const url = `${window.location.origin}/editor/${projectId}`;

      // Try modern clipboard API first, fallback for HTTP
      let copied = false;
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        copied = true;
      } else {
        // Fallback for non-HTTPS environments
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        copied = document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      if (copied) {
        addToast('링크가 복사되었습니다! 친구에게 공유하세요.', 'success');
      } else {
        // If copy failed, show URL in toast for manual copy
        addToast(`공유 링크: ${url}`, 'info');
      }
    } catch (error) {
      console.error('Failed to share project:', error);
      addToast('공유 링크 생성 실패', 'error');
    }
  };
  const router = useRouter();

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="nano-glass p-2 rounded-2xl border border-[var(--border-color)] shadow-[var(--shadow-xl)] flex items-center gap-2">
        <div className="flex items-center gap-1 pr-2 border-r border-white/10">
          <button
            onClick={() => router.push('/projects')}
            className="p-2 text-[var(--text-secondary)] hover:text-white hover:bg-white/5 rounded-lg transition-all"
            title="프로젝트 목록으로"
          >
            ←
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`p-2 rounded-lg transition-all ${canUndo
              ? 'text-white hover:bg-white/5'
              : 'text-[var(--text-tertiary)] cursor-not-allowed'
              }`}
            title="실행 취소 (Ctrl+Z)"
          >
            ↩️
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className={`p-2 rounded-lg transition-all ${canRedo
              ? 'text-white hover:bg-white/5'
              : 'text-[var(--text-tertiary)] cursor-not-allowed'
              }`}
            title="다시 실행 (Ctrl+Y)"
          >
            ↪️
          </button>
        </div>

        {/* Completion Button (Check) */}
        {selectedIds.length > 0 && (
          <>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <button
              onClick={clearSelection}
              className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition-all"
              title="이동 완료 (선택 해제)"
            >
              ✅
            </button>
          </>
        )}

        {/* Share Button - Only visible to owner */}
        {user?.id === projectOwnerId && (
          <>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <button
              onClick={handleShare}
              className="p-2 text-white/70 hover:text-blue-400 hover:bg-white/5 rounded-lg transition-all"
              title="공유하기"
            >
              🔗
            </button>
          </>
        )}

        <div className="w-px h-6 bg-white/10 mx-1" />

        <button
          onClick={saveLayout}
          disabled={!hasUnsavedChanges}
          className="p-2 text-[var(--accent-primary)] hover:bg-[var(--accent-light)] rounded-lg transition-all"
          title="저장 (Ctrl+S)"
        >
          💾
        </button>

        <button
          onClick={deleteSelected}
          disabled={selectedIds.length === 0}
          className={`p-2 rounded-lg transition-all ${selectedIds.length > 0
            ? 'text-red-400 hover:bg-red-500/10'
            : 'text-[var(--text-tertiary)] cursor-not-allowed'
            }`}
          title="삭제 (Delete)"
        >
          🗑️
        </button>

        {lastSaved && (
          <div className="pl-2 ml-2 border-l border-white/10 text-xs text-[var(--text-tertiary)]">
            {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 저장됨
          </div>
        )}
      </div>
    </div>
  );
}
