'use client';

import { useEffect, useRef } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      confirmButtonRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: '⚠️',
      confirmBg: 'bg-red-500 hover:bg-red-600',
      iconBg: 'bg-red-500/10',
    },
    warning: {
      icon: '⚡',
      confirmBg: 'bg-amber-500 hover:bg-amber-600',
      iconBg: 'bg-amber-500/10',
    },
    info: {
      icon: 'ℹ️',
      confirmBg: 'bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)]',
      iconBg: 'bg-[var(--accent-primary)]/10',
    },
  };

  const style = variantStyles[variant];

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-message"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="nano-glass w-full max-w-md p-6 rounded-2xl border border-[var(--border-color)] shadow-2xl">
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-12 h-12 ${style.iconBg} rounded-full flex items-center justify-center text-2xl`}>
            {style.icon}
          </div>
          <div className="flex-1">
            <h3
              id="confirm-modal-title"
              className="text-lg font-bold text-white mb-2"
            >
              {title}
            </h3>
            <p
              id="confirm-modal-message"
              className="text-[var(--text-secondary)] text-sm"
            >
              {message}
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-all"
            aria-label={cancelText}
          >
            {cancelText}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-3 ${style.confirmBg} text-white rounded-xl font-bold transition-all`}
            aria-label={confirmText}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
