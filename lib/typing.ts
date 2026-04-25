import { db } from './firebase';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

let typingTimeout: NodeJS.Timeout | null = null;

/**
 * 타이핑 상태 업데이트
 * 3초 동안 입력 없으면 자동으로 삭제
 */
export function updateTypingStatus(userId: string, nickname: string, isTyping: boolean) {
  if (typingTimeout) {
    clearTimeout(typingTimeout);
  }

  if (isTyping) {
    // 타이핑 중 표시
    setDoc(doc(db, 'typing', userId), {
      nickname,
      updatedAt: serverTimestamp(),
    });

    // 3초 후 자동 삭제
    typingTimeout = setTimeout(() => {
      deleteDoc(doc(db, 'typing', userId)).catch(() => {});
    }, 3000);
  } else {
    // 타이핑 중지 (즉시 삭제)
    deleteDoc(doc(db, 'typing', userId)).catch(() => {});
  }
}

/**
 * 타이핑 상태 정리 (컴포넌트 언마운트 시)
 */
export function clearTypingStatus(userId: string) {
  if (typingTimeout) {
    clearTimeout(typingTimeout);
  }
  deleteDoc(doc(db, 'typing', userId)).catch(() => {});
}
