'use client';

import { db } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export function getOrCreateUser() {
  if (typeof window === 'undefined') return null;

  let userId = localStorage.getItem('userId');
  let nickname = localStorage.getItem('nickname');

  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem('userId', userId);
  }

  return { userId, nickname };
}

/**
 * 닉네임 설정 및 Firestore에 저장
 * @returns true if success, false if nickname already taken
 */
export async function setNickname(userId: string, nickname: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    // 닉네임을 document ID로 사용하여 중복 체크
    const nicknameDoc = await getDoc(doc(db, 'users', nickname));

    if (nicknameDoc.exists()) {
      // 이미 같은 닉네임이 존재하는데, 다른 userId라면 중복
      if (nicknameDoc.data().userId !== userId) {
        return false; // 중복된 닉네임
      }
    }

    // Firestore에 사용자 정보 저장 (닉네임을 document ID로 사용)
    await setDoc(doc(db, 'users', nickname), {
      userId,
      nickname,
      createdAt: serverTimestamp(),
    });

    // localStorage에도 저장
    localStorage.setItem('nickname', nickname);
    return true;
  } catch (error) {
    console.error('닉네임 저장 실패:', error);
    return false;
  }
}
