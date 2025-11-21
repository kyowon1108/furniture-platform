'use client';

import { useEditorStore } from '@/store/editorStore';

export function MeasurePanel() {
  const { measureMode, measurePoints, setMeasureMode, clearMeasurePoints } =
    useEditorStore();

  const calculateDistance = () => {
    if (measurePoints.length !== 2) return 0;
    const [p1, p2] = measurePoints;
    return Math.sqrt((p2.x - p1.x) ** 2 + (p2.z - p1.z) ** 2);
  };

  return (
    <div className="measure-panel absolute top-20 right-4 z-10 w-64 max-h-[calc(100vh-6rem)] overflow-y-auto">
      <h3 className="lighting-title">📏 측정 도구</h3>

      <div className="space-y-2">
        <button
          onClick={() => setMeasureMode('distance')}
          className={`lighting-button ${measureMode === 'distance' ? 'active' : ''}`}
        >
          📏 거리 측정
        </button>

        <button
          onClick={clearMeasurePoints}
          disabled={measurePoints.length === 0}
          className="lighting-button disabled:opacity-50 disabled:cursor-not-allowed"
          style={measurePoints.length > 0 ? { background: 'var(--error)', color: 'white', borderColor: 'var(--error)' } : {}}
        >
          ❌ 초기화
        </button>
      </div>

      {measureMode === 'distance' && (
        <div className="mt-4 p-3 rounded" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
          <p className="text-sm mb-2" style={{ color: 'var(--text-primary)' }}>
            포인트: {measurePoints.length}/2
          </p>
          <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
            바닥을 클릭하여 포인트 선택
          </p>
          {measurePoints.length === 2 && (
            <p className="font-bold text-lg" style={{ color: 'var(--success)' }}>
              거리: {calculateDistance().toFixed(2)}m
            </p>
          )}
        </div>
      )}
    </div>
  );
}
