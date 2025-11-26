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
      <div className="floating-toolbar-nav">
        <button
          onClick={handleBackToProjects}
          className="floating-toolbar-btn"
          title="프로젝트 목록으로"
        >
          <span style={{ marginRight: '0.25rem' }}>←</span>
          프로젝트
        </button>
        <div className="floating-toolbar-divider" />
        <button
          onClick={handleLogout}
          className="floating-toolbar-btn danger"
          title="로그아웃"
        >
          로그아웃
        </button>
      </div>

      {/* Main Toolbar - Top Center (Floating Glassmorphism) */}
      <div className="floating-toolbar">
        {/* Undo/Redo */}
        <button
          onClick={undo}
          disabled={!canUndo}
          className="floating-toolbar-btn"
          title="실행 취소 (Ctrl+Z)"
        >
          ↶
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="floating-toolbar-btn"
          title="다시 실행 (Ctrl+Y)"
        >
          ↷
        </button>

        <div className="floating-toolbar-divider" />

        {/* Transform Modes */}
        <button
          onClick={() => setTransformMode('translate' as TransformMode)}
          className={`floating-toolbar-btn ${transformMode === 'translate' ? 'active' : ''}`}
          title="이동 (T)"
        >
          ↔
        </button>
        <button
          onClick={() => setTransformMode('rotate' as TransformMode)}
          className={`floating-toolbar-btn ${transformMode === 'rotate' ? 'active' : ''}`}
          title="회전 (R)"
        >
          ↻
        </button>

        <div className="floating-toolbar-divider" />

        {/* Grid Snap */}
        <button
          onClick={toggleGridSnap}
          className={`floating-toolbar-btn ${isGridSnap ? 'active' : ''}`}
          title="그리드 스냅"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm5 0v5H2V2h3zm1 0h4v5H6V2zm5 0h3v5h-3V2zM2 8h3v5H2V8zm4 0h4v5H6V8zm5 0h3v5h-3V8z"/>
          </svg>
        </button>

        <div className="floating-toolbar-divider" />

        {/* Delete Button */}
        <button
          onClick={handleDelete}
          disabled={selectedIds.length === 0}
          className={`floating-toolbar-btn danger ${selectedIds.length > 0 ? 'active-danger' : ''}`}
          title="삭제 (Delete/Backspace)"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
            <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
          </svg>
        </button>

        <div className="floating-toolbar-divider" />

        {/* Save Button */}
        <button
          onClick={saveLayout}
          disabled={!hasUnsavedChanges || isSaving}
          className={`floating-toolbar-btn success ${hasUnsavedChanges && !isSaving ? 'active-success' : ''}`}
          title="저장 (Ctrl+S)"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H9.5a1 1 0 0 0-1 1v7.293l2.646-2.647a.5.5 0 0 1 .708.708l-3.5 3.5a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L7.5 9.293V2a2 2 0 0 1 2-2H14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h2.5a.5.5 0 0 1 0 1H2z"/>
          </svg>
        </button>

        {/* Export PNG */}
        <button
          onClick={exportPNG}
          className="floating-toolbar-btn"
          title="PNG로 내보내기"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M10.5 8.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
            <path d="M2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4H2zm.5 2a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1zm9 2.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z"/>
          </svg>
        </button>

        <div className="floating-toolbar-divider" />

        {/* Last Saved Status */}
        <div className="floating-toolbar-info">
          <span style={{ opacity: 0.6 }}>저장:</span> {formatLastSaved()}
        </div>
      </div>
    </>
  );
}
