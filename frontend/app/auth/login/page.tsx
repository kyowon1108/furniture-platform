'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';

// 에러 메시지 한국어 변환
const getErrorMessage = (error: any): string => {
  const detail = error?.response?.data?.detail;

  if (typeof detail === 'string') {
    // 일반적인 에러 메시지 매핑
    if (detail.toLowerCase().includes('incorrect') || detail.toLowerCase().includes('invalid')) {
      return '이메일 또는 비밀번호가 올바르지 않습니다.';
    }
    if (detail.toLowerCase().includes('not found') || detail.toLowerCase().includes('no user')) {
      return '등록되지 않은 이메일입니다.';
    }
    if (detail.toLowerCase().includes('password')) {
      return '비밀번호가 올바르지 않습니다.';
    }
    return detail;
  }

  // 네트워크 에러
  if (error?.code === 'ERR_NETWORK' || error?.message?.includes('Network')) {
    return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.';
  }

  return '로그인에 실패했습니다. 다시 시도해주세요.';
};

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);

  // 에러 발생 시 흔들림 효과
  useEffect(() => {
    if (error) {
      setShake(true);
      const timer = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      router.push('/projects');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(getErrorMessage(err));
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
            <div className="mb-6 p-4 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 text-sm animate-fadeIn">
              <div className="flex items-start gap-3">
                <span className="text-lg flex-shrink-0">⚠️</span>
                <div className="flex-1 font-medium">{error}</div>
                <button
                  type="button"
                  onClick={() => setError('')}
                  className="text-red-400/60 hover:text-red-300 transition-colors flex-shrink-0"
                  aria-label="에러 메시지 닫기"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className={`space-y-6 ${shake ? 'animate-shake' : ''}`}>
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
