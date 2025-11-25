'use client';

import { useRouter } from 'next/navigation';
import { useEditorStore } from '@/store/editorStore';
import { useAuthStore } from '@/store/authStore';
import { TransformMode } from '@/types/furniture';

export function Toolbar() {
  const router = useRouter();
  const transformMode = useEditorStore((state) => state.transformMode);
  const isGridSnap = useEditorStore((state) => state.isGridSnap);
  const hasUnsavedChanges = useEditorStore((state) => state.hasUnsavedChanges);
  const isSaving = useEditorStore((state) => state.isSaving);
  const lastSaved = useEditorStore((state) => state.lastSaved);
  const canUndo = useEditorStore((state) => state.canUndo);
  const canRedo = useEditorStore((state) => state.canRedo);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const setTransformMode = useEditorStore((state) => state.setTransformMode);
  const toggleGridSnap = useEditorStore((state) => state.toggleGridSnap);
  const saveLayout = useEditorStore((state) => state.saveLayout);
  const exportPNG = useEditorStore((state) => state.exportPNG);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const deleteFurniture = useEditorStore((state) => state.deleteFurniture);
  const logout = useAuthStore((state) => state.logout);

  const handleDelete = () => {
    if (selectedIds.length > 0) {
      selectedIds.forEach(id => {
        deleteFurniture(id);
      });
    }
  };

  const handleBackToProjects = () => {
    if (hasUnsavedChanges) {
      if (confirm('저장되지 않은 변경사항이 있습니다. 정말 나가시겠습니까?')) {
        router.push('/projects');
      }
    } else {
      router.push('/projects');
    }
  };

  const handleLogout = () => {
    if (hasUnsavedChanges) {
      if (confirm('저장되지 않은 변경사항이 있습니다. 정말 로그아웃하시겠습니까?')) {
        logout();
        router.push('/auth/login');
      }
    } else {
      logout();
      router.push('/auth/login');
    }
  };

  const buttonClass = (active: boolean) =>
    `toolbar-button ${active ? 'active' : ''}`;

  const formatLastSaved = () => {
    if (!lastSaved) return '저장 안됨';
    const diff = Math.floor((Date.now() - lastSaved.getTime()) / 1000);
    if (diff < 60) return `${diff}초 전`;
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    return lastSaved.toLocaleTimeString('ko-KR');
  };

  return (
    <>
      {/* Navigation Bar - Top Left */}
      <div className="toolbar-container absolute top-4 left-4 z-10 flex items-center gap-1">
        <button
          onClick={handleBackToProjects}
          className="toolbar-button"
          title="프로젝트 목록으로"
        >
          ← 프로젝트
        </button>
        <button
          onClick={handleLogout}
          className="toolbar-button"
          style={{ background: 'var(--error)', color: 'white', borderColor: 'var(--error)' }}
          title="로그아웃"
        >
          로그아웃
        </button>
      </div>

      {/* Main Toolbar - Top Center */}
      <div className="toolbar-container absolute top-4 left-1/2 transform -translate-x-1/2 z-10 flex items-center gap-1">
      {/* Undo/Redo */}
      <button
        onClick={undo}
        disabled={!canUndo}
        className="toolbar-button disabled:opacity-50 disabled:cursor-not-allowed"
        title="실행 취소 (Ctrl+Z)"
      >
        ↶
      </button>
      <button
        onClick={redo}
        disabled={!canRedo}
        className="toolbar-button disabled:opacity-50 disabled:cursor-not-allowed"
        title="다시 실행 (Ctrl+Y)"
      >
        ↷
      </button>

      <div className="toolbar-divider" />

      {/* Transform Modes */}
      <button
        onClick={() => setTransformMode('translate' as TransformMode)}
        className={buttonClass(transformMode === 'translate')}
        title="이동 (T)"
      >
        ↔
      </button>
      <button
        onClick={() => setTransformMode('rotate' as TransformMode)}
        className={buttonClass(transformMode === 'rotate')}
        title="회전 (R)"
      >
        ↻
      </button>
      {/* 크기 조절 기능 비활성화 - 추후 필요시 주석 해제 */}
      {/* <button
        onClick={() => setTransformMode('scale' as TransformMode)}
        className={buttonClass(transformMode === 'scale')}
        title="크기 (S)"
      >
        ⇲
      </button> */}

      <div className="toolbar-divider" />

      {/* Grid Snap */}
      <button
        onClick={toggleGridSnap}
        className={buttonClass(isGridSnap)}
        title="그리드 스냅"
      >
        🔗
      </button>

      <div className="toolbar-divider" />

      {/* Delete Button */}
      <button
        onClick={handleDelete}
        disabled={selectedIds.length === 0}
        className="toolbar-button disabled:opacity-50 disabled:cursor-not-allowed"
        style={selectedIds.length > 0 ? { background: 'var(--error)', color: 'white', borderColor: 'var(--error)' } : {}}
        title="삭제 (Delete/Backspace)"
      >
        🗑️
      </button>

      <div className="toolbar-divider" />

      {/* Save Button */}
      <button
        onClick={saveLayout}
        disabled={!hasUnsavedChanges || isSaving}
        className="toolbar-button disabled:opacity-50 disabled:cursor-not-allowed"
        style={hasUnsavedChanges && !isSaving ? { background: 'var(--success)', color: 'white', borderColor: 'var(--success)' } : {}}
        title="저장 (Ctrl+S)"
      >
        {isSaving ? '💾' : '💾'}
      </button>

      {/* Export PNG */}
      <button
        onClick={exportPNG}
        className="toolbar-button"
        style={{ background: '#9333ea', color: 'white', borderColor: '#9333ea' }}
        title="PNG로 내보내기"
      >
        📸
      </button>

      <div className="toolbar-divider" />

      {/* Last Saved */}
      <div className="text-xs" style={{ color: 'var(--text-secondary)', padding: '0 0.5rem', whiteSpace: 'nowrap' }}>
        <span style={{ color: 'var(--text-tertiary)' }}>저장:</span> {formatLastSaved()}
      </div>
      </div>
    </>
  );
}
