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

interface Answer {
  id: string;
  userId: string;
  nickname: string;
  text: string;
  createdAt: any;
}

interface Reaction {
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

export default function AnswerDetail() {
  const router = useRouter();
  const params = useParams();
  const answerId = params?.id as string;

  const [currentUser, setCurrentUser] = useState<{ userId: string; nickname: string } | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentReplies, setCommentReplies] = useState<Record<string, Reply[]>>({});
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);

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

    // 답변 리액션 구독
    const reactionsQuery = query(
      collection(db, 'answers', answerId, 'reactions'),
      orderBy('createdAt', 'desc')
    );
    const unsubReactions = onSnapshot(reactionsQuery, (snap) => {
      setReactions(snap.docs.map(d => d.data() as Reaction));
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
    return <div className="min-h-screen flex items-center justify-center">로딩중...</div>;
  }

  const groupedReactions = groupEmojis(reactions);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.push('/home')}
          className="mb-6 text-blue-600 hover:text-blue-700 font-medium"
        >
          ← 돌아가기
        </button>

        {/* 답변 카드 */}
        <div className="bg-yellow-50 rounded-lg border-2 border-yellow-400 p-6 shadow-sm mb-6">
          <div className="font-bold text-gray-900 mb-3 text-lg">{answer.nickname}</div>
          <div className="text-gray-800 text-lg mb-4">{answer.text}</div>

          {/* 답변 리액션 */}
          <div className="flex flex-wrap gap-2 items-center">
            {groupedReactions.map(([emoji, nicknames]) => (
              <button
                key={emoji}
                onClick={() => handleAddReaction(emoji)}
                className="inline-flex items-center gap-1 px-3 py-1 bg-white rounded-full border border-gray-300 hover:bg-gray-50 transition-colors"
                title={nicknames.join(', ')}
              >
                <span>{emoji}</span>
                <span className="text-sm text-gray-600">{nicknames.length}</span>
              </button>
            ))}
            <button
              onClick={() => setShowEmojiPicker(showEmojiPicker === 'answer' ? null : 'answer')}
              className="px-3 py-1 bg-white rounded-full border border-gray-300 hover:bg-gray-50 transition-colors text-gray-600"
            >
              +
            </button>
          </div>

          {/* 이모지 피커 (답변) */}
          {showEmojiPicker === 'answer' && (
            <div className="mt-3 p-3 bg-white rounded-lg border border-gray-300 shadow-lg">
              <div className="grid grid-cols-6 gap-2">
                {COMMON_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleAddReaction(emoji)}
                    className="text-2xl p-2 hover:bg-gray-100 rounded transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 댓글 리스트 */}
        <div className="space-y-4 mb-6">
          {comments.map(comment => {
            const replies = commentReplies[comment.id] || [];
            const groupedReplies = groupEmojis(replies);

            return (
              <div key={comment.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="font-medium text-gray-900 mb-2">{comment.nickname}</div>
                <div className="text-gray-700 mb-3">{comment.text}</div>

                {/* 대댓글 (이모지) */}
                <div className="ml-4 border-l-2 border-black pl-3 space-y-2">
                  <div className="flex flex-wrap gap-2 items-center">
                    {groupedReplies.map(([emoji, nicknames]) => (
                      <button
                        key={emoji}
                        onClick={() => handleAddReply(comment.id, emoji)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors text-sm"
                        title={nicknames.join(', ')}
                      >
                        <span>{emoji}</span>
                        <span className="text-xs text-gray-600">{nicknames.length}</span>
                      </button>
                    ))}
                    <button
                      onClick={() =>
                        setShowEmojiPicker(showEmojiPicker === comment.id ? null : comment.id)
                      }
                      className="px-2 py-1 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors text-gray-600 text-sm"
                    >
                      +
                    </button>
                  </div>

                  {/* 이모지 피커 (대댓글) */}
                  {showEmojiPicker === comment.id && (
                    <div className="p-2 bg-white rounded-lg border border-gray-300 shadow-lg">
                      <div className="grid grid-cols-6 gap-1">
                        {COMMON_EMOJIS.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => handleAddReply(comment.id, emoji)}
                            className="text-xl p-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 댓글 입력창 */}
        <form onSubmit={handleAddComment} className="bg-white rounded-lg border border-gray-300 p-4 shadow-sm">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="댓글을 작성하세요..."
            rows={3}
            maxLength={200}
          />
          <div className="flex justify-between items-center mt-3">
            <span className="text-sm text-gray-500">{commentText.length}/200</span>
            <button
              type="submit"
              disabled={!commentText.trim() || submitting}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? '작성중...' : '댓글 작성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
