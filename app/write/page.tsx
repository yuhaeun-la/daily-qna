'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getOrCreateUser } from '@/lib/user';
import Image from 'next/image';

export default function WritePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ userId: string; nickname: string } | null>(null);
  const [question, setQuestion] = useState<string>('');
  const [questionSubtitle, setQuestionSubtitle] = useState<string>('');
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Get character color based on user ID
  const getCharacterColor = (userId: string): 'purple' | 'green' | 'blue' => {
    const colors: ('purple' | 'green' | 'blue')[] = ['purple', 'green', 'blue'];
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

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
          // 서브타이틀은 하드코딩 (또는 Firestore에 추가 필드로 저장 가능)
          setQuestionSubtitle('하루의 작지만 소중한 기억을 친구들과 나눠보세요.');
        }
      } catch (err) {
        console.error('질문 로드 실패:', err);
      }
    };
    fetchQuestion();
  }, [router]);

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerText.trim() || !currentUser) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'answers'), {
        userId: currentUser.userId,
        nickname: currentUser.nickname,
        text: answerText.trim(),
        createdAt: serverTimestamp(),
      });
      // 답변 제출 후 홈으로 이동
      router.push('/home');
    } catch (error) {
      console.error('답변 제출 실패:', error);
      alert('답변 제출에 실패했습니다.');
      setSubmitting(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9fbed]">
        <div style={{ fontFamily: 'var(--font-work-sans)' }}>로딩중...</div>
      </div>
    );
  }

  const characterColor = getCharacterColor(currentUser.userId);

  return (
    <div className="min-h-screen bg-[#f9fbed] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* 뒤로 가기 버튼 */}
        <button
          type="button"
          onClick={() => router.push('/home')}
          className="mb-6 text-gray-600 hover:text-gray-800 cursor-pointer"
          style={{ fontFamily: 'var(--font-work-sans)' }}
        >
          ← 돌아가기
        </button>

        {/* 질문 카드 */}
        <div className="mb-6 bg-white border-2 border-black rounded-3xl p-8 relative flex items-start gap-4">
          {/* 캐릭터 아바타 */}
          <Image
            src={`/characters/${characterColor}.png`}
            alt="Character"
            width={60}
            height={60}
            className="object-contain flex-shrink-0"
          />

          <div className="flex-1">
            <h1 className="text-2xl text-on-surface mb-2" style={{ fontFamily: 'var(--font-gamja-flower)', lineHeight: '1.4' }}>
              {question || '로딩중...'}
            </h1>
            <p className="text-sm text-gray-500" style={{ fontFamily: 'var(--font-work-sans)' }}>
              {questionSubtitle}
            </p>
          </div>
        </div>

        {/* 답변 작성 폼 */}
        <form onSubmit={handleSubmitAnswer} className="bg-white border-2 border-black rounded-3xl p-8">
          <textarea
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            className="w-full px-0 py-0 bg-white border-none rounded-lg focus:outline-none resize-none text-on-surface placeholder-gray-300"
            placeholder="솔직하게 적어보세요. 친구들만 봐요."
            rows={8}
            maxLength={300}
            autoFocus
            style={{ fontFamily: 'var(--font-gamja-flower)', fontSize: '18px', lineHeight: '1.6' }}
          />

          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400 font-semibold" style={{ fontFamily: 'var(--font-work-sans)' }}>
                {answerText.length} / 300
              </span>
              <button
                type="submit"
                disabled={!answerText.trim() || submitting}
                className="bg-[#7ef66e] text-gray-800 px-10 py-3 rounded-full font-bold border-2 border-black hover:bg-[#6ee55d] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-all"
                style={{ fontFamily: 'var(--font-gamja-flower)', fontSize: '16px' }}
              >
                {submitting ? '제출중...' : '제출하기'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
