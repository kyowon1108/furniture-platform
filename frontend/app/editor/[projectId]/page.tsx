'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { EditorContainer } from '@/components/editor';

/**
 * Editor Page - handles routing and authentication
 * Delegates all business logic to EditorContainer
 */
export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = parseInt(params.projectId as string);

  const { isAuthenticated, isLoading, fetchUser } = useAuthStore();

  // Initialize auth on mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg-primary)' }}
      >
        <div className="text-xl" style={{ color: 'var(--text-primary)' }}>
          로딩 중...
        </div>
      </div>
    );
  }

  // Don't render editor until authenticated
  if (!isAuthenticated) {
    return null;
  }

  return <EditorContainer projectId={projectId} />;
}
