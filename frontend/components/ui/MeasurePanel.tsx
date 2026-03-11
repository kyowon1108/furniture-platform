'use client';

import { useMeasureStore } from '@/store/measureStore';

export function MeasurePanel() {
  const { measureMode, setMeasureMode, clearMeasurePoints } = useMeasureStore();

  const isMeasuring = measureMode === 'distance';

  const toggleMeasuring = () => {
    setMeasureMode(isMeasuring ? 'none' : 'distance');
  };

  return (
    <div className="absolute top-4 right-4 z-40">
      <div className="nano-glass p-4 rounded-2xl border border-[var(--border-color)] shadow-[var(--shadow-xl)] w-48 bg-[#1a1a1a]/90">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <span>📏</span> 측정 도구
        </h3>
        <div className="space-y-2">
          <button
            onClick={toggleMeasuring}
            className={`w-full p-3 rounded-xl text-left transition-all border ${isMeasuring
              ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white shadow-[var(--shadow-neon)]'
              : 'bg-[#2a2a2a] border-white/5 text-[var(--text-secondary)] hover:bg-[#333333] hover:border-white/10'
              }`}
          >
            <div className="font-medium flex items-center gap-2">
              <span>{isMeasuring ? '⏹️' : '📐'}</span>
              {isMeasuring ? '측정 종료' : '거리 측정'}
            </div>
            <div className={`text-xs mt-1 ${isMeasuring ? 'text-white/80' : 'text-[var(--text-tertiary)]'}`}>
              {isMeasuring ? '클릭하여 지점을 선택하세요' : '두 지점 사이의 거리를 측정합니다'}
            </div>
          </button>

          <button
            onClick={clearMeasurePoints}
            className="w-full p-3 rounded-xl text-left transition-all border bg-[#2a2a2a] border-white/5 text-[var(--text-secondary)] hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400"
          >
            <div className="font-medium flex items-center gap-2">
              <span>❌</span> 초기화
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
