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
        if (d.id !== user.userId) { // 본인 제외
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

  const myAnswer = answers.find(a => a.userId === currentUser?.userId);

  const handleAnswerTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setAnswerText(value);

    if (currentUser) {
      // 타이핑 상태 업데이트
      updateTypingStatus(currentUser.userId, currentUser.nickname, value.length > 0);
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerText.trim() || !currentUser) return;

    setSubmitting(true);
    try {
      // 타이핑 상태 제거
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

  // 타이핑 중인 사람들 목록
  const typingNicknames = Object.values(typingUsers).map(u => u.nickname);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>
          <div className="text-gray-500 mb-2">로딩중...</div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <div className="min-h-screen flex items-center justify-center">로딩중...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="text-sm text-gray-500 mb-2">오늘의 질문</div>
          <h1 className="text-2xl font-bold text-gray-900">
            {question || '로딩중...'}
          </h1>
        </div>

        {!myAnswer ? (
          // 답변 작성 폼
          <div className="space-y-6">
            {/* 타이핑 인디케이터 */}
            {typingNicknames.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-500 px-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                </div>
                <span>
                  {typingNicknames.join(', ')}님이 답변 작성 중...
                </span>
              </div>
            )}

            <form onSubmit={handleSubmitAnswer} className="bg-white rounded-lg border-2 border-yellow-400 p-6 shadow-sm">
              <textarea
                value={answerText}
                onChange={handleAnswerTextChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="당신의 답변을 작성하세요..."
                rows={4}
                maxLength={500}
              />
              <div className="flex justify-between items-center mt-4">
                <span className="text-sm text-gray-500">
                  {answerText.length}/500
                </span>
                <button
                  type="submit"
                  disabled={!answerText.trim() || submitting}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? '제출중...' : '답변하기'}
                </button>
              </div>
            </form>

            {answers.length > 0 && (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">
                  {answers.length}명이 이미 답했어요
                </p>
                <div className="space-y-3">
                  {answers.map(answer => (
                    <div key={answer.id} className="bg-white rounded-lg p-6 blur-sm select-none">
                      <div className="font-medium text-gray-900 mb-2">{answer.nickname}</div>
                      <div className="text-gray-700">{answer.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          // 답변 리스트
          <div className="space-y-4">
            <div className="text-sm text-gray-500 mb-4">
              {answers.length}개의 답변
            </div>
            {answers.map(answer => (
              <div
                key={answer.id}
                onClick={() => router.push(`/answer/${answer.id}`)}
                className={`bg-white rounded-lg p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${
                  answer.userId === currentUser.userId ? 'border-2 border-blue-400' : 'border border-gray-200'
                }`}
              >
                <div className="font-medium text-gray-900 mb-2">
                  {answer.nickname}
                  {answer.userId === currentUser.userId && (
                    <span className="ml-2 text-sm text-blue-600">(나)</span>
                  )}
                </div>
                <div className="text-gray-700">{answer.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
