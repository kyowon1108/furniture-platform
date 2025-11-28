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
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/20 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold text-white hover:text-[var(--accent-primary)] transition-colors flex items-center gap-2">
            <span>🏠</span>
            <span>방구석 전문가</span>
          </Link>
          {user && (
            <Link
              href="/projects"
              className="text-[var(--text-secondary)] hover:text-white transition-colors font-medium"
            >
              나의 공간 보관함
            </Link>
          )}
        </div>

        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-[var(--text-secondary)]">
              {user.full_name || user.email}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
            >
              로그아웃
            </button>
          </div>
        )}
      </div>
    </nav >
  );
}
