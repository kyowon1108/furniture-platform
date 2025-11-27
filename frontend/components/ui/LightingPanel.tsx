'use client';

import { useEditorStore } from '@/store/editorStore';

export function LightingPanel() {
  const { timeOfDay, setTimeOfDay } = useEditorStore();

  const times = [
    { id: 'morning', label: '아침 🌅', time: '06:00' },
    { id: 'afternoon', label: '오후 ☀️', time: '12:00' },
    { id: 'evening', label: '저녁 🌇', time: '18:00' },
    { id: 'night', label: '밤 🌙', time: '00:00' },
  ] as const;

  return (
    <div className="absolute top-4 left-4 z-40">
      <div className="nano-glass p-4 rounded-2xl border border-[var(--border-color)] shadow-[var(--shadow-xl)] w-48 bg-[#1a1a1a]/90">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <span>💡</span> 조명 시뮬레이션
        </h3>
        <div className="space-y-2">
          {times.map((t) => (
            <button
              key={t.id}
              onClick={() => setTimeOfDay(t.id)}
              className={`w-full p-3 rounded-xl text-left transition-all border ${timeOfDay === t.id
                ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white shadow-[var(--shadow-neon)]'
                : 'bg-[#2a2a2a] border-white/5 text-[var(--text-secondary)] hover:bg-[#333333] hover:border-white/10'
                }`}
            >
              <div className="font-medium">{t.label}</div>
              <div className={`text-xs ${timeOfDay === t.id ? 'text-white/80' : 'text-[var(--text-tertiary)]'}`}>
                {t.time}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
