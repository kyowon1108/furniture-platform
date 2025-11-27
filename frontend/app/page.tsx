import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
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

      {/* Content */}
      <div className="relative z-10 text-center space-y-12 max-w-5xl px-6">

        {/* Hero Section */}
        <div className="space-y-6 animate-float">
          <div className="inline-block px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-sm font-medium text-purple-300 mb-4">
            ✨ Next-Gen Interior Design
          </div>
          <h1 className="text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-purple-200 drop-shadow-lg">
            방구석 전문가
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            실시간 협업이 가능한 인터랙티브 3D 에디터로<br />
            당신의 공간을 <span className="text-purple-400 font-semibold">상상 그 이상</span>으로 디자인하세요.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-6 justify-center">
          <Link
            href="/auth/login"
            className="group relative px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold text-lg transition-all duration-300 shadow-[0_0_20px_rgba(124,58,237,0.5)] hover:shadow-[0_0_30px_rgba(124,58,237,0.7)] hover:-translate-y-1"
          >
            <span className="relative z-10">시작하기</span>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
          <Link
            href="/auth/register"
            className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/50 text-white rounded-xl font-semibold text-lg transition-all duration-300 backdrop-blur-md hover:-translate-y-1"
          >
            회원가입
          </Link>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
          {[
            { icon: "🎨", title: "직관적인 디자인", desc: "드래그 앤 드롭으로 누구나 쉽게" },
            { icon: "🤝", title: "실시간 협업", desc: "팀원과 함께 동시 편집" },
            { icon: "💡", title: "스마트 조명", desc: "다양한 시간대 시뮬레이션" }
          ].map((feature, idx) => (
            <div
              key={idx}
              className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 hover:border-purple-500/30 transition-all duration-300 group hover:-translate-y-2"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">{feature.icon}</div>
              <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
