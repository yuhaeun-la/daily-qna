import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc } from 'firebase/firestore';

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

async function resetUsers() {
  console.log('🗑️  Users 컬렉션 삭제 시작...\n');

  const usersSnapshot = await getDocs(collection(db, 'users'));

  console.log(`삭제할 사용자: ${usersSnapshot.size}명\n`);

  for (const userDoc of usersSnapshot.docs) {
    await deleteDoc(userDoc.ref);
    console.log(`  ✓ ${userDoc.id} 삭제 완료`);
  }

  console.log('\n✅ Users 컬렉션 삭제 완료!');
  process.exit(0);
}

resetUsers().catch((error) => {
  console.error('❌ 실패:', error);
  process.exit(1);
});
