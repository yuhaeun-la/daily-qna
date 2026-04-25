'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getOrCreateUser } from '@/lib/user';
import { toggleEmoji, groupEmojis, COMMON_EMOJIS } from '@/lib/emoji';
import Image from 'next/image';

interface Answer {
  id: string;
  userId: string;
  nickname: string;
  text: string;
  createdAt: any;
}

interface Reaction {
  userId: string;
  emoji: string;
  nickname: string;
}

interface Comment {
  id: string;
  userId: string;
  nickname: string;
  text: string;
  createdAt: any;
}

interface Reply {
  emoji: string;
  nickname: string;
}

// Predefined reactions with labels
const REACTIONS = [
  { emoji: '💡', label: '완전 유레카!', color: 'bg-[#7ef66e]' },
  { emoji: '🙌', label: '오늘 당장 실천!', color: 'bg-white' },
  { emoji: '❤️', label: '내 마음속에 저장', color: 'bg-white' },
];

export default function AnswerDetail() {
  const router = useRouter();
  const params = useParams();
  const answerId = params?.id as string;

  const [currentUser, setCurrentUser] = useState<{ userId: string; nickname: string } | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [question, setQuestion] = useState<string>('');
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentReplies, setCommentReplies] = useState<Record<string, Reply[]>>({});
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);

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

    if (!answerId) return;

    // 답변 가져오기
    const fetchAnswer = async () => {
      const answerDoc = await getDoc(doc(db, 'answers', answerId));
      if (answerDoc.exists()) {
        setAnswer({ id: answerDoc.id, ...answerDoc.data() } as Answer);
      }
    };
    fetchAnswer();

    // 오늘의 질문 가져오기
    const fetchQuestion = async () => {
      const questionDoc = await getDoc(doc(db, 'todayQuestion', 'current'));
      if (questionDoc.exists()) {
        setQuestion(questionDoc.data().text);
      }
    };
    fetchQuestion();

    // 답변 리액션 구독
    const reactionsQuery = query(
      collection(db, 'answers', answerId, 'reactions'),
      orderBy('createdAt', 'desc')
    );
    const unsubReactions = onSnapshot(reactionsQuery, (snap) => {
      setReactions(snap.docs.map(d => ({
        userId: d.id,
        ...d.data()
      } as Reaction)));
    });

    // 댓글 구독
    const commentsQuery = query(
      collection(db, 'answers', answerId, 'comments'),
      orderBy('createdAt', 'asc')
    );
    const unsubComments = onSnapshot(commentsQuery, (snap) => {
      const commentsList = snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment));
      setComments(commentsList);

      // 각 댓글의 대댓글 구독
      commentsList.forEach(comment => {
        const repliesQuery = query(
          collection(db, 'answers', answerId, 'comments', comment.id, 'replies'),
          orderBy('createdAt', 'asc')
        );
        onSnapshot(repliesQuery, (repliesSnap) => {
          setCommentReplies(prev => ({
            ...prev,
            [comment.id]: repliesSnap.docs.map(d => d.data() as Reply),
          }));
        });
      });
    });

    return () => {
      unsubReactions();
      unsubComments();
    };
  }, [router, answerId]);

  const handleAddReaction = async (emoji: string) => {
    if (!currentUser || !answerId) return;
    await toggleEmoji(`answers/${answerId}/reactions`, currentUser.userId, emoji, currentUser.nickname);
    setShowEmojiPicker(null);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !currentUser || !answerId) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'answers', answerId, 'comments'), {
        userId: currentUser.userId,
        nickname: currentUser.nickname,
        text: commentText.trim(),
        createdAt: serverTimestamp(),
      });
      setCommentText('');
    } catch (error) {
      console.error('댓글 작성 실패:', error);
      alert('댓글 작성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddReply = async (commentId: string, emoji: string) => {
    if (!currentUser || !answerId) return;
    await toggleEmoji(
      `answers/${answerId}/comments/${commentId}/replies`,
      currentUser.userId,
      emoji,
      currentUser.nickname
    );
    setShowEmojiPicker(null);
  };

  if (!currentUser || !answer) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f9fbed]" style={{ fontFamily: 'var(--font-work-sans)' }}>로딩중...</div>;
  }

  const groupedReactions = groupEmojis(reactions);
  const characterColor = getCharacterColor(answer.userId);

  return (
    <div className="min-h-screen bg-[#f9fbed] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => router.push('/home')}
          className="mb-6 text-gray-600 hover:text-gray-800 cursor-pointer"
          style={{ fontFamily: 'var(--font-work-sans)' }}
        >
          ← 돌아가기
        </button>

        {/* 질문 */}
        <div className="mb-6 bg-white border-2 border-black rounded-3xl p-8 relative">
          <div className="absolute -top-3 left-6 bg-[#7ef66e] border-2 border-black rounded-full px-4 py-1">
            <span className="text-sm font-bold" style={{ fontFamily: 'var(--font-work-sans)' }}>오늘의 질문!</span>
          </div>
          <h1 className="text-2xl text-on-surface mt-2" style={{ fontFamily: 'var(--font-gamja-flower)', lineHeight: '1.4' }}>
            {question || '로딩중...'}
          </h1>
        </div>

        {/* 답변 카드 */}
        <div className="bg-white rounded-3xl border-2 border-black p-8 mb-6">
          {/* 작성자 정보 */}
          <div className="flex items-center gap-3 mb-4">
            <Image
              src={`/characters/${characterColor}.png`}
              alt={answer.nickname}
              width={50}
              height={50}
              className="object-contain"
            />
            <div className="font-bold text-on-surface text-lg" style={{ fontFamily: 'var(--font-work-sans)' }}>
              {answer.nickname}
            </div>
          </div>

          {/* 답변 텍스트 */}
          <div className="text-on-surface border-l-4 border-[#7ef66e] pl-4 mb-6" style={{ fontFamily: 'var(--font-gamja-flower)', fontSize: '16px', lineHeight: '1.6' }}>
            {answer.text}
          </div>

          {/* 답변 리액션 - 상단에 작은 텍스트 */}
          <div className="text-xs text-gray-500 mb-3" style={{ fontFamily: 'var(--font-work-sans)' }}>
            이 답변에 반응 전하기
          </div>

          {/* 답변 리액션 버튼들 */}
          <div className="flex flex-wrap gap-3 items-center">
            {REACTIONS.map(({ emoji, label, color }) => {
              const count = reactions.filter(r => r.emoji === emoji).length;
              const hasReacted = reactions.some(r => r.emoji === emoji && r.userId === currentUser.userId);

              return (
                <button
                  key={emoji}
                  onClick={() => handleAddReaction(emoji)}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 ${
                    hasReacted ? color : 'bg-white'
                  } rounded-full border-2 border-black hover:shadow-md transition-all`}
                >
                  <span className="text-lg">{emoji}</span>
                  <span className="text-sm font-bold text-on-surface" style={{ fontFamily: 'var(--font-work-sans)' }}>
                    {label}
                  </span>
                  {count > 0 && (
                    <span className="text-sm font-bold text-gray-600" style={{ fontFamily: 'var(--font-work-sans)' }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}

            {/* + 버튼 */}
            <button
              onClick={() => setShowEmojiPicker(showEmojiPicker === 'answer' ? null : 'answer')}
              className="w-10 h-10 bg-white rounded-full border-2 border-black hover:shadow-md transition-all flex items-center justify-center text-2xl text-gray-600"
            >
              +
            </button>
          </div>

          {/* 이모지 피커 (답변) */}
          {showEmojiPicker === 'answer' && (
            <div className="mt-4 p-4 bg-gray-50 rounded-2xl border-2 border-gray-200">
              <div className="grid grid-cols-6 gap-2">
                {COMMON_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleAddReaction(emoji)}
                    className="text-3xl p-2 hover:bg-white rounded-lg transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
