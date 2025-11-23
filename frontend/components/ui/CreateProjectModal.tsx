'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { projectsAPI, filesAPI } from '@/lib/api';

interface CreateProjectModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateProjectModal({ onClose, onSuccess }: CreateProjectModalProps) {
  const [creationMode, setCreationMode] = useState<'manual' | '3d'>('manual');
  const [fileType, setFileType] = useState<'ply' | 'glb'>('ply');
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
      if (fileName.endsWith('.ply')) {
        setFileType('ply');
        setFile3D(file);
        setError('');
      } else if (fileName.endsWith('.glb') || fileName.endsWith('.gltf')) {
        setFileType('glb');
        setFile3D(file);
        setError('');
        // GLB 파일은 실제 크기 정보를 포함하므로 자동 감지를 위해 0으로 설정
        setFormData({
          ...formData,
          room_width: 0,
          room_height: 0,
          room_depth: 0,
        });
      } else {
        setError('PLY 또는 GLB 파일만 업로드 가능합니다');
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

      // Step 1: Create project
      setUploadProgress('프로젝트 생성 중...');
      const projectData = {
        ...formData,
        has_3d_file: creationMode === '3d',
        file_type: creationMode === '3d' ? fileType : null,
        has_ply_file: creationMode === '3d' && fileType === 'ply', // Legacy support
      };
      const project = await projectsAPI.create(projectData);

      // Step 2: Upload 3D file if in 3D mode
      if (creationMode === '3d' && file3D) {
        setUploadProgress(`${fileType.toUpperCase()} 파일 업로드 중...`);
        
        // Use new unified API
        const formData = new FormData();
        formData.append('file', file3D);
        
        const token = localStorage.getItem('token');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8008/api/v1';
        
        const response = await fetch(`${apiUrl}/files/upload-3d/${project.id}`, {
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
        
        const result = await response.json();
        console.log('Upload result:', result);
      }

      setUploadProgress('완료!');
      onSuccess();
      
      // Small delay to ensure database is updated before navigating
      await new Promise(resolve => setTimeout(resolve, 500));
      
      router.push(`/editor/${project.id}`);
    } catch (err: any) {
      console.error('Failed to create project:', err);
      setError(err.message || err.response?.data?.detail || '프로젝트 생성에 실패했습니다');
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
              onClick={() => {
                setCreationMode('manual');
                // 수동 입력 모드로 전환 시 기본값 복원
                if (formData.room_width === 0 && formData.room_height === 0 && formData.room_depth === 0) {
                  setFormData({
                    ...formData,
                    room_width: 5.0,
                    room_height: 3.0,
                    room_depth: 4.0,
                  });
                }
              }}
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
              onClick={() => setCreationMode('3d')}
              className="flex-1 px-4 py-3 transition-all"
              style={{
                borderRadius: 'var(--radius-lg)',
                border: `2px solid ${creationMode === '3d' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                background: creationMode === '3d' ? 'var(--accent-light)' : 'var(--bg-secondary)',
                color: creationMode === '3d' ? 'var(--accent-primary)' : 'var(--text-primary)'
              }}
            >
              <div className="font-semibold">3D 파일 업로드</div>
              <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>PLY 또는 GLB 파일</div>
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

          {creationMode === '3d' && (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                3D 파일 * (PLY 또는 GLB)
              </label>
              <input
                type="file"
                accept=".ply,.glb,.gltf"
                onChange={handleFileChange}
                className="search-input w-full"
                required
              />
              {file3D && (
                <div className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  선택된 파일: {file3D.name} ({(file3D.size / 1024 / 1024).toFixed(2)} MB)
                  <span className="ml-2 px-2 py-0.5 rounded text-xs" style={{ 
                    background: fileType === 'ply' ? '#dbeafe' : '#fef3c7',
                    color: fileType === 'ply' ? '#1e40af' : '#92400e'
                  }}>
                    {fileType.toUpperCase()}
                  </span>
                </div>
              )}
              <div className="mt-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                <strong>PLY:</strong> 3D 스캔된 방 (Point Cloud, Gaussian Splatting)
                <br />
                <strong>GLB:</strong> 3D 모델링 소프트웨어 출력 (Blender, SketchUp 등)
                <br />
                <span className="text-xs">개발/시연용으로 파일 크기 제한이 없습니다.</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                폭 (m) * {creationMode === '3d' && <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>(0 = 자동)</span>}
              </label>
              <input
                type="number"
                step="0.1"
                min={creationMode === '3d' ? "0" : "1"}
                max="50"
                value={formData.room_width}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  setFormData({
                    ...formData,
                    room_width: isNaN(value) ? 0 : value,
                  });
                }}
                className="search-input w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                높이 (m) * {creationMode === '3d' && <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>(0 = 자동)</span>}
              </label>
              <input
                type="number"
                step="0.1"
                min={creationMode === '3d' ? "0" : "2"}
                max="10"
                value={formData.room_height}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  setFormData({
                    ...formData,
                    room_height: isNaN(value) ? 0 : value,
                  });
                }}
                className="search-input w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                깊이 (m) * {creationMode === '3d' && <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>(0 = 자동)</span>}
              </label>
              <input
                type="number"
                step="0.1"
                min={creationMode === '3d' ? "0" : "1"}
                max="50"
                value={formData.room_depth}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  setFormData({
                    ...formData,
                    room_depth: isNaN(value) ? 0 : value,
                  });
                }}
                className="search-input w-full"
                required
              />
            </div>
          </div>

          {creationMode === '3d' && (
            <div style={{
              background: fileType === 'glb' ? '#dbeafe' : '#fef3c7',
              border: `1px solid ${fileType === 'glb' ? '#3b82f6' : 'var(--warning)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem',
              fontSize: '0.875rem',
              color: fileType === 'glb' ? '#1e40af' : '#92400e'
            }}>
              {fileType === 'glb' ? (
                <>
                  <strong>✨ GLB 파일 자동 감지:</strong> GLB 파일에 포함된 실제 크기 정보를 자동으로 사용합니다.
                  <br />
                  방 크기를 <strong>0, 0, 0</strong>으로 설정하면 GLB 파일의 실제 크기가 자동으로 적용됩니다.
                  <br /><br />
                  <strong>권장:</strong> 방 크기를 모두 0으로 설정하세요. (자동 감지)
                  <br />
                  <strong>GLB 처리:</strong> 1:1 스케일 유지 → 텍스처 및 materials 보존 → 반투명 렌더링
                </>
              ) : (
                <>
                  <strong>참고:</strong> PLY 파일을 사용하는 경우 방 크기를 입력해야 합니다. 
                  입력된 크기는 가구 배치 시 참고 치수로 사용됩니다.
                  <br /><br />
                  <strong>PLY 처리:</strong> Gaussian Splatting 자동 변환 → 메쉬 생성 → 반투명 렌더링
                </>
              )}
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
