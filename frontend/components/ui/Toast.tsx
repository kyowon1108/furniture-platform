'use client';

import { useToastStore } from '@/store/toastStore';

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast ${toast.type} flex items-center gap-3 min-w-[300px]`}
        >
          <span className="flex-1" style={{ color: 'var(--text-primary)' }}>{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="toolbar-button"
            style={{ minWidth: '1.5rem', height: '1.5rem', padding: '0.25rem' }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
