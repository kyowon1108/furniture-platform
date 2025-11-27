'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
      <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-white">
        <div className="animate-pulse">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#09090b] text-white overflow-hidden">
      {/* Background with Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Image
          src="/assets/landing_bg.png"
          alt="Background"
          fill
          className="object-cover opacity-40"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#09090b]/80 via-[#09090b]/90 to-[#09090b]" />
        <div
          className="absolute inset-0 opacity-20 mix-blend-overlay"
          style={{ backgroundImage: 'url(/assets/noise.png)' }}
        />
      </div>

      <div className="relative z-10">
        <Navbar />

        <div className="max-w-7xl mx-auto p-8">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">내 프로젝트</h1>
              <p className="text-[var(--text-secondary)]">
                진행 중인 인테리어 디자인 프로젝트를 관리하세요.
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-medium transition-all shadow-[var(--shadow-neon)] hover:-translate-y-1 flex items-center gap-2"
            >
              <span>+</span>
              <span>새 프로젝트</span>
            </button>
          </div>

          {loadingProjects ? (
            <div className="text-center py-20">
              <div className="inline-block w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-[var(--text-secondary)]">프로젝트를 불러오는 중...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-24 nano-glass rounded-2xl border border-dashed border-white/10">
              <div className="text-6xl mb-6">🎨</div>
              <h3 className="text-xl font-bold text-white mb-2">아직 프로젝트가 없습니다</h3>
              <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto">
                첫 번째 프로젝트를 생성하고 나만의 공간을 디자인해보세요.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[var(--accent-primary)] text-white rounded-xl font-medium transition-all"
              >
                첫 프로젝트 만들기
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => router.push(`/editor/${project.id}`)}
                  className="group relative nano-glass rounded-2xl border border-white/5 p-6 cursor-pointer transition-all hover:border-[var(--accent-primary)] hover:shadow-[var(--shadow-neon)] hover:-translate-y-1"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-xl bg-[var(--accent-light)] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      🏠
                    </div>
                    <div className="px-3 py-1 rounded-full bg-white/5 text-xs text-[var(--text-secondary)] border border-white/5">
                      {new Date(project.created_at).toLocaleDateString('ko-KR')}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[var(--accent-primary)] transition-colors">
                    {project.name}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] mb-6 line-clamp-2 h-10">
                    {project.description || '설명 없음'}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="text-xs text-[var(--text-tertiary)]">
                      {project.room_width}m × {project.room_depth}m × {project.room_height}m
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/editor/${project.id}`);
                        }}
                        className="px-3 py-1.5 bg-white/5 hover:bg-[var(--accent-primary)] text-white text-xs rounded-lg transition-colors"
                      >
                        열기
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, project.id)}
                        className="px-3 py-1.5 bg-white/5 hover:bg-red-500/80 text-white text-xs rounded-lg transition-colors"
                      >
                        삭제
                      </button>
                    </div>
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
    </div>
  );
}
