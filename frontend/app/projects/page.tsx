'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { projectsAPI } from '@/lib/api';
import { CreateProjectModal } from '@/components/ui/CreateProjectModal';
import { Navbar } from '@/components/ui/Navbar';
import type { Project } from '@/types/api';

export default function ProjectsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, fetchUser } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadProjects();
    }
  }, [isAuthenticated]);

  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      const data = await projectsAPI.list();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('이 프로젝트를 삭제하시겠습니까?')) return;

    try {
      await projectsAPI.delete(id);
      loadProjects();
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('프로젝트 삭제에 실패했습니다');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-xl" style={{ color: 'var(--text-primary)' }}>로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Navbar />

      <div className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>내 프로젝트</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="category-button active"
            style={{ 
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            + 새 프로젝트
          </button>
        </div>

        {loadingProjects ? (
          <div className="text-center py-12" style={{ color: 'var(--text-tertiary)' }}>
            프로젝트를 불러오는 중...
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-lg mb-4" style={{ color: 'var(--text-tertiary)' }}>
              아직 프로젝트가 없습니다
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="category-button active"
              style={{ 
                padding: '0.75rem 1.5rem',
                fontSize: '1rem'
              }}
            >
              첫 프로젝트 만들기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="overflow-hidden transition-all cursor-pointer"
                style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-md)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = 'var(--shadow-xl)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div
                  onClick={() => router.push(`/editor/${project.id}`)}
                  className="p-6"
                >
                  <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                    {project.name}
                  </h3>
                  <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                    {project.description || '설명 없음'}
                  </p>
                  <div className="text-sm mb-1" style={{ color: 'var(--text-tertiary)' }}>
                    방 크기: {project.room_width}m × {project.room_depth}m × {project.room_height}m
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    생성일: {new Date(project.created_at).toLocaleDateString('ko-KR')}
                  </div>
                </div>

                <div className="px-6 pb-4 flex gap-2">
                  <button
                    onClick={() => router.push(`/editor/${project.id}`)}
                    className="category-button flex-1 text-sm"
                    style={{ background: 'var(--success)', color: 'white', borderColor: 'var(--success)' }}
                  >
                    에디터 열기
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, project.id)}
                    className="category-button text-sm"
                    style={{ background: 'var(--error)', color: 'white', borderColor: 'var(--error)' }}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadProjects}
        />
      )}
    </div>
  );
}
