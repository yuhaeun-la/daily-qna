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
    return <div className="min-h-screen flex items-center justify-center bg-surface" style={{ fontFamily: 'var(--font-work-sans)' }}>로딩중...</div>;
  }

  const groupedReactions = groupEmojis(reactions);

  return (
    <div className="min-h-screen bg-surface py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.push('/home')}
          className="mb-6 text-primary font-bold hover:underline"
          style={{ fontFamily: 'var(--font-work-sans)' }}
        >
          ← 돌아가기
        </button>

        {/* 답변 카드 */}
        <div className="bg-primary-container rounded-xl border-2 border-secondary p-6 mb-6 shadow-[4px_4px_0px_0px_rgba(93,95,87,1)]">
          <div className="font-bold text-on-primary-container mb-3 text-lg" style={{ fontFamily: 'var(--font-work-sans)' }}>{answer.nickname}</div>
          <div className="text-on-primary-container text-lg mb-4" style={{ fontFamily: 'var(--font-work-sans)' }}>{answer.text}</div>

          {/* 답변 리액션 */}
          <div className="flex flex-wrap gap-2 items-center">
            {groupedReactions.map(([emoji, nicknames]) => (
              <button
                key={emoji}
                onClick={() => handleAddReaction(emoji)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white rounded-full border-2 border-secondary hover:translate-x-[1px] hover:translate-y-[1px] transition-all shadow-[2px_2px_0px_0px_rgba(93,95,87,1)] hover:shadow-[1px_1px_0px_0px_rgba(93,95,87,1)]"
                title={nicknames.join(', ')}
              >
                <span className="text-lg">{emoji}</span>
                <span className="text-sm font-semibold text-on-surface" style={{ fontFamily: 'var(--font-work-sans)' }}>{nicknames.length}</span>
              </button>
            ))}
            <button
              onClick={() => setShowEmojiPicker(showEmojiPicker === 'answer' ? null : 'answer')}
              className="px-3 py-1.5 bg-white rounded-full border-2 border-secondary hover:translate-x-[1px] hover:translate-y-[1px] transition-all text-on-surface font-bold shadow-[2px_2px_0px_0px_rgba(93,95,87,1)] hover:shadow-[1px_1px_0px_0px_rgba(93,95,87,1)]"
              style={{ fontFamily: 'var(--font-work-sans)' }}
            >
              +
            </button>
          </div>

          {/* 이모지 피커 (답변) */}
          {showEmojiPicker === 'answer' && (
            <div className="mt-4 p-4 bg-white rounded-lg border-2 border-secondary shadow-[3px_3px_0px_0px_rgba(93,95,87,1)]">
              <div className="grid grid-cols-6 gap-2">
                {COMMON_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleAddReaction(emoji)}
                    className="text-3xl p-2 hover:bg-surface-container rounded-lg transition-colors"
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
              <div key={comment.id} className="bg-white rounded-lg border-2 border-secondary p-5 shadow-[3px_3px_0px_0px_rgba(93,95,87,1)]">
                <div className="font-bold text-on-surface mb-2" style={{ fontFamily: 'var(--font-work-sans)' }}>{comment.nickname}</div>
                <div className="text-on-surface mb-3" style={{ fontFamily: 'var(--font-work-sans)' }}>{comment.text}</div>

                {/* 대댓글 (이모지) */}
                <div className="ml-4 border-l-2 border-secondary pl-4 space-y-2">
                  <div className="flex flex-wrap gap-2 items-center">
                    {groupedReplies.map(([emoji, nicknames]) => (
                      <button
                        key={emoji}
                        onClick={() => handleAddReply(comment.id, emoji)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-surface-container rounded-full hover:bg-surface-container-high transition-colors text-sm border border-outline-variant"
                        title={nicknames.join(', ')}
                      >
                        <span className="text-base">{emoji}</span>
                        <span className="text-xs font-semibold text-on-surface-variant" style={{ fontFamily: 'var(--font-work-sans)' }}>{nicknames.length}</span>
                      </button>
                    ))}
                    <button
                      onClick={() =>
                        setShowEmojiPicker(showEmojiPicker === comment.id ? null : comment.id)
                      }
                      className="px-2 py-1 bg-surface-container rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant text-sm font-bold border border-outline-variant"
                      style={{ fontFamily: 'var(--font-work-sans)' }}
                    >
                      +
                    </button>
                  </div>

                  {/* 이모지 피커 (대댓글) */}
                  {showEmojiPicker === comment.id && (
                    <div className="p-3 bg-white rounded-lg border-2 border-secondary shadow-[2px_2px_0px_0px_rgba(93,95,87,1)]">
                      <div className="grid grid-cols-6 gap-1">
                        {COMMON_EMOJIS.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => handleAddReply(comment.id, emoji)}
                            className="text-2xl p-1 hover:bg-surface-container rounded transition-colors"
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
        <form onSubmit={handleAddComment} className="bg-white rounded-lg border-2 border-secondary p-5 shadow-[3px_3px_0px_0px_rgba(93,95,87,1)]">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="w-full px-3 py-2 border-2 border-outline-variant rounded-lg focus:outline-none focus:border-primary resize-none text-on-surface"
            placeholder="댓글을 작성하세요..."
            rows={3}
            maxLength={200}
            style={{ fontFamily: 'var(--font-work-sans)' }}
          />
          <div className="flex justify-between items-center mt-3">
            <span className="text-sm text-on-surface-variant font-semibold" style={{ fontFamily: 'var(--font-work-sans)' }}>{commentText.length}/200</span>
            <button
              type="submit"
              disabled={!commentText.trim() || submitting}
              className="bg-primary text-on-primary px-6 py-2 rounded-full font-bold border-2 border-secondary hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:bg-surface-dim disabled:text-on-surface-variant disabled:cursor-not-allowed transition-all shadow-[2px_2px_0px_0px_rgba(93,95,87,1)]"
              style={{ fontFamily: 'var(--font-work-sans)' }}
            >
              {submitting ? '작성중...' : '댓글 작성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
