'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { projectsAPI, filesAPI } from '@/lib/api';

interface CreateProjectModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateProjectModal({ onClose, onSuccess }: CreateProjectModalProps) {
  const [creationMode, setCreationMode] = useState<'manual' | 'ply'>('manual');
  const [formData, setFormData] = useState({
    name: '',
    room_width: 5.0,
    room_height: 3.0,
    room_depth: 4.0,
    description: '',
  });
  const [plyFile, setPlyFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState('');
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.ply')) {
        setError('PLY 파일만 업로드 가능합니다');
        return;
      }
      // No file size limit for development/demo purposes
      // In production, you may want to add size validation based on your infrastructure
      setPlyFile(file);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setUploadProgress('');

    try {
      if (creationMode === 'ply' && !plyFile) {
        setError('PLY 파일을 선택해주세요');
        setIsSubmitting(false);
        return;
      }

      // Step 1: Create project
      setUploadProgress('프로젝트 생성 중...');
      const projectData = {
        ...formData,
        has_ply_file: creationMode === 'ply',
      };
      const project = await projectsAPI.create(projectData);

      // Step 2: Upload PLY file if in PLY mode
      if (creationMode === 'ply' && plyFile) {
        setUploadProgress('PLY 파일 업로드 중...');
        await filesAPI.uploadPly(project.id, plyFile);
      }

      setUploadProgress('완료!');
      onSuccess();
      router.push(`/editor/${project.id}`);
    } catch (err: any) {
      console.error('Failed to create project:', err);
      setError(err.response?.data?.detail || '프로젝트 생성에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div style={{ 
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-xl)',
        padding: '2rem',
        maxWidth: '42rem',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: 'var(--shadow-xl)'
      }}>
        <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>새 프로젝트 만들기</h2>

        {error && (
          <div style={{
            background: '#fee',
            border: '1px solid var(--error)',
            color: 'var(--error)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        {uploadProgress && (
          <div style={{
            background: 'var(--accent-light)',
            border: '1px solid var(--accent-primary)',
            color: 'var(--accent-primary)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem'
          }}>
            {uploadProgress}
          </div>
        )}

        {/* Mode Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>생성 방식</label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setCreationMode('manual')}
              className="flex-1 px-4 py-3 transition-all"
              style={{
                borderRadius: 'var(--radius-lg)',
                border: `2px solid ${creationMode === 'manual' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                background: creationMode === 'manual' ? 'var(--accent-light)' : 'var(--bg-secondary)',
                color: creationMode === 'manual' ? 'var(--accent-primary)' : 'var(--text-primary)'
              }}
            >
              <div className="font-semibold">수동 입력</div>
              <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>방 크기를 직접 입력</div>
            </button>
            <button
              type="button"
              onClick={() => setCreationMode('ply')}
              className="flex-1 px-4 py-3 transition-all"
              style={{
                borderRadius: 'var(--radius-lg)',
                border: `2px solid ${creationMode === 'ply' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                background: creationMode === 'ply' ? 'var(--accent-light)' : 'var(--bg-secondary)',
                color: creationMode === 'ply' ? 'var(--accent-primary)' : 'var(--text-primary)'
              }}
            >
              <div className="font-semibold">PLY 파일 업로드</div>
              <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>3D 스캔 파일 사용</div>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              프로젝트 이름 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="search-input w-full"
              required
              placeholder="예: 내 방 레이아웃"
            />
          </div>

          {creationMode === 'ply' && (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                PLY 파일 *
              </label>
              <input
                type="file"
                accept=".ply"
                onChange={handleFileChange}
                className="search-input w-full"
                required
              />
              {plyFile && (
                <div className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  선택된 파일: {plyFile.name} ({(plyFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
              <div className="mt-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                3D 스캔된 방의 PLY 파일을 업로드하세요. 업로드된 3D 모델이 방의 배경으로 사용됩니다.
                <br />
                <span className="text-xs">개발/시연용으로 파일 크기 제한이 없습니다.</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                폭 (m) *
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="50"
                value={formData.room_width}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    room_width: parseFloat(e.target.value),
                  })
                }
                className="search-input w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                높이 (m) *
              </label>
              <input
                type="number"
                step="0.1"
                min="2"
                max="10"
                value={formData.room_height}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    room_height: parseFloat(e.target.value),
                  })
                }
                className="search-input w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                깊이 (m) *
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="50"
                value={formData.room_depth}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    room_depth: parseFloat(e.target.value),
                  })
                }
                className="search-input w-full"
                required
              />
            </div>
          </div>

          {creationMode === 'ply' && (
            <div style={{
              background: '#fef3c7',
              border: '1px solid var(--warning)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem',
              fontSize: '0.875rem',
              color: '#92400e'
            }}>
              <strong>참고:</strong> PLY 파일을 사용하는 경우에도 방 크기를 입력해야 합니다. 
              입력된 크기는 가구 배치 시 참고 치수로 사용됩니다.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>설명</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="search-input w-full"
              rows={3}
              placeholder="프로젝트에 대한 간단한 설명 (선택사항)"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="category-button flex-1"
              disabled={isSubmitting}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="category-button flex-1 disabled:opacity-50"
              style={{ background: 'var(--accent-primary)', color: 'white', borderColor: 'var(--accent-primary)' }}
            >
              {isSubmitting ? uploadProgress || '생성 중...' : '생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
