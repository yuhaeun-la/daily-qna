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
      <div className="max-w-md w-full">
        <h1 className="text-5xl font-display text-center mb-12 text-on-surface" style={{ fontFamily: 'Gamja Flower' }}>
          일일 문답
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="nickname" className="block text-sm font-body font-bold mb-3 text-on-surface-variant uppercase tracking-wide">
              닉네임을 입력하세요
            </label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNicknameInput(e.target.value)}
              className="w-full px-4 py-3 bg-white border-2 border-secondary rounded-lg font-body text-on-surface focus:outline-none focus:border-primary transition-colors shadow-[2px_2px_0px_0px_rgba(93,95,87,1)]"
              placeholder="예: 지혜"
              autoFocus
              maxLength={20}
              style={{ fontFamily: 'Work Sans' }}
            />
          </div>
          <button
            type="submit"
            disabled={!nickname.trim()}
            className="w-full bg-primary-container text-on-primary-container py-4 rounded-full font-body font-bold text-lg border-2 border-secondary hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:bg-surface-dim disabled:text-on-surface-variant disabled:cursor-not-allowed transition-all shadow-[4px_4px_0px_0px_rgba(93,95,87,1)]"
            style={{ fontFamily: 'Work Sans' }}
          >
            시작하기
          </button>
        </form>
      </div>
    </div>
  );
}
