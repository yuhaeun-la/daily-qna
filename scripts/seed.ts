import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, addDoc, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD0hCaRoalN_7JG6y0nfqEnpF2OaoeQCY4",
  authDomain: "daily-bbb4c.firebaseapp.com",
  projectId: "daily-bbb4c",
  storageBucket: "daily-bbb4c.firebasestorage.app",
  messagingSenderId: "803433585221",
  appId: "1:803433585221:web:706b6b7e8e2cedce27a12c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  console.log('🌱 시딩 시작...');

  // 1. 오늘의 질문 추가
  await setDoc(doc(db, 'todayQuestion', 'current'), {
    text: '오늘 행사 와서 가장 충격받은 한 마디는?',
    date: '2026-04-25',
  });
  console.log('✅ 오늘의 질문 추가 완료');

  // 2. 더미 답변 추가
  const dummyAnswers = [
    {
      userId: 'dummy_jihye',
      nickname: '지혜',
      text: '"Flutter 5년 했는데 BuildContext가 헷갈려요" — 발표자가 솔직해서 좋았음',
      reactions: [
        { emoji: '❤️', userIds: ['dummy_minsu', 'dummy_yuna'] },
        { emoji: '😂', userIds: ['dummy_minsu'] },
      ],
      comments: [
        {
          nickname: '민수',
          userId: 'dummy_minsu',
          text: 'ㅋㅋㅋ 나도 그 세션 인상 깊었어',
          replies: [
            { emoji: '🥺', userIds: ['dummy_jihye', 'dummy_yuna'] },
            { emoji: '🔥', userIds: ['dummy_jihye'] },
          ],
        },
      ],
    },
    {
      userId: 'dummy_minsu',
      nickname: '민수',
      text: '"AI가 다 해주는 시대인데 왜 컴포넌트 직접 만들고 있죠?" — 한 대 맞은 기분 ㅋㅋㅋ',
      reactions: [
        { emoji: '🔥', userIds: ['dummy_jihye', 'dummy_yuna'] },
      ],
      comments: [
        {
          nickname: '유나',
          userId: 'dummy_yuna',
          text: '발표자분 이름이 뭐였더라 ㅠ',
          replies: [
            { emoji: '🤔', userIds: ['dummy_jihye'] },
          ],
        },
      ],
    },
    {
      userId: 'dummy_yuna',
      nickname: '유나',
      text: '"오류 메시지 안 읽고 ChatGPT한테 던지는 거 멈춰야 합니다" — 양심 찔림…',
      reactions: [
        { emoji: '💯', userIds: ['dummy_jihye', 'dummy_minsu'] },
        { emoji: '😭', userIds: ['dummy_jihye'] },
      ],
      comments: [],
    },
  ];

  for (const answerData of dummyAnswers) {
    const answerRef = await addDoc(collection(db, 'answers'), {
      userId: answerData.userId,
      nickname: answerData.nickname,
      text: answerData.text,
      createdAt: Timestamp.now(),
    });
    console.log(`✅ 답변 추가: ${answerData.nickname}`);

    // 리액션 추가
    for (const reaction of answerData.reactions) {
      for (const userId of reaction.userIds) {
        const nickname = userId === 'dummy_jihye' ? '지혜' : userId === 'dummy_minsu' ? '민수' : '유나';
        await setDoc(doc(db, 'answers', answerRef.id, 'reactions', userId), {
          emoji: reaction.emoji,
          nickname,
          createdAt: Timestamp.now(),
        });
      }
    }

    // 댓글 추가
    for (const commentData of answerData.comments) {
      const commentRef = await addDoc(collection(db, 'answers', answerRef.id, 'comments'), {
        userId: commentData.userId,
        nickname: commentData.nickname,
        text: commentData.text,
        createdAt: Timestamp.now(),
      });
      console.log(`  ✅ 댓글 추가: ${commentData.nickname}`);

      // 대댓글 추가
      for (const reply of commentData.replies) {
        for (const userId of reply.userIds) {
          const nickname = userId === 'dummy_jihye' ? '지혜' : userId === 'dummy_minsu' ? '민수' : '유나';
          await setDoc(doc(db, 'answers', answerRef.id, 'comments', commentRef.id, 'replies', userId), {
            emoji: reply.emoji,
            nickname,
            createdAt: Timestamp.now(),
          });
        }
      }
    }
  }

  console.log('🎉 시딩 완료!');
  process.exit(0);
}

seed().catch((error) => {
  console.error('❌ 시딩 실패:', error);
  process.exit(1);
});
