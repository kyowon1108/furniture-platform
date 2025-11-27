'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { projectsAPI } from '@/lib/api';

interface CreateProjectModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateProjectModal({ onClose, onSuccess }: CreateProjectModalProps) {
  const [creationMode, setCreationMode] = useState<'3d' | 'room-builder'>('room-builder');
  const [fileType, setFileType] = useState<'ply' | 'glb'>('glb');
  const [formData, setFormData] = useState({
    name: '',
    room_width: 5.0,
    room_height: 3.0,
    room_depth: 4.0,
    description: '',
  });
  const [file3D, setFile3D] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState('');
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.glb') || fileName.endsWith('.gltf')) {
        setFileType('glb');
        setFile3D(file);
        setError('');
        setFormData({
          ...formData,
          room_width: 0,
          room_height: 0,
          room_depth: 0,
        });
      } else {
        setError('GLB 파일만 업로드 가능합니다');
        return;
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setUploadProgress('');

    try {
      if (creationMode === '3d' && !file3D) {
        setError('3D 파일을 선택해주세요');
        setIsSubmitting(false);
        return;
      }

      setUploadProgress('프로젝트 생성 중...');
      const projectData = {
        ...formData,
        has_3d_file: creationMode === '3d',
        file_type: creationMode === '3d' ? fileType : null,
        has_ply_file: creationMode === '3d' && fileType === 'ply',
        room_width: creationMode === 'room-builder' ? 0 : formData.room_width,
        room_height: creationMode === 'room-builder' ? 0 : formData.room_height,
        room_depth: creationMode === 'room-builder' ? 0 : formData.room_depth,
      };
      const project = await projectsAPI.create(projectData);

      if (creationMode === '3d' && file3D) {
        setUploadProgress(`${fileType.toUpperCase()} 파일 업로드 중...`);

        const formData = new FormData();
        formData.append('file', file3D);

        const token = localStorage.getItem('token');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8008/api/v1';

        const response = await fetch(`${apiUrl}/files-3d/upload-3d/${project.id}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || '파일 업로드 실패');
        }
      }

      setUploadProgress('완료!');
      onSuccess();

      await new Promise(resolve => setTimeout(resolve, 500));

      if (creationMode === 'room-builder') {
        router.push(`/room-builder/${project.id}`);
      } else {
        router.push(`/editor/${project.id}`);
      }
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
        <h2 className="text-2xl font-bold text-white mb-6">새 프로젝트 만들기</h2>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
            <span>⚠️</span>
            {error}
          </div>
        )}

        {uploadProgress && (
          <div className="mb-6 p-4 bg-[var(--accent-light)] border border-[var(--accent-primary)] rounded-xl text-[var(--accent-primary)] text-sm flex items-center gap-2">
            <span>⏳</span>
            {uploadProgress}
          </div>
        )}

        {/* Mode Selection */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">생성 방식</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setCreationMode('room-builder')}
              className={`p-4 rounded-xl border transition-all text-left ${creationMode === 'room-builder'
                  ? 'bg-[var(--accent-light)] border-[var(--accent-primary)]'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
            >
              <div className={`font-semibold mb-1 ${creationMode === 'room-builder' ? 'text-[var(--accent-primary)]' : 'text-white'}`}>
                방 구조 디자인
              </div>
              <div className="text-xs text-[var(--text-tertiary)]">3D 룸 빌더로 생성</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setCreationMode('3d');
                setFormData({ ...formData, room_width: 0, room_height: 0, room_depth: 0 });
              }}
              className={`p-4 rounded-xl border transition-all text-left ${creationMode === '3d'
                  ? 'bg-[var(--accent-light)] border-[var(--accent-primary)]'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
            >
              <div className={`font-semibold mb-1 ${creationMode === '3d' ? 'text-[var(--accent-primary)]' : 'text-white'}`}>
                3D 파일
              </div>
              <div className="text-xs text-[var(--text-tertiary)]">GLB 파일 업로드</div>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-secondary)] ml-1">
              프로젝트 이름 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:bg-white/10 outline-none transition-all"
              required
              placeholder="예: 내 방 레이아웃"
            />
          </div>

          {creationMode === '3d' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-secondary)] ml-1">
                3D 파일 * (GLB)
              </label>
              <input
                type="file"
                accept=".glb,.gltf"
                onChange={handleFileChange}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[var(--accent-primary)] file:text-white hover:file:bg-[var(--accent-hover)] transition-all"
                required
              />
              {file3D && (
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-sm text-[var(--text-secondary)]">
                    {file3D.name} ({(file3D.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile3D(null)}
                    className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                  >
                    제거
                  </button>
                </div>
              )}
              <div className="text-xs text-[var(--text-tertiary)] ml-1">
                <strong>GLB:</strong> 3D 모델링 소프트웨어 출력 (Blender, SketchUp 등)
              </div>
            </div>
          )}

          {creationMode === '3d' && file3D && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
              <strong>✅ 3D 파일이 선택되었습니다</strong>
              <p className="mt-1 text-green-400/80 text-xs">
                방 크기는 자동으로 감지됩니다. 3D 파일의 실제 크기 정보를 사용하여 가구 배치 영역을 설정합니다.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-secondary)] ml-1">설명</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:bg-white/10 outline-none transition-all resize-none"
              rows={3}
              placeholder="프로젝트에 대한 간단한 설명 (선택사항)"
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
              {isSubmitting ? uploadProgress || '생성 중...' : '생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
