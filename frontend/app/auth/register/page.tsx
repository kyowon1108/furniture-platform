'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function RegisterPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await authAPI.register(email, password, fullName);
      // Auto-login after registration
      await login(email, password);
      router.push('/projects');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'linear-gradient(135deg, var(--accent-light) 0%, #e0e7ff 100%)'
    }}>
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-xl)',
        padding: '2rem',
        width: '100%',
        maxWidth: '28rem'
      }}>
        <h1 className="text-3xl font-bold text-center mb-8" style={{ color: 'var(--text-primary)' }}>
          🏠 회원가입
        </h1>

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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              이름
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="search-input w-full"
              placeholder="홍길동"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="search-input w-full"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="search-input w-full"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="category-button active w-full disabled:opacity-50"
            style={{ padding: '0.75rem', fontSize: '1rem', fontWeight: '600' }}
          >
            {isLoading ? '계정 생성 중...' : '회원가입'}
          </button>
        </form>

        <p className="mt-6 text-center" style={{ color: 'var(--text-secondary)' }}>
          이미 계정이 있으신가요?{' '}
          <Link href="/auth/login" style={{ color: 'var(--accent-primary)', fontWeight: '500' }} className="hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
