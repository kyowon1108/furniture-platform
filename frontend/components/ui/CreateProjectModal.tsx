'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { projectsAPI, filesAPI } from '@/lib/api';

interface CreateProjectModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateProjectModal({ onClose, onSuccess }: CreateProjectModalProps) {
  const [creationMode, setCreationMode] = useState<'3d' | 'room-builder'>('room-builder');
  // PLY 기능 주석 처리 - 기본값을 glb로 변경
  // const [fileType, setFileType] = useState<'ply' | 'glb'>('ply');
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
      /* PLY 파일 처리 주석 처리
      if (fileName.endsWith('.ply')) {
        setFileType('ply');
        setFile3D(file);
        setError('');
        setFormData({
          ...formData,
          room_width: 0,
          room_height: 0,
          room_depth: 0,
        });
      } else */
      if (fileName.endsWith('.glb') || fileName.endsWith('.gltf')) {
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
        // PLY 에러 메시지 주석 처리
        // setError('PLY 또는 GLB 파일만 업로드 가능합니다');
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

      // Step 1: Create project
      setUploadProgress('프로젝트 생성 중...');
      const projectData = {
        ...formData,
        has_3d_file: creationMode === '3d',
        file_type: creationMode === '3d' ? fileType : null,
        has_ply_file: creationMode === '3d' && fileType === 'ply', // Legacy support
        // For room-builder mode, set temporary dimensions
        room_width: creationMode === 'room-builder' ? 0 : formData.room_width,
        room_height: creationMode === 'room-builder' ? 0 : formData.room_height,
        room_depth: creationMode === 'room-builder' ? 0 : formData.room_depth,
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

      // Navigate to room builder for room-builder mode, otherwise to editor
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
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setCreationMode('room-builder');
              }}
              className="flex-1 px-3 py-3 transition-all"
              style={{
                borderRadius: 'var(--radius-lg)',
                border: `2px solid ${creationMode === 'room-builder' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                background: creationMode === 'room-builder' ? 'var(--accent-light)' : 'var(--bg-secondary)',
                color: creationMode === 'room-builder' ? 'var(--accent-primary)' : 'var(--text-primary)'
              }}
            >
              <div className="font-semibold">방 구조 디자인</div>
              <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>3D 룸 빌더로 생성</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setCreationMode('3d');
                // 3D 모드 선택 시 방 크기를 0으로 설정 (자동 감지)
                setFormData({
                  ...formData,
                  room_width: 0,
                  room_height: 0,
                  room_depth: 0,
                });
              }}
              className="flex-1 px-3 py-3 transition-all"
              style={{
                borderRadius: 'var(--radius-lg)',
                border: `2px solid ${creationMode === '3d' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                background: creationMode === '3d' ? 'var(--accent-light)' : 'var(--bg-secondary)',
                color: creationMode === '3d' ? 'var(--accent-primary)' : 'var(--text-primary)'
              }}
            >
              <div className="font-semibold">3D 파일</div>
              {/* PLY 관련 텍스트 주석 처리 */}
              {/* <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>PLY 또는 GLB 파일</div> */}
              <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>GLB 파일 업로드</div>
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
                {/* PLY 관련 라벨 주석 처리 */}
                {/* 3D 파일 * (PLY 또는 GLB) */}
                3D 파일 * (GLB)
              </label>
              <input
                type="file"
                /* PLY accept 주석 처리 */
                /* accept=".ply,.glb,.gltf" */
                accept=".glb,.gltf"
                onChange={handleFileChange}
                className="search-input w-full"
                required
              />
              {file3D && (
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    선택된 파일: {file3D.name} ({(file3D.size / 1024 / 1024).toFixed(2)} MB)
                    <span className="ml-2 px-2 py-0.5 rounded text-xs" style={{
                      /* PLY 조건부 스타일 주석 처리 */
                      /* background: fileType === 'ply' ? '#dbeafe' : '#fef3c7', */
                      /* color: fileType === 'ply' ? '#1e40af' : '#92400e' */
                      background: '#fef3c7',
                      color: '#92400e'
                    }}>
                      {fileType.toUpperCase()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFile3D(null);
                    }}
                    className="text-sm px-3 py-1 rounded hover:opacity-80 transition-opacity"
                    style={{
                      background: 'var(--error)',
                      color: 'white',
                      border: 'none'
                    }}
                  >
                    제거
                  </button>
                </div>
              )}
              <div className="mt-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {/* PLY 설명 주석 처리 */}
                {/* <strong>PLY:</strong> 3D 스캔된 방 (Point Cloud, Gaussian Splatting)
                <br /> */}
                <strong>GLB:</strong> 3D 모델링 소프트웨어 출력 (Blender, SketchUp 등)
                <br />
                <span className="text-xs">개발/시연용으로 파일 크기 제한이 없습니다.</span>
              </div>
            </div>
          )}

          {/* 수동 입력 모드 제거 - 방 구조 디자인과 3D 파일 업로드만 지원 */}

          {/* 3D 파일이 선택되었을 때 안내 메시지 표시 */}
          {creationMode === '3d' && file3D && (
            <div style={{
              background: '#dcfce7',
              border: '1px solid #16a34a',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem',
              fontSize: '0.875rem',
              color: '#15803d'
            }}>
              <strong>✅ 3D 파일이 선택되었습니다</strong>
              <br />
              방 크기는 자동으로 감지됩니다. 3D 파일의 실제 크기 정보를 사용하여 가구 배치 영역을 설정합니다.
              <br /><br />
              {/* PLY 처리 설명 주석 처리 */}
              {/* <strong>{fileType === 'glb' ? 'GLB' : 'PLY'} 처리:</strong> {fileType === 'glb' ? '1:1 스케일 유지 → 텍스처 및 materials 보존 → 반투명 렌더링' : 'Gaussian Splatting 자동 변환 → 메쉬 생성 → 반투명 렌더링'} */}
              <strong>GLB 처리:</strong> 1:1 스케일 유지 → 텍스처 및 materials 보존 → 반투명 렌더링
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
