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
      // 이미 닉네임 있으면 /home으로
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">로딩중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-8">
          일일 문답
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-2">
              닉네임을 입력하세요
            </label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNicknameInput(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="예: 지혜"
              autoFocus
              maxLength={20}
            />
          </div>
          <button
            type="submit"
            disabled={!nickname.trim()}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            시작하기
          </button>
        </form>
      </div>
    </div>
  );
}
