'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getOrCreateUser, setNickname } from '@/lib/user';
import Image from 'next/image';

export default function HomePage() {
  const router = useRouter();
  const [nickname, setNicknameInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const user = getOrCreateUser();
    if (user?.nickname) {
      router.push('/home');
    } else {
      setLoading(false);
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    setError('');
    setLoading(true);

    const user = getOrCreateUser();
    if (!user) return;

    const success = await setNickname(user.userId, nickname.trim());

    if (success) {
      router.push('/home');
    } else {
      setError('이미 사용 중인 닉네임입니다. 다른 닉네임을 선택해주세요.');
      setLoading(false);
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
      <div className="w-full max-w-sm min-w-[320px] bg-white/80 backdrop-blur-sm border border-gray-200 rounded-3xl px-10 py-14">
        {/* 로고 */}
        <div className="flex justify-center mb-6">
          <Image
            src="/logo.png"
            alt="OOTQ Logo"
            width={70}
            height={70}
            className="object-contain"
          />
        </div>

        {/* 타이틀 */}
        <h1 className="text-3xl text-center mb-2 text-on-surface leading-tight" style={{ fontFamily: 'var(--font-gamja-flower)' }}>
          반가워요!<br />당신의 이름은?
        </h1>

        {/* 서브텍스트 */}
        <p className="text-center text-gray-600 mb-8 text-xs" style={{ fontFamily: 'var(--font-work-sans)' }}>
          OOTQ에서 사용할 닉네임을 알려주세요.
        </p>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => {
                setNicknameInput(e.target.value);
                setError(''); // 입력 시 에러 메시지 제거
              }}
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-gray-400 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
              placeholder="닉네임을 입력하세요"
              autoFocus
              maxLength={20}
              style={{ fontFamily: 'var(--font-work-sans)' }}
            />
            {error && (
              <p className="text-red-500 text-xs mt-2" style={{ fontFamily: 'var(--font-work-sans)' }}>
                {error}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={!nickname.trim() || loading}
            className="w-full bg-[#7ef66e] text-gray-800 py-3.5 rounded-full font-medium text-sm hover:bg-[#6ee55d] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-all"
            style={{ fontFamily: 'var(--font-work-sans)' }}
          >
            {loading ? '확인중...' : '시작하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
