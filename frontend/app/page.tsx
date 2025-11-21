import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24" style={{
      background: 'linear-gradient(135deg, var(--accent-light) 0%, #e0e7ff 100%)'
    }}>
      <div className="text-center space-y-8">
        <h1 className="text-6xl font-bold" style={{ color: 'var(--text-primary)' }}>
          🏠 3D 가구 배치 플랫폼
        </h1>
        <p className="text-xl max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
          실시간 협업이 가능한 인터랙티브 3D 에디터로
          <br />
          가구 레이아웃을 디자인하고 공유하세요
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/auth/login"
            className="category-button active text-lg font-semibold"
            style={{ padding: '0.75rem 2rem', boxShadow: 'var(--shadow-md)' }}
          >
            시작하기
          </Link>
          <Link
            href="/auth/register"
            className="category-button text-lg font-semibold"
            style={{ 
              padding: '0.75rem 2rem',
              background: 'var(--bg-secondary)',
              color: 'var(--accent-primary)',
              borderColor: 'var(--accent-primary)',
              borderWidth: '2px',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            회원가입
          </Link>
        </div>
        <div className="mt-12 grid grid-cols-3 gap-8 max-w-3xl mx-auto">
          <div className="text-center p-6 transition-all" style={{
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-md)'
          }}>
            <div className="text-4xl mb-2">🎨</div>
            <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>직관적인 디자인</h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>드래그 앤 드롭으로 쉽게 배치</p>
          </div>
          <div className="text-center p-6 transition-all" style={{
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-md)'
          }}>
            <div className="text-4xl mb-2">🤝</div>
            <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>실시간 협업</h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>팀원과 함께 작업하기</p>
          </div>
          <div className="text-center p-6 transition-all" style={{
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-md)'
          }}>
            <div className="text-4xl mb-2">💾</div>
            <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>자동 저장</h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>작업 내용 자동 보관</p>
          </div>
        </div>
      </div>
    </main>
  );
}
