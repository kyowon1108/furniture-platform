'use client';

import React from 'react';
import { useFreeBuildStore } from '@/store/freeBuildStore';
import { BuildTool } from '@/types/freeBuild';

interface BuildToolbarProps {
  className?: string;
}

const TOOLS: { id: BuildTool; icon: string; label: string; shortcut: string }[] = [
  { id: 'select', icon: '🖱️', label: '선택', shortcut: 'V' },
  { id: 'floor', icon: '🟫', label: '바닥', shortcut: 'F' },
  { id: 'wall', icon: '🧱', label: '벽', shortcut: 'W' },
  { id: 'eraser', icon: '🧹', label: '지우개', shortcut: 'E' },
];

const BuildToolbar: React.FC<BuildToolbarProps> = ({ className = '' }) => {
  const {
    currentTool,
    setCurrentTool,
    isAutoWallEnabled,
    setAutoWallEnabled,
    showGrid,
    setShowGrid,
    tiles,
    selectedTileIds,
    clearSelection,
    selectAllFloorTiles,
    selectAllWallTiles,
    generateWallsFromFloor,
    removeAllWalls,
    clearAllTiles,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useFreeBuildStore();

  const floorCount = tiles.filter((t) => t.type === 'floor').length;
  const wallCount = tiles.filter((t) => t.type === 'wall').length;

  // 키보드 단축키 처리
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에서는 무시
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'v':
          setCurrentTool('select');
          break;
        case 'f':
          setCurrentTool('floor');
          break;
        case 'w':
          setCurrentTool('wall');
          break;
        case 'e':
          setCurrentTool('eraser');
          break;
        case 'escape':
          clearSelection();
          break;
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            e.preventDefault();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCurrentTool, clearSelection, undo, redo]);

  return (
    <div className={`build-toolbar bg-card border border-border rounded-lg p-3 ${className}`}>
      {/* 도구 선택 */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-2 text-foreground">건축 도구</h3>
        <div className="flex gap-1">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setCurrentTool(tool.id)}
              className={`
                flex flex-col items-center justify-center p-2 rounded-md transition-colors
                ${currentTool === tool.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                }
              `}
              title={`${tool.label} (${tool.shortcut})`}
            >
              <span className="text-lg">{tool.icon}</span>
              <span className="text-xs mt-1">{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 타일 정보 */}
      <div className="mb-4 p-2 bg-muted rounded-md">
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>바닥 타일:</span>
            <span className="font-medium text-foreground">{floorCount}개</span>
          </div>
          <div className="flex justify-between">
            <span>벽 타일:</span>
            <span className="font-medium text-foreground">{wallCount}개</span>
          </div>
          <div className="flex justify-between">
            <span>선택됨:</span>
            <span className="font-medium text-foreground">{selectedTileIds.length}개</span>
          </div>
        </div>
      </div>

      {/* 옵션 */}
      <div className="mb-4 space-y-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={isAutoWallEnabled}
            onChange={(e) => setAutoWallEnabled(e.target.checked)}
            className="rounded border-border"
          />
          <span>자동 벽 생성</span>
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(e) => setShowGrid(e.target.checked)}
            className="rounded border-border"
          />
          <span>그리드 표시</span>
        </label>
      </div>

      {/* 선택 버튼 */}
      <div className="mb-4 space-y-2">
        <h3 className="text-sm font-semibold text-foreground">선택</h3>
        <div className="flex gap-1">
          <button
            onClick={selectAllFloorTiles}
            className="flex-1 px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded"
          >
            바닥 전체
          </button>
          <button
            onClick={selectAllWallTiles}
            className="flex-1 px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded"
          >
            벽 전체
          </button>
          <button
            onClick={clearSelection}
            className="flex-1 px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded"
          >
            선택 해제
          </button>
        </div>
      </div>

      {/* 작업 버튼 */}
      <div className="mb-4 space-y-2">
        <h3 className="text-sm font-semibold text-foreground">작업</h3>
        <button
          onClick={generateWallsFromFloor}
          className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          벽 재생성
        </button>
        <button
          onClick={removeAllWalls}
          className="w-full px-3 py-2 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
        >
          벽 모두 삭제
        </button>
        <button
          onClick={clearAllTiles}
          className="w-full px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
        >
          전체 삭제
        </button>
      </div>

      {/* Undo/Redo */}
      <div className="flex gap-1">
        <button
          onClick={undo}
          disabled={!canUndo()}
          className="flex-1 px-3 py-2 text-sm bg-muted hover:bg-muted/80 rounded disabled:opacity-50"
          title="실행 취소 (Ctrl+Z)"
        >
          ↶ 실행 취소
        </button>
        <button
          onClick={redo}
          disabled={!canRedo()}
          className="flex-1 px-3 py-2 text-sm bg-muted hover:bg-muted/80 rounded disabled:opacity-50"
          title="다시 실행 (Ctrl+Shift+Z)"
        >
          ↷ 다시 실행
        </button>
      </div>

      {/* 단축키 안내 */}
      <div className="mt-4 pt-3 border-t border-border">
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">단축키 안내</summary>
          <div className="mt-2 space-y-1 pl-2">
            <div>V: 선택 도구</div>
            <div>F: 바닥 도구</div>
            <div>W: 벽 도구</div>
            <div>E: 지우개</div>
            <div>ESC: 선택 해제</div>
            <div>Ctrl+Z: 실행 취소</div>
            <div>Ctrl+Shift+Z: 다시 실행</div>
            <div>Shift+클릭: 범위 선택</div>
            <div>Ctrl+클릭: 다중 선택</div>
          </div>
        </details>
      </div>
    </div>
  );
};

export default BuildToolbar;
