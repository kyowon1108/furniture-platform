'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

export function Navbar() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  return (
    <nav style={{ 
      background: 'linear-gradient(135deg, var(--accent-primary) 0%, #6366f1 100%)',
      color: 'white',
      padding: '1rem',
      boxShadow: 'var(--shadow-lg)'
    }}>
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold hover:opacity-90 transition-opacity">
            🏠 가구 배치 플랫폼
          </Link>
          {user && (
            <Link
              href="/projects"
              className="hover:opacity-90 transition-opacity font-medium"
            >
              내 프로젝트
            </Link>
          )}
        </div>

        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm opacity-90">
              {user.full_name || user.email}
            </span>
            <button
              onClick={handleLogout}
              className="toolbar-button"
              style={{ background: 'var(--error)', color: 'white', borderColor: 'var(--error)' }}
            >
              로그아웃
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
