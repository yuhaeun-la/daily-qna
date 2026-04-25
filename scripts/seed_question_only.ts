import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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

async function seedQuestion() {
  await setDoc(doc(db, 'todayQuestion', 'current'), {
    text: '오늘 행사 와서 가장 충격받은 한 마디는?',
    date: '2026-04-25',
  });
  console.log('✅ 오늘의 질문 추가 완료');
  process.exit(0);
}

seedQuestion().catch((error) => {
  console.error('❌ 실패:', error);
  process.exit(1);
});
