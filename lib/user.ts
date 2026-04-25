'use client';

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

export function setNickname(nickname: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('nickname', nickname);
}
