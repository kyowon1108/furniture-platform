'use client';

import { useEditorStore } from '@/store/editorStore';

export function LightingPanel() {
  const { timeOfDay, setTimeOfDay } = useEditorStore();

  const times = [
    { value: 'morning' as const, label: '아침 🌅', time: '06:00' },
    { value: 'afternoon' as const, label: '오후 ☀️', time: '12:00' },
    { value: 'evening' as const, label: '저녁 🌇', time: '18:00' },
    { value: 'night' as const, label: '밤 🌙', time: '00:00' },
  ];

  return (
    <div className="lighting-panel absolute bottom-4 left-4 z-10 w-64">
      <h3 className="lighting-title">💡 조명 시뮬레이션</h3>

      <div className="space-y-2">
        {times.map((t) => (
          <button
            key={t.value}
            onClick={() => setTimeOfDay(t.value)}
            className={`lighting-button ${timeOfDay === t.value ? 'active' : ''}`}
          >
            <div className="font-semibold">{t.label}</div>
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t.time}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
