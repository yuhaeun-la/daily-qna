import { db } from './firebase';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

/**
 * 이모지 토글 공용 함수 (답변 리액션 + 대댓글)
 * 같은 이모지 다시 누르면 취소, 다른 이모지면 덮어쓰기
 */
export async function toggleEmoji(
  collectionPath: string,
  userId: string,
  emoji: string,
  nickname: string
) {
  const ref = doc(db, collectionPath, userId);
  const snap = await getDoc(ref);

  if (snap.exists() && snap.data().emoji === emoji) {
    // 같은 이모지 다시 누름 → 취소
    await deleteDoc(ref);
  } else {
    // 새로 등록 또는 덮어쓰기
    await setDoc(ref, {
      emoji,
      nickname,
      createdAt: serverTimestamp(),
    });
  }
}

/**
 * 이모지 그룹화 (표시용)
 * @returns [['❤️', ['지혜', '민수']], ['😂', ['유나']]]
 */
export function groupEmojis(items: { emoji: string; nickname: string }[]) {
  const grouped: Record<string, string[]> = {};

  items.forEach((item) => {
    if (!grouped[item.emoji]) {
      grouped[item.emoji] = [];
    }
    grouped[item.emoji].push(item.nickname);
  });

  return Object.entries(grouped);
}

/**
 * 자주 쓰는 이모지 12개
 */
export const COMMON_EMOJIS = [
  '❤️', '😂', '🔥', '🥺', '👍', '💯',
  '🙏', '✨', '😮', '😭', '🤔', '🎉'
];
