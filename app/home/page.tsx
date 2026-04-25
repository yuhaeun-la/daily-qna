'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { getOrCreateUser } from '@/lib/user';
import Image from 'next/image';

interface Answer {
  id: string;
  userId: string;
  nickname: string;
  text: string;
  createdAt: any;
}

export default function Home() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ userId: string; nickname: string } | null>(null);
  const [question, setQuestion] = useState<string>('');
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const user = getOrCreateUser();
    console.log('👤 현재 사용자:', user);
    if (!user?.nickname) {
      router.push('/');
      return;
    }
    setCurrentUser(user as { userId: string; nickname: string });

    // 오늘의 질문 가져오기
    const fetchQuestion = async () => {
      try {
        const questionDoc = await getDoc(doc(db, 'todayQuestion', 'current'));
        if (questionDoc.exists()) {
          setQuestion(questionDoc.data().text);
        } else {
          setQuestion('오늘의 질문을 불러올 수 없습니다.');
        }
      } catch (err) {
        console.error('질문 로드 실패:', err);
        setError('질문을 불러오는데 실패했습니다.');
        setLoading(false); // 에러 발생 시에도 로딩 해제
      }
    };
    fetchQuestion();

    // 타임아웃으로 무한 로딩 방지 (3초로 단축)
    const loadingTimeout = setTimeout(() => {
      console.warn('⏰ Firebase 연결 타임아웃');
      setError('Firebase 연결이 느립니다. Firestore 규칙을 확인해주세요.');
      setLoading(false);
    }, 3000);

    // 답변 실시간 구독
    const q = query(collection(db, 'answers'), orderBy('createdAt', 'desc'));
    const unsubAnswers = onSnapshot(
      q,
      (snap) => {
        console.log('📝 답변 개수:', snap.docs.length);
        const answersList = snap.docs.map(d => ({
          id: d.id,
          ...d.data()
        } as Answer));
        setAnswers(answersList);
        setLoading(false);
        clearTimeout(loadingTimeout);
      },
      (err) => {
        console.error('❌ 답변 구독 실패:', err);
        setError('답변을 불러오는데 실패했습니다: ' + err.message);
        setLoading(false);
        clearTimeout(loadingTimeout);
      }
    );

    return () => {
      clearTimeout(loadingTimeout);
      unsubAnswers();
    };
  }, [router]);

  const myAnswer = answers.find(a => a.userId === currentUser?.userId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <div className="text-on-surface-variant mb-2" style={{ fontFamily: 'var(--font-work-sans)' }}>로딩중...</div>
          {error && <div className="text-error text-sm mb-2" style={{ fontFamily: 'var(--font-work-sans)' }}>{error}</div>}
          <div className="text-xs text-on-surface-variant mt-4" style={{ fontFamily: 'var(--font-work-sans)' }}>
            Firebase 연결 중... (5초 후 자동 진행)
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <div className="min-h-screen flex items-center justify-center bg-surface" style={{ fontFamily: 'var(--font-work-sans)' }}>로딩중...</div>;
  }

  // Get character color based on user ID
  const getCharacterColor = (userId: string): 'purple' | 'green' | 'blue' => {
    const colors: ('purple' | 'green' | 'blue')[] = ['purple', 'green', 'blue'];
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const totalUsers = 3; // Total expected users for the demo

  return (
    <div className="min-h-screen bg-[#f9fbed] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* 질문 헤더 */}
        <div className="mb-6 bg-white border-2 border-black rounded-3xl p-8 relative">
          <div className="absolute -top-3 left-6 bg-[#7ef66e] border-2 border-black rounded-full px-4 py-1">
            <span className="text-sm font-bold" style={{ fontFamily: 'var(--font-work-sans)' }}>오늘의 질문!</span>
          </div>
          <h1 className="text-2xl text-on-surface mt-2" style={{ fontFamily: 'var(--font-gamja-flower)', lineHeight: '1.4' }}>
            {question || '로딩중...'}
          </h1>
        </div>

        {!myAnswer ? (
          // 답변 작성 전 - 캐릭터 아바타와 버튼 표시
          <div className="space-y-6 flex flex-col items-center">
            {/* 캐릭터 아바타들 */}
            <div className="flex gap-4 justify-center">
              {Array.from({ length: totalUsers }).map((_, idx) => {
                const answer = answers[idx];
                const isAnswered = !!answer;
                const characterColor = answer ? getCharacterColor(answer.userId) : 'purple';

                return (
                  <div key={idx} className="flex flex-col items-center">
                    <Image
                      src={isAnswered ? `/characters/${characterColor}.png` : '/characters/purple.png'}
                      alt={`Character ${idx + 1}`}
                      width={80}
                      height={80}
                      className={`object-contain ${!isAnswered ? 'opacity-30 grayscale' : ''}`}
                    />
                  </div>
                );
              })}
            </div>

            {/* 답변 카운터 */}
            <p className="text-gray-600 text-lg" style={{ fontFamily: 'var(--font-gamja-flower)' }}>
              {answers.length}/{totalUsers}명이 답했어요
            </p>

            {/* 답변하기 버튼 */}
            <button
              onClick={() => router.push('/write')}
              className="bg-[#7ef66e] text-gray-800 px-16 py-4 rounded-full font-bold text-lg hover:bg-[#6ee55d] transition-all border-2 border-black"
              style={{ fontFamily: 'var(--font-gamja-flower)' }}
            >
              나도 답변하기
            </button>
          </div>
        ) : (
          // 답변 리스트
          <div className="space-y-4">
            {answers.map(answer => {
              const characterColor = getCharacterColor(answer.userId);
              const isMyAnswer = answer.userId === currentUser.userId;

              return (
                <div
                  key={answer.id}
                  onClick={() => router.push(`/answer/${answer.id}`)}
                  className="bg-white rounded-3xl p-6 cursor-pointer transition-all border-2 border-black hover:shadow-lg"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <Image
                      src={`/characters/${characterColor}.png`}
                      alt={answer.nickname}
                      width={40}
                      height={40}
                      className="object-contain"
                    />
                    <div className="font-bold text-on-surface" style={{ fontFamily: 'var(--font-work-sans)' }}>
                      {answer.nickname}
                      {isMyAnswer && (
                        <span className="ml-2 text-sm text-gray-500 font-normal">(나)</span>
                      )}
                    </div>
                  </div>
                  <div
                    className={`text-on-surface pl-2 ${isMyAnswer ? 'border-l-4 border-[#7ef66e]' : ''}`}
                    style={{ fontFamily: 'var(--font-gamja-flower)', fontSize: '16px', lineHeight: '1.6' }}
                  >
                    {answer.text}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
