'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { getOrCreateUser } from '@/lib/user';
import { updateTypingStatus, clearTypingStatus } from '@/lib/typing';

interface Answer {
  id: string;
  userId: string;
  nickname: string;
  text: string;
  createdAt: any;
}

interface TypingUser {
  nickname: string;
  updatedAt: any;
}

export default function Home() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ userId: string; nickname: string } | null>(null);
  const [question, setQuestion] = useState<string>('');
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [typingUsers, setTypingUsers] = useState<Record<string, TypingUser>>({});

  useEffect(() => {
    const user = getOrCreateUser();
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
      }
    };
    fetchQuestion();

    // 답변 실시간 구독
    const q = query(collection(db, 'answers'), orderBy('createdAt', 'desc'));
    const unsubAnswers = onSnapshot(
      q,
      (snap) => {
        const answersList = snap.docs.map(d => ({
          id: d.id,
          ...d.data()
        } as Answer));
        setAnswers(answersList);
        setLoading(false);
      },
      (err) => {
        console.error('답변 구독 실패:', err);
        setError('답변을 불러오는데 실패했습니다.');
        setLoading(false);
      }
    );

    // 타이핑 상태 실시간 구독
    const typingQuery = query(collection(db, 'typing'));
    const unsubTyping = onSnapshot(typingQuery, (snap) => {
      const typing: Record<string, TypingUser> = {};
      snap.docs.forEach(d => {
        if (d.id !== user.userId) {
          typing[d.id] = d.data() as TypingUser;
        }
      });
      setTypingUsers(typing);
    });

    return () => {
      unsubAnswers();
      unsubTyping();
      if (user?.userId) {
        clearTypingStatus(user.userId);
      }
    };
  }, [router]);

  const handleAnswerTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setAnswerText(value);

    if (currentUser) {
      updateTypingStatus(currentUser.userId, currentUser.nickname, value.length > 0);
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerText.trim() || !currentUser) return;

    setSubmitting(true);
    try {
      clearTypingStatus(currentUser.userId);

      await addDoc(collection(db, 'answers'), {
        userId: currentUser.userId,
        nickname: currentUser.nickname,
        text: answerText.trim(),
        createdAt: serverTimestamp(),
      });
      setAnswerText('');
    } catch (error) {
      console.error('답변 제출 실패:', error);
      alert('답변 제출에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const typingNicknames = Object.values(typingUsers).map(u => u.nickname);
  const myAnswer = answers.find(a => a.userId === currentUser?.userId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div>
          <div className="text-on-surface-variant mb-2" style={{ fontFamily: 'var(--font-work-sans)' }}>로딩중...</div>
          {error && <div className="text-error text-sm" style={{ fontFamily: 'var(--font-work-sans)' }}>{error}</div>}
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <div className="min-h-screen flex items-center justify-center bg-surface" style={{ fontFamily: 'var(--font-work-sans)' }}>로딩중...</div>;
  }

  return (
    <div className="min-h-screen bg-surface py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* 질문 헤더 */}
        <div className="mb-8 bg-white border-2 border-secondary rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(93,95,87,1)]">
          <div className="text-xs font-bold mb-2 text-on-surface-variant uppercase tracking-wider" style={{ fontFamily: 'var(--font-work-sans)' }}>오늘의 질문</div>
          <h1 className="text-3xl text-on-surface" style={{ fontFamily: 'var(--font-gamja-flower)', lineHeight: '1.2' }}>
            {question || '로딩중...'}
          </h1>
        </div>

        {!myAnswer ? (
          // 답변 작성 폼
          <div className="space-y-6">
            {/* 타이핑 인디케이터 */}
            {typingNicknames.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-on-surface-variant px-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                </div>
                <span style={{ fontFamily: 'var(--font-work-sans)' }}>
                  {typingNicknames.join(', ')}님이 답변 작성 중...
                </span>
              </div>
            )}

            <form onSubmit={handleSubmitAnswer} className="bg-tertiary-container border-2 border-secondary rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(93,95,87,1)]">
              <textarea
                value={answerText}
                onChange={handleAnswerTextChange}
                className="w-full px-4 py-3 bg-white border-2 border-secondary rounded-lg focus:outline-none focus:border-primary resize-none text-on-surface"
                placeholder="당신의 답변을 작성하세요..."
                rows={4}
                maxLength={500}
                style={{ fontFamily: 'var(--font-work-sans)' }}
              />
              <div className="flex justify-between items-center mt-4">
                <span className="text-sm text-on-surface-variant font-semibold" style={{ fontFamily: 'var(--font-work-sans)' }}>
                  {answerText.length}/500
                </span>
                <button
                  type="submit"
                  disabled={!answerText.trim() || submitting}
                  className="bg-primary text-on-primary px-8 py-3 rounded-full font-bold border-2 border-secondary hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:bg-surface-dim disabled:text-on-surface-variant disabled:cursor-not-allowed transition-all shadow-[3px_3px_0px_0px_rgba(93,95,87,1)]"
                  style={{ fontFamily: 'var(--font-work-sans)' }}
                >
                  {submitting ? '제출중...' : '답변하기'}
                </button>
              </div>
            </form>

            {answers.length > 0 && (
              <div className="text-center py-8">
                <p className="text-on-surface-variant mb-6 font-semibold" style={{ fontFamily: 'var(--font-work-sans)' }}>
                  {answers.length}명이 이미 답했어요
                </p>
                <div className="space-y-4">
                  {answers.map(answer => (
                    <div key={answer.id} className="bg-surface-container-high rounded-lg p-6 blur-sm select-none border-2 border-outline-variant">
                      <div className="font-bold text-on-surface mb-2" style={{ fontFamily: 'var(--font-work-sans)' }}>{answer.nickname}</div>
                      <div className="text-on-surface-variant" style={{ fontFamily: 'var(--font-work-sans)' }}>{answer.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          // 답변 리스트
          <div className="space-y-4">
            <div className="text-sm text-on-surface-variant mb-4 font-semibold" style={{ fontFamily: 'var(--font-work-sans)' }}>
              {answers.length}개의 답변
            </div>
            {answers.map(answer => (
              <div
                key={answer.id}
                onClick={() => router.push(`/answer/${answer.id}`)}
                className={`bg-white rounded-lg p-6 cursor-pointer transition-all border-2 ${
                  answer.userId === currentUser.userId
                    ? 'border-primary shadow-[4px_4px_0px_0px_rgba(0,110,2,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,110,2,1)]'
                    : 'border-secondary shadow-[3px_3px_0px_0px_rgba(93,95,87,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_rgba(93,95,87,1)]'
                }`}
              >
                <div className="font-bold text-on-surface mb-2" style={{ fontFamily: 'var(--font-work-sans)' }}>
                  {answer.nickname}
                  {answer.userId === currentUser.userId && (
                    <span className="ml-2 text-sm text-primary font-normal">(나)</span>
                  )}
                </div>
                <div className="text-on-surface" style={{ fontFamily: 'var(--font-work-sans)' }}>{answer.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
