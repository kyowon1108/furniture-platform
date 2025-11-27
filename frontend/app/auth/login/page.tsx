'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      router.push('/projects');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background with Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/assets/landing_bg.png"
          alt="Background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
        <div
          className="absolute inset-0 opacity-20 mix-blend-overlay"
          style={{ backgroundImage: 'url(/assets/noise.png)' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="nano-glass p-8 rounded-2xl border border-[var(--border-color)] shadow-[var(--shadow-xl)] backdrop-blur-xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome Back
            </h1>
            <p className="text-[var(--text-secondary)]">
              다시 오신 것을 환영합니다!
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
              <span>⚠️</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-secondary)] ml-1">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:bg-white/10 outline-none transition-all"
                placeholder="your@email.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-secondary)] ml-1">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:bg-white/10 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-bold text-lg transition-all shadow-[var(--shadow-neon)] hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[var(--text-secondary)]">
              계정이 없으신가요?{' '}
              <Link
                href="/auth/register"
                className="text-[var(--accent-primary)] hover:text-[var(--accent-hover)] font-semibold hover:underline transition-colors"
              >
                회원가입
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
