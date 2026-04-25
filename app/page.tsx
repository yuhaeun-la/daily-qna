'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getOrCreateUser, setNickname } from '@/lib/user';

export default function HomePage() {
  const router = useRouter();
  const [nickname, setNicknameInput] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getOrCreateUser();
    if (user?.nickname) {
      router.push('/home');
    } else {
      setLoading(false);
    }
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim()) {
      setNickname(nickname.trim());
      router.push('/home');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-on-surface-variant font-body">로딩중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="max-w-md w-full bg-white border-2 border-secondary rounded-2xl p-10 shadow-[3px_3px_0px_0px_rgba(93,95,87,1)]">
        {/* 아이콘 */}
        <div className="flex justify-center mb-6">
          <div className="text-6xl">👋</div>
        </div>

        {/* 타이틀 */}
        <h1 className="text-4xl text-center mb-3 text-on-surface leading-tight" style={{ fontFamily: 'var(--font-gamja-flower)' }}>
          반가워요! 당신의<br />이름은?
        </h1>

        {/* 서브텍스트 */}
        <p className="text-center text-on-surface-variant mb-8 text-sm" style={{ fontFamily: 'var(--font-work-sans)' }}>
          Haru에서 사용할 닉네임을 알려주세요.
        </p>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            id="nickname"
            value={nickname}
            onChange={(e) => setNicknameInput(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-outline-variant rounded-lg text-on-surface-variant focus:outline-none focus:border-primary transition-colors text-sm"
            placeholder="닉네임을 입력하세요"
            autoFocus
            maxLength={20}
            style={{ fontFamily: 'var(--font-work-sans)' }}
          />
          <button
            type="submit"
            disabled={!nickname.trim()}
            className="w-full bg-primary-container text-on-primary-container py-3.5 rounded-full font-bold text-base hover:opacity-90 disabled:bg-surface-dim disabled:text-on-surface-variant disabled:cursor-not-allowed transition-all"
            style={{ fontFamily: 'var(--font-work-sans)' }}
          >
            시작하기
          </button>
        </form>
      </div>
    </div>
  );
}
