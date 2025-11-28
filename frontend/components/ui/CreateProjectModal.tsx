'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { projectsAPI } from '@/lib/api';

interface CreateProjectModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateProjectModal({ onClose, onSuccess }: CreateProjectModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    room_width: 5.0,
    room_height: 3.0,
    room_depth: 4.0,
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const projectData = {
        ...formData,
        has_3d_file: false,
        file_type: null,
        has_ply_file: false,
      };
      const project = await projectsAPI.create(projectData);

      onSuccess();

      await new Promise(resolve => setTimeout(resolve, 500));
      router.push(`/room-builder/${project.id}`);
    } catch (err: any) {
      console.error('Failed to create project:', err);
      setError(err.message || err.response?.data?.detail || '프로젝트 생성에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="nano-glass w-full max-w-2xl p-8 rounded-2xl border border-[var(--border-color)] shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-6">새 공간 만들기</h2>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
            <span>⚠️</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-secondary)] ml-1">
              공간 이름 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:bg-white/10 outline-none transition-all"
              required
              placeholder="예: 내 방, 거실, 침실"
            />
          </div>



          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-secondary)] ml-1">설명</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:bg-white/10 outline-none transition-all resize-none"
              rows={3}
              placeholder="공간에 대한 간단한 설명 (선택사항)"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-all"
              disabled={isSubmitting}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-bold transition-all shadow-[var(--shadow-neon)] hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {isSubmitting ? '생성 중...' : '공간 만들기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
